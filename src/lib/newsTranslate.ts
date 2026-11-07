/**
 * Hebrew rewrite of news articles: Gemini first, Cloudflare Workers AI as the
 * fallback, and a failure reason per provider for every miss so the news job
 * can report what went wrong instead of logging the run as ok.
 *
 *  - Gemini is asked for JSON with a response schema; replies with chatter
 *    around the JSON are still accepted (parseHebrewJson).
 *  - Workers AI writes the article only when Gemini cannot answer at all (quota used
 *    up, or not set up). A busy Gemini gets one more try after 5s; a slow or still-busy
 *    one leaves the article for the next run (06:00, 11:30, 17:30 UTC). Both failure
 *    reasons are kept in `failures`.
 *  - Circuit breaker: after the first Gemini http_429 in a run, Gemini is skipped
 *    for the rest of that run (RunState.geminiSkipped) and Workers AI is used
 *    directly, so one exhausted quota does not cost a doomed call per article.
 *  - An article neither provider can rewrite is saved without Hebrew and
 *    counted as untranslated; the next run retries it.
 *
 * Kept free of framework imports (no '@/…', no Cloudflare context): the Workers
 * AI `run` function is passed in, so every path can be unit-tested with mocks.
 * See tests/newsTranslate.test.mjs.
 */

export interface HebrewArticle { titleHe: string; bodyHe: string }

export type Provider = 'gemini' | 'workers_ai';

/** missing_key | missing_binding | http_<status> | timeout | network_error | error | empty | bad_json | skipped_after_429 | skipped_after_timeouts */
export type FailureReason = string;

export type ProviderResult =
  | { ok: true; article: HebrewArticle }
  | { ok: false; reason: FailureReason; message?: string };

export type TranslateOutcome =
  | { ok: true; article: HebrewArticle; provider: Provider; failures: Partial<Record<Provider, FailureReason>>; messages: Partial<Record<Provider, string>> }
  | { ok: false; failures: Partial<Record<Provider, FailureReason>>; messages: Partial<Record<Provider, string>> };

export const GEMINI_MODEL = 'gemini-3.6-flash';

/**
 * Workers AI fallback model (the one the rest of the site already uses).
 * Other Workers AI models that may write better Hebrew, worth trying if the
 * fallback output reads poorly:
 *   '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
 *   '@cf/mistralai/mistral-small-3.1-24b-instruct'
 *   '@cf/google/gemma-3-12b-it'
 *   '@cf/qwen/qwen3-30b-a3b-fp8'
 */
export const WORKERS_AI_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

/** A rewrite shorter than this is a stub, not an article. */
export const MIN_BODY_CHARS = 300;
const HEBREW_LETTER = /[\u05D0-\u05EA]/;
/**
 * A lowercase English word inside a Hebrew sentence ("י arrive עם") or glued to Hebrew letters
 * ("הטruck", "פorsche") means the
 * model lost the language mid-sentence. Brand and model names are capitalised or follow a
 * hyphen ("ה-e-tron"), so they don't match.
 */
const MIXED_SCRIPT = /[\u05D0-\u05EA] ?[a-z]{2,} ?[\u05D0-\u05EA]|[\u05D0-\u05EA][a-z]{2,}|[a-z]{2,}[\u05D0-\u05EA]/;

/** Signature of env.AI.run from the Workers AI binding. */
export type AiRun = (model: string, input: unknown) => Promise<unknown>;

/**
 * Parses the model's JSON reply. Returns null (never throws) when it is not usable.
 * Forgiving about the wrapping: strips code fences and, when the reply has text
 * before or after the JSON ("Paragraph 2:", "*Expanding slightly…*"), takes the
 * span from the first "{" to the last "}". Strict about the content: both fields
 * must be strings, the body at least MIN_BODY_CHARS long and both in Hebrew.
 */
export function parseHebrewJson(raw: string): HebrewArticle | null {
  if (typeof raw !== 'string') return null;
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed: { title?: unknown; body?: unknown } | null = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    cleaned = cleaned.slice(start, end + 1);
    try { parsed = JSON.parse(cleaned); } catch { return null; }
  }
  if (typeof parsed?.title !== 'string' || typeof parsed?.body !== 'string') return null;
  const titleHe = parsed.title.trim();
  const bodyHe = parsed.body.trim();
  if (!titleHe || bodyHe.length < MIN_BODY_CHARS) return null;
  if (!HEBREW_LETTER.test(titleHe) || !HEBREW_LETTER.test(bodyHe)) return null;
  if (MIXED_SCRIPT.test(titleHe) || MIXED_SCRIPT.test(bodyHe)) return null;
  return { titleHe, bodyHe };
}

/**
 * Makes provider text safe to store in cron_runs: accepts any value, masks the
 * API key and any key=/token= query values, drops control characters, collapses
 * whitespace and clips to 200 characters.
 */
export function sanitizeDiagnostic(value: unknown, apiKey?: string): string {
  let s: string;
  if (typeof value === 'string') s = value;
  else if (value == null) s = '';
  else {
    try { s = JSON.stringify(value) ?? String(value); } catch { s = String(value); }
  }
  if (apiKey) s = s.split(apiKey).join('***');
  s = s.replace(/([?&](?:key|api_key|apikey|access_token|token)=)[^&\s"']+/gi, '$1***');
  s = s.replace(/[\u0000-\u001f\u007f]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/** JSON output with a schema, room for ~350 Hebrew words, and no thinking tokens eating the budget. */
export function geminiGenerationConfig(model: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: { title: { type: 'STRING' }, body: { type: 'STRING' } },
      required: ['title', 'body'],
    },
  };
  // 2.5 models take a token budget (0 = off); Gemini 3 Flash models take a level instead.
  if (/^gemini-2\.5-(flash|flash-lite)/.test(model)) config.thinkingConfig = { thinkingBudget: 0 };
  else if (/^gemini-3.*flash/.test(model)) config.thinkingConfig = { thinkingLevel: 'minimal' };
  return config;
}

export async function callGemini(
  prompt: string,
  opts: { apiKey: string | undefined; fetchImpl?: typeof fetch; timeoutMs?: number; model?: string },
): Promise<ProviderResult> {
  const { apiKey, fetchImpl = fetch, timeoutMs = 30000, model = GEMINI_MODEL } = opts;
  if (!apiKey) return { ok: false, reason: 'missing_key' };
  let res: Response;
  try {
    res = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: geminiGenerationConfig(model),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network_error', message: sanitizeDiagnostic(err instanceof Error ? err.message : err, apiKey) };
  }
  if (!res.ok) {
    // Keep the provider's own error text (e.g. "model not found", "quota exceeded") for diagnosis.
    const text: unknown = await res.text().catch(() => '');
    let message: unknown = text;
    if (typeof text === 'string') {
      try {
        const m: unknown = (JSON.parse(text) as { error?: { message?: unknown } })?.error?.message;
        if (typeof m === 'string' && m.trim()) message = m;
      } catch { /* not JSON */ }
    }
    return { ok: false, reason: `http_${res.status}`, message: sanitizeDiagnostic(message, apiKey) };
  }
  let raw: unknown;
  try {
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] };
    raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch {
    return { ok: false, reason: 'bad_json', message: 'response body is not JSON' };
  }
  if (raw != null && typeof raw !== 'string') return { ok: false, reason: 'bad_json', message: 'candidate text is not a string' };
  if (!raw || !raw.trim()) return { ok: false, reason: 'empty' };
  const article = parseHebrewJson(raw);
  return article ? { ok: true, article } : { ok: false, reason: 'bad_json', message: sanitizeDiagnostic(raw, apiKey) };
}

/**
 * Workers AI call with the same prompt. `run` is env.AI.run (bound), or
 * undefined when the binding is missing (e.g. `next dev` without remote AI).
 */
export async function callWorkersAi(
  prompt: string,
  opts: { run: AiRun | undefined; model?: string },
): Promise<ProviderResult> {
  const { run, model = WORKERS_AI_MODEL } = opts;
  if (!run) return { ok: false, reason: 'missing_binding' };
  let result: unknown;
  try {
    result = await run(model, {
      messages: [
        { role: 'system', content: 'Return only a JSON object' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });
  } catch (err) {
    return { ok: false, reason: 'error', message: sanitizeDiagnostic(err instanceof Error ? err.message : err) };
  }
  // Same reply shapes as src/lib/workersAi.ts: `response` (string or already-parsed
  // object) or OpenAI-style choices[0].message.content.
  const r = result as { response?: unknown; choices?: { message?: { content?: unknown } }[] } | null;
  let raw: unknown = r?.response;
  if (raw != null && typeof raw !== 'string') raw = JSON.stringify(raw);
  if (raw == null || (typeof raw === 'string' && !raw.trim())) raw = r?.choices?.[0]?.message?.content;
  if (raw != null && typeof raw !== 'string') return { ok: false, reason: 'bad_json', message: 'reply text is not a string' };
  if (!raw || !raw.trim()) return { ok: false, reason: 'empty' };
  const article = parseHebrewJson(raw);
  return article ? { ok: true, article } : { ok: false, reason: 'bad_json', message: sanitizeDiagnostic(raw) };
}

/** Per-run state shared by every translateHebrew call in one cron run. */
export interface RunState {
  /** Set after the first Gemini http_429 (or GEMINI_TIMEOUT_LIMIT timeouts): Gemini is skipped for the rest of the run. */
  geminiSkipped: boolean;
  /** Gemini timeouts so far in this run; GEMINI_TIMEOUT_LIMIT of them also trip the breaker. */
  geminiTimeouts: number;
  /** Why the breaker tripped, used as the Gemini failure reason for skipped calls. */
  geminiSkipReason?: 'skipped_after_429' | 'skipped_after_timeouts';
}

/** After this many Gemini timeouts in one run, the rest of the run uses Workers AI (keeps the job inside its time limit). */
export const GEMINI_TIMEOUT_LIMIT = 3;

export function newRunState(): RunState {
  return { geminiSkipped: false, geminiTimeouts: 0 };
}

/**
 * Gemini first; on any Gemini failure, Workers AI (when a fallback is given).
 * Both failure reasons are recorded. With a RunState, the first Gemini 429
 * trips the breaker and later calls go straight to Workers AI.
 */
/** Gemini cannot answer at all (quota used up, or not set up): only then does Workers AI write the article. */
const GEMINI_UNAVAILABLE = new Set(['http_429', 'missing_key', 'http_401', 'http_403', 'http_404']);
/** Worth one more Gemini try after a short wait: busy (5xx), a dropped connection, or a garbled reply. */
const geminiRetryable = (reason: string) =>
  reason === 'network_error' || reason === 'bad_json' || reason === 'empty' || /^http_5\d\d$/.test(reason);
export const GEMINI_RETRY_DELAY_MS = 5000;

/**
 * Gemini first, and Workers AI only when Gemini really cannot answer (quota used up or not
 * set up). A busy or glitchy Gemini gets one more try after a short wait; if it still fails,
 * or it is just slow (timeout), the article stays untranslated and the next run (three a day)
 * tries Gemini again. With a RunState, the first 429 sends the rest of the run to Workers AI;
 * GEMINI_TIMEOUT_LIMIT timeouts stop Gemini calls for the run without falling back.
 */
export async function translateHebrew(
  gemini: () => Promise<ProviderResult>,
  fallback?: () => Promise<ProviderResult>,
  state?: RunState,
  opts: { retryDelayMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<TranslateOutcome> {
  const { retryDelayMs = GEMINI_RETRY_DELAY_MS, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = opts;
  const failures: Partial<Record<Provider, FailureReason>> = {};
  const messages: Partial<Record<Provider, string>> = {};

  if (state?.geminiSkipped) {
    failures.gemini = state.geminiSkipReason ?? 'skipped_after_429';
    // Slow today, not out of quota: leave it for the next run rather than use the weaker model.
    if (state.geminiSkipReason === 'skipped_after_timeouts') return { ok: false, failures, messages };
  } else {
    let g = await gemini();
    if (!g.ok && geminiRetryable(g.reason)) {
      await sleep(retryDelayMs);
      g = await gemini();
    }
    if (g.ok) return { ok: true, article: g.article, provider: 'gemini', failures, messages };
    failures.gemini = g.reason;
    if (g.message) messages.gemini = g.message;
    if (state && g.reason === 'http_429') { state.geminiSkipped = true; state.geminiSkipReason = 'skipped_after_429'; }
    if (state && g.reason === 'timeout' && ++state.geminiTimeouts >= GEMINI_TIMEOUT_LIMIT && !state.geminiSkipped) {
      state.geminiSkipped = true;
      state.geminiSkipReason = 'skipped_after_timeouts';
    }
    if (!GEMINI_UNAVAILABLE.has(g.reason)) return { ok: false, failures, messages };
  }

  if (!fallback) return { ok: false, failures, messages };
  const w = await fallback();
  if (w.ok) return { ok: true, article: w.article, provider: 'workers_ai', failures, messages };
  failures.workers_ai = w.reason;
  if (w.message) messages.workers_ai = w.message;
  return { ok: false, failures, messages };
}

// ── Per-run counts ───────────────────────────────────────────────────────────

export interface TranslationStats {
  attempted: number;
  translated: number;
  viaGemini: number;
  viaWorkersAi: number;
  untranslated: number;
  /** e.g. { "gemini:http_429": 5, "workers_ai:bad_json": 1 } */
  reasons: Record<string, number>;
  /** First provider error text seen per reason (sanitizeDiagnostic). */
  samples: Record<string, string>;
}

export function newTranslationStats(): TranslationStats {
  return { attempted: 0, translated: 0, viaGemini: 0, viaWorkersAi: 0, untranslated: 0, reasons: {}, samples: {} };
}

export function recordOutcome(stats: TranslationStats, outcome: TranslateOutcome): void {
  stats.attempted++;
  for (const [provider, reason] of Object.entries(outcome.failures)) {
    const key = `${provider}:${reason}`;
    stats.reasons[key] = (stats.reasons[key] ?? 0) + 1;
    const message = outcome.messages[provider as Provider];
    if (message && !(key in stats.samples)) stats.samples[key] = message;
  }
  if (outcome.ok) {
    stats.translated++;
    if (outcome.provider === 'gemini') stats.viaGemini++;
    else if (outcome.provider === 'workers_ai') stats.viaWorkersAi++;
  } else {
    stats.untranslated++;
  }
}

/**
 * Honest run status for refresh-news. A Workers AI translation counts as a
 * success like a Gemini one: a run where only the fallback worked is ok/partial.
 *  - failed:  translations were attempted for new or untranslated articles and none succeeded (by any provider);
 *  - partial: a feed failed, or at least one article is still without Hebrew;
 *  - ok:      otherwise.
 * `counted` covers new articles and retries of untranslated ones. Re-writes of
 * articles that already have Hebrew (short bodies) are reported, not counted.
 */
export function newsRunStatus(feedErrors: number, counted: TranslationStats[]): 'ok' | 'partial' | 'failed' {
  const attempted = counted.reduce((n, s) => n + s.attempted, 0);
  const translated = counted.reduce((n, s) => n + s.translated, 0);
  const untranslated = counted.reduce((n, s) => n + s.untranslated, 0);
  if (attempted > 0 && translated === 0) return 'failed';
  if (feedErrors > 0 || untranslated > 0) return 'partial';
  return 'ok';
}

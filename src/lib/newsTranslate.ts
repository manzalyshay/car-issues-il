/**
 * Hebrew rewrite of news articles with Gemini, and a failure reason for every
 * miss so the news job can report translation failures instead of logging the
 * run as ok. There is deliberately no fallback provider: an article Gemini
 * cannot rewrite is saved without Hebrew and counted as untranslated.
 *
 * Kept free of framework imports (no '@/…', no Cloudflare context) so the
 * failure paths can be unit-tested with a mocked fetch: see tests/newsTranslate.test.mjs.
 */

export interface HebrewArticle { titleHe: string; bodyHe: string }

export type Provider = 'gemini';

/** missing_key | http_<status> | timeout | network_error | empty | bad_json */
export type FailureReason = string;

export type ProviderResult =
  | { ok: true; article: HebrewArticle }
  | { ok: false; reason: FailureReason; message?: string };

export type TranslateOutcome =
  | { ok: true; article: HebrewArticle; provider: Provider; failures: Partial<Record<Provider, FailureReason>>; messages: Partial<Record<Provider, string>> }
  | { ok: false; failures: Partial<Record<Provider, FailureReason>>; messages: Partial<Record<Provider, string>> };

export const GEMINI_MODEL = 'gemini-3.6-flash';

/** Parses the model's JSON reply. Returns null (never throws) when it is not usable. */
export function parseHebrewJson(raw: string): HebrewArticle | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as { title?: unknown; body?: unknown };
    if (typeof parsed?.title !== 'string' || typeof parsed?.body !== 'string') return null;
    const titleHe = parsed.title.trim();
    const bodyHe = parsed.body.trim();
    return titleHe && bodyHe ? { titleHe, bodyHe } : null;
  } catch {
    return null;
  }
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

export async function callGemini(
  prompt: string,
  opts: { apiKey: string | undefined; fetchImpl?: typeof fetch; timeoutMs?: number; model?: string },
): Promise<ProviderResult> {
  const { apiKey, fetchImpl = fetch, timeoutMs = 20000, model = GEMINI_MODEL } = opts;
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
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
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

/** Gemini only, no fallback. Wraps the provider result into an outcome with the failure reason and message. */
export async function translateHebrew(gemini: () => Promise<ProviderResult>): Promise<TranslateOutcome> {
  const g = await gemini();
  if (g.ok) return { ok: true, article: g.article, provider: 'gemini', failures: {}, messages: {} };
  return { ok: false, failures: { gemini: g.reason }, messages: g.message ? { gemini: g.message } : {} };
}

// ── Per-run counts ───────────────────────────────────────────────────────────

export interface TranslationStats {
  attempted: number;
  translated: number;
  viaGemini: number;
  untranslated: number;
  /** e.g. { "gemini:http_404": 5, "gemini:timeout": 1 } */
  reasons: Record<string, number>;
  /** First provider error text seen per reason (sanitizeDiagnostic). */
  samples: Record<string, string>;
}

export function newTranslationStats(): TranslationStats {
  return { attempted: 0, translated: 0, viaGemini: 0, untranslated: 0, reasons: {}, samples: {} };
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
  } else {
    stats.untranslated++;
  }
}

/**
 * Honest run status for refresh-news.
 *  - failed:  translations were attempted for new or untranslated articles and none succeeded;
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

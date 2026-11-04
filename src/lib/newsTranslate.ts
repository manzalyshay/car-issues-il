/**
 * Hebrew rewrite of news articles: Gemini first, the existing Workers AI rewrite
 * as fallback, and a failure reason for every miss so the news job can report
 * translation failures instead of logging the run as ok.
 *
 * Kept free of framework imports (no '@/…', no Cloudflare context) so the
 * failure paths can be unit-tested with a mocked fetch: see tests/newsTranslate.test.mjs.
 */

export interface HebrewArticle { titleHe: string; bodyHe: string }

export type Provider = 'gemini' | 'workers_ai';

/** missing_key | http_<status> | timeout | network_error | empty | bad_json */
export type FailureReason = string;

export type ProviderResult =
  | { ok: true; article: HebrewArticle }
  | { ok: false; reason: FailureReason; message?: string };

export type TranslateOutcome =
  | { ok: true; article: HebrewArticle; provider: Provider; failures: Partial<Record<Provider, FailureReason>> }
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

const clip = (s: string, apiKey?: string) => {
  const safe = apiKey ? s.split(apiKey).join('***') : s;
  return safe.replace(/\s+/g, ' ').slice(0, 200);
};

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
    return { ok: false, reason: 'network_error', message: clip(String(err), apiKey) };
  }
  if (!res.ok) {
    // Keep the provider's own error text (e.g. "model not found", "quota exceeded") for diagnosis.
    const text = await res.text().catch(() => '');
    let message = text;
    try { message = (JSON.parse(text) as { error?: { message?: string } })?.error?.message ?? text; } catch { /* not JSON */ }
    return { ok: false, reason: `http_${res.status}`, message: clip(message, apiKey) };
  }
  let raw = '';
  try {
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch {
    return { ok: false, reason: 'bad_json', message: 'response body is not JSON' };
  }
  if (!raw.trim()) return { ok: false, reason: 'empty' };
  const article = parseHebrewJson(raw);
  return article ? { ok: true, article } : { ok: false, reason: 'bad_json', message: clip(raw) };
}

/** Wraps the existing Workers AI helper, which returns null for any failure. */
export async function callWorkersAi(prompt: string, run: (prompt: string) => Promise<string | null>): Promise<ProviderResult> {
  let raw: string | null;
  try {
    raw = await run(prompt);
  } catch (err) {
    return { ok: false, reason: 'error', message: clip(String(err)) };
  }
  if (!raw || !raw.trim()) return { ok: false, reason: 'empty' };
  const article = parseHebrewJson(raw);
  return article ? { ok: true, article } : { ok: false, reason: 'bad_json', message: clip(raw) };
}

/** Gemini first; the Workers AI rewrite only when Gemini fails and a fallback is supplied. */
export async function translateWithFallback(
  gemini: () => Promise<ProviderResult>,
  workersAi?: () => Promise<ProviderResult>,
): Promise<TranslateOutcome> {
  const failures: Partial<Record<Provider, FailureReason>> = {};
  const messages: Partial<Record<Provider, string>> = {};
  const g = await gemini();
  if (g.ok) return { ok: true, article: g.article, provider: 'gemini', failures };
  failures.gemini = g.reason;
  if (g.message) messages.gemini = g.message;
  if (workersAi) {
    const w = await workersAi();
    if (w.ok) return { ok: true, article: w.article, provider: 'workers_ai', failures };
    failures.workers_ai = w.reason;
    if (w.message) messages.workers_ai = w.message;
  }
  return { ok: false, failures, messages };
}

// ── Per-run counts ───────────────────────────────────────────────────────────

export interface TranslationStats {
  attempted: number;
  translated: number;
  viaGemini: number;
  viaWorkersAi: number;
  untranslated: number;
  /** e.g. { "gemini:http_404": 5, "workers_ai:empty": 5 } */
  reasons: Record<string, number>;
  /** First provider error text seen per reason, clipped and with the key masked. */
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
    const message = outcome.ok ? undefined : outcome.messages[provider as Provider];
    if (message && !(key in stats.samples)) stats.samples[key] = message;
  }
  if (outcome.ok) {
    stats.translated++;
    if (outcome.provider === 'gemini') stats.viaGemini++; else stats.viaWorkersAi++;
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

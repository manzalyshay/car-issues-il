/**
 * Small in-memory cache for translating short English automotive phrases
 * (known-issue titles, etc.) to Hebrew for display on the Hebrew site.
 * Keyed by the English string itself so repeated titles across models/vehicles
 * reuse one translation per Worker isolate lifetime instead of re-calling the
 * model every time.
 */
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

// Common recurring CarComplaints/NHTSA fault titles, translated once and reused -
// a real fallback tier (not a guess) for when both AI translators are unavailable
// (Gemini free-tier quota, or no MISTRAL_API_KEY configured), so known, frequently
// recurring titles still show in Hebrew instead of silently staying in English.
const STATIC_TITLES_HE: Record<string, string> = {
  'Safety Mode': 'מצב בטיחות',
};

const g = globalThis as typeof globalThis & {
  _heTitleCache?: Map<string, string>;
};
function cache(): Map<string, string> {
  if (!g._heTitleCache) {
    g._heTitleCache = new Map(Object.entries(STATIC_TITLES_HE));
  }
  return g._heTitleCache;
}

function buildPrompt(items: string[]): string {
  return `Translate each of the following short car-fault/issue titles from English to concise, natural Hebrew automotive terminology. Return ONLY a JSON array of strings in the same order, no extra text.\n\nInput: ${JSON.stringify(items)}`;
}

async function translateViaGemini(items: string[]): Promise<string[] | null> {
  if (!GEMINI_KEY) return null;
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(items) }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as string[];
  return Array.isArray(parsed) && parsed.length === items.length ? parsed : null;
}

async function translateViaMistral(items: string[]): Promise<string[] | null> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      temperature: 0.1,
      max_tokens: 1200,
      messages: [{ role: 'user', content: buildPrompt(items) }],
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned) as string[];
  return Array.isArray(parsed) && parsed.length === items.length ? parsed : null;
}

/** Translates via Gemini first, falling back to Mistral (e.g. when Gemini's free-tier
 * daily quota is exhausted) - both are existing, already-configured capabilities in
 * this codebase, not a new translation source. */
export async function translateTitlesToHebrew(items: string[]): Promise<string[]> {
  const c = cache();
  const missing = items.filter((it) => it && !c.has(it));
  if (missing.length) {
    let translated: string[] | null = null;
    try { translated = await translateViaGemini(missing); } catch { /* try next */ }
    if (!translated) {
      try { translated = await translateViaMistral(missing); } catch { /* fall through - untranslated items keep their English title below */ }
    }
    if (translated) missing.forEach((orig, i) => c.set(orig, translated![i]));
  }
  return items.map((it) => c.get(it) ?? it);
}

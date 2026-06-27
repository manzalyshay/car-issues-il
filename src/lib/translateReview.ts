/**
 * Hebrew → English review translation.
 * Tries providers in order: Gemini 2.0 Flash → Mistral → null
 * Used for both on-write translation (new reviews) and batch backfill.
 */

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const MISTRAL_KEY  = process.env.MISTRAL_API_KEY;

interface TranslationResult {
  titleEn: string | null;
  bodyEn: string | null;
}

function parseJson(raw: string): { title?: string; body?: string } | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

async function tryGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch { return null; }
}

async function tryMistral(prompt: string): Promise<string | null> {
  if (!MISTRAL_KEY) return null;
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MISTRAL_KEY}` },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0.1,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { choices?: { message?: { content?: string } }[] };
    return json?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

/**
 * Translates a Hebrew car review title and body to English.
 * Tries Gemini first, falls back to Mistral. Returns null fields if all fail.
 */
export async function translateReview(
  title: string,
  body: string,
): Promise<TranslationResult> {
  const prompt = `You are a professional automotive translator. Translate the following Hebrew car review to natural, fluent English. Keep technical terms accurate. Preserve the reviewer's tone (casual, frustrated, enthusiastic, etc.). Do NOT add any commentary or explanation.

Return ONLY a JSON object with this exact structure:
{"title": "<translated title>", "body": "<translated body>"}

Hebrew title: ${title || '(no title)'}
Hebrew body: ${body}`;

  const raw = await tryGemini(prompt) ?? await tryMistral(prompt);
  if (!raw) return { titleEn: null, bodyEn: null };

  const parsed = parseJson(raw);
  return {
    titleEn: parsed?.title?.trim() || null,
    bodyEn:  parsed?.body?.trim()  || null,
  };
}

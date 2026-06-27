/**
 * Hebrew → English review translation via Google Gemini.
 * Used for both on-write translation (new reviews) and batch backfill.
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

interface TranslationResult {
  titleEn: string | null;
  bodyEn: string | null;
}

async function gemini(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Translates a Hebrew car review title and body to English.
 * Returns null fields if translation fails or content is already English.
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

  const raw = await gemini(prompt);
  if (!raw) return { titleEn: null, bodyEn: null };

  try {
    // Strip markdown code fences if Gemini wrapped in ```json
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { title?: string; body?: string };
    return {
      titleEn: parsed.title?.trim() || null,
      bodyEn:  parsed.body?.trim()  || null,
    };
  } catch {
    return { titleEn: null, bodyEn: null };
  }
}

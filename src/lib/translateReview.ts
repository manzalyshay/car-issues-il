/**
 * Hebrew → English review translation using Cloudflare Workers AI
 * (no API key needed — covered by the Workers Paid plan).
 */
import { runWorkersAI } from '@/lib/workersAi';

interface TranslationResult {
  titleEn: string | null;
  bodyEn: string | null;
}

function parseJson(raw: string): { title?: string; body?: string } | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

/**
 * Translates a Hebrew car review title and body to English via Workers AI.
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

  try {
    const raw = await runWorkersAI([{ role: 'user', content: prompt }], { max_tokens: 1200, temperature: 0.2 });
    if (!raw) return { titleEn: null, bodyEn: null };
    const parsed = parseJson(raw);
    return {
      titleEn: parsed?.title?.trim() || null,
      bodyEn:  parsed?.body?.trim()  || null,
    };
  } catch { return { titleEn: null, bodyEn: null }; }
}

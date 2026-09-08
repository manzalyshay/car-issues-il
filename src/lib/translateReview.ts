/**
 * Hebrew → English review translation using Claude.
 */
import Anthropic from '@anthropic-ai/sdk';

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

/**
 * Translates a Hebrew car review title and body to English using Claude.
 */
export async function translateReview(
  title: string,
  body: string,
): Promise<TranslationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { titleEn: null, bodyEn: null };

  const prompt = `You are a professional automotive translator. Translate the following Hebrew car review to natural, fluent English. Keep technical terms accurate. Preserve the reviewer's tone (casual, frustrated, enthusiastic, etc.). Do NOT add any commentary or explanation.

Return ONLY a JSON object with this exact structure:
{"title": "<translated title>", "body": "<translated body>"}

Hebrew title: ${title || '(no title)'}
Hebrew body: ${body}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = msg.content[0];
    const raw = block.type === 'text' ? block.text.trim() : null;
    if (!raw) return { titleEn: null, bodyEn: null };
    const parsed = parseJson(raw);
    return {
      titleEn: parsed?.title?.trim() || null,
      bodyEn:  parsed?.body?.trim()  || null,
    };
  } catch { return { titleEn: null, bodyEn: null }; }
}

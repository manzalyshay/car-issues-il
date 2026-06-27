import { NextRequest, NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

export async function POST(req: NextRequest) {
  const { items } = await req.json() as { items: string[] };
  if (!GEMINI_KEY || !items?.length) return NextResponse.json({ items });

  const prompt = `Translate each of the following Hebrew automotive texts to fluent English. Items may be short phrases or full paragraphs. Return ONLY a JSON array of strings in the same order, no extra text.

Input: ${JSON.stringify(items)}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as string[];
    if (Array.isArray(parsed) && parsed.length === items.length) {
      return NextResponse.json({ items: parsed });
    }
  } catch { /* fall through */ }

  return NextResponse.json({ items });
}

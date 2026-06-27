/**
 * Server-side translation of ExpertReview content from Hebrew to English.
 * Called once per page render (cached via Next.js revalidate).
 */

import type { ExpertReview } from './expertReviews';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

async function batchTranslate(items: string[]): Promise<string[]> {
  if (!GEMINI_KEY || items.length === 0) return items.map(() => '');
  const nonEmpty = items.map((s, i) => ({ i, s })).filter(x => x.s.trim().length > 5);
  if (nonEmpty.length === 0) return items.map(() => '');

  const prompt = `Translate each Hebrew automotive text to fluent English. Return ONLY a JSON array of strings, same order, no extra text.\n\nInput: ${JSON.stringify(nonEmpty.map(x => x.s))}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const json = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as string[];
    if (Array.isArray(parsed) && parsed.length === nonEmpty.length) {
      const result = items.map(() => '');
      nonEmpty.forEach(({ i }, ti) => { result[i] = parsed[ti] ?? ''; });
      return result;
    }
  } catch { /* fall through */ }

  return items.map(() => '');
}

export interface TranslatedReview {
  pros: string[];
  cons: string[];
  localSummary: string | null;
  globalSummary: string | null;
  fallback: string | null;
  sourceSummaries: string[];
}

export async function translateExpertReview(review: ExpertReview): Promise<TranslatedReview> {
  const pros = review.pros ?? [];
  const cons = review.cons ?? [];
  const localRaw = review.localSummaryHe ?? '';
  const globalRaw = review.globalSummaryHe ?? '';
  const fallbackRaw = !localRaw && !globalRaw ? (review.summaryHe ?? '') : '';
  const sourceSummaryRaws = (review.sourcesBreakdown ?? []).map(s => s.summary ?? '');

  // Batch everything in one call
  const batch = [
    ...pros,
    ...cons,
    localRaw,
    globalRaw,
    fallbackRaw,
    ...sourceSummaryRaws,
  ];

  const translated = await batchTranslate(batch);

  let idx = 0;
  const tPros = translated.slice(idx, idx + pros.length); idx += pros.length;
  const tCons = translated.slice(idx, idx + cons.length); idx += cons.length;
  const tLocal   = translated[idx++] || null;
  const tGlobal  = translated[idx++] || null;
  const tFallback = translated[idx++] || null;
  const tSources = translated.slice(idx);

  return {
    pros: tPros,
    cons: tCons,
    localSummary: tLocal,
    globalSummary: tGlobal,
    fallback: tFallback,
    sourceSummaries: tSources,
  };
}

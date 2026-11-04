/**
 * The score shown for a model, computed the same way on every surface:
 * fixed base score (car_models.ai_score), blended with owner reviews (3+),
 * then with the external test average (30%, kept within MAX_TEST_DRIFT of it).
 *
 * The model page, rankings, home and category pages already blend inline via
 * blendWithTestScore; this helper is for the surfaces that used to show the
 * bare base score (social/OG images, the make summary, the compare API).
 */
import { dbAll } from './db';
import { getAllAiScores, blendWithOwnerRating, type AiConfidence } from './aiScore';
import { getAllHeadlineTestAverages } from './proReviewScores';
import { blendWithTestScore } from './proReviewScoreLabels';

export interface DisplayScore {
  score: number;
  confidence: AiConfidence;
  testAvg: number | null;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const g = globalThis as typeof globalThis & { _displayScoresCache?: { data: Map<string, DisplayScore>; ts: number } };

export async function getAllDisplayScores(): Promise<Map<string, DisplayScore>> {
  const now = Date.now();
  if (g._displayScoresCache && now - g._displayScoresCache.ts < CACHE_TTL_MS) return g._displayScoresCache.data;
  const [ai, tests, reviews] = await Promise.all([
    getAllAiScores().catch(() => ({} as Awaited<ReturnType<typeof getAllAiScores>>)),
    getAllHeadlineTestAverages().catch(() => new Map<string, number>()),
    dbAll<{ make_slug: string; model_slug: string; n: number; avg: number | null }>(
      'SELECT make_slug, model_slug, COUNT(*) AS n, AVG(rating) AS avg FROM reviews GROUP BY make_slug, model_slug',
    ).catch(() => []),
  ]);
  const owner = new Map(reviews.map((r) => [`${r.make_slug}/${r.model_slug}`, r]));
  const out = new Map<string, DisplayScore>();
  for (const [key, a] of Object.entries(ai)) {
    const r = owner.get(key);
    const testAvg = tests.get(key) ?? null;
    const withOwners = blendWithOwnerRating(a.score, r?.avg ?? null, r?.n ?? 0);
    out.set(key, { score: blendWithTestScore(withOwners, testAvg), confidence: a.confidence, testAvg });
  }
  g._displayScoresCache = { data: out, ts: now };
  return out;
}

export async function getDisplayScore(makeSlug: string, modelSlug: string): Promise<DisplayScore | null> {
  const all = await getAllDisplayScores();
  return all.get(`${makeSlug}/${modelSlug}`) ?? null;
}

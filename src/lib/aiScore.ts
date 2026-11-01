/**
 * Fixed per-model AI reputation score, read from `car_models.ai_score` / `ai_confidence`.
 * This is the single source of truth for the score shown on model pages, compare pages,
 * and every list that displays it - replaces the old computed `expert_reviews.top_score`.
 */
import { dbAll } from './db';

export type AiConfidence = 'high' | 'medium' | 'low';

export const AI_SCORE_CAPTION_HE = 'הציון מבוסס על המוניטין של הדגם: אמינות, בעיות נפוצות, ריקולים וחוות דעת בעלים';
export const AI_SCORE_CAPTION_EN = "The score reflects the model's reputation: reliability, common issues, recalls and owner reviews";
export const AI_SCORE_ESTIMATED_HE = 'ציון משוער';
export const AI_SCORE_ESTIMATED_EN = 'Estimated score';

export interface AiScore {
  score: number;
  confidence: AiConfidence;
}

type ScoreMap = Record<string, AiScore>;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const g = globalThis as typeof globalThis & {
  _aiScoresCache?: { data: ScoreMap; ts: number };
};

export async function getAllAiScores(): Promise<ScoreMap> {
  const now = Date.now();
  if (g._aiScoresCache && now - g._aiScoresCache.ts < CACHE_TTL_MS) {
    return g._aiScoresCache.data;
  }
  try {
    const rows = await dbAll<{ make_slug: string; slug: string; ai_score: number | null; ai_confidence: string | null }>(
      'SELECT make_slug, slug, ai_score, ai_confidence FROM car_models WHERE ai_score IS NOT NULL',
    );
    const map: ScoreMap = {};
    for (const row of rows) {
      if (row.ai_score == null) continue;
      map[`${row.make_slug}/${row.slug}`] = {
        score: row.ai_score,
        confidence: (row.ai_confidence as AiConfidence) ?? 'medium',
      };
    }
    g._aiScoresCache = { data: map, ts: now };
    return map;
  } catch {
    return {};
  }
}

export async function getAiScore(makeSlug: string, modelSlug: string): Promise<AiScore | null> {
  const map = await getAllAiScores();
  return map[`${makeSlug}/${modelSlug}`] ?? null;
}

/**
 * Blends the fixed AI score with the owner-review average once there are at least
 * 3 reviews. Weight grows with review count: 3->0.1, 4->0.2, 5->0.3, 6+->0.4.
 * Below 3 reviews, the displayed score is the AI score alone.
 * `avgRating` is on the 1-5 owner-review scale; the result is on the 1-10 scale.
 */
export function blendWithOwnerRating(aiScore: number, avgRating: number | null, reviewCount: number): number {
  if (reviewCount < 3 || avgRating == null) return aiScore;
  const w = Math.min(0.4, (reviewCount - 2) * 0.1);
  const ownerOn10 = avgRating * 2;
  return aiScore * (1 - w) + ownerOn10 * w;
}

export function formatOwnerScoreHe(avgRating: number, reviewCount: number): string {
  return `${(avgRating * 2).toFixed(1)} על בסיס ${reviewCount} ${reviewCount === 1 ? 'ביקורת' : 'ביקורות'}`;
}

export function formatOwnerScoreEn(avgRating: number, reviewCount: number): string {
  return `${(avgRating * 2).toFixed(1)} based on ${reviewCount} review${reviewCount === 1 ? '' : 's'}`;
}

/**
 * External test scores (icar, Autocar, Top Gear, ...) stored in D1 `pro_review_scores`,
 * each normalised to a score out of 10.
 */
import { dbAll } from './db';
import type { ProReviewScoreSet } from './proReviewScoreLabels';

export { filterScoreSetsForYear } from './proReviewScoreLabels';

export interface ExternalScoreSource {
  site: string;
  market: string | null;
  original: string | null;
  norm: number | null;
  date: string | null;
  url: string | null;
}

export interface ExternalScoreSet {
  score: number;
  generation: string | null;
  years: string | null;
  sources: ExternalScoreSource[];
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function getExternalScores(makeSlug: string, modelSlug: string, isEn: boolean): Promise<ExternalScoreSet[]> {
  const rows = await dbAll<{
    score: number; generation: string | null; generation_en: string | null; years: string | null; sources: string | null;
  }>(
    `SELECT score, generation, generation_en, years, sources FROM pro_review_scores
     WHERE make_slug = ? AND model_slug = ? AND (hidden IS NULL OR hidden != 1)
     ORDER BY set_index`,
    makeSlug, modelSlug,
  ).catch(() => []);

  return rows.map(r => ({
    score: r.score,
    generation: (isEn ? r.generation_en : r.generation) ?? r.generation,
    years: r.years,
    sources: parseJson<Record<string, unknown>[]>(r.sources, []).map(s => ({
      site: String(s.site ?? ''),
      market: typeof s.market === 'string' ? s.market : null,
      original: typeof s.original === 'string' ? s.original : null,
      norm: typeof s.norm === 'number' ? s.norm : null,
      date: typeof s.date === 'string' ? s.date : null,
      url: typeof s.url === 'string' ? s.url : null,
    })).filter(s => s.site),
  })).filter(r => r.sources.length > 0);
}

/** Full score-set rows (richer schema: sample size, powertrains, caveats, tested/n-a
 * variants, per-source evidence) for the model page and year-scoped pages. */
export async function getProReviewScoreSets(makeSlug: string, modelSlug: string): Promise<ProReviewScoreSet[]> {
  const rows = await dbAll<{
    score_key: string; set_index: number; score: number; n: number;
    generation: string | null; generation_en: string | null; years: string | null;
    powertrains: string | null; powertrains_en: string | null;
    assessment_level: string | null;
    caveats: string | null; caveats_en: string | null;
    tested_variants: string | null; tested_variants_en: string | null;
    not_applicable: string | null; not_applicable_en: string | null;
    sources: string | null;
  }>(
    `SELECT score_key, set_index, score, n, generation, generation_en, years,
            powertrains, powertrains_en, assessment_level, caveats, caveats_en,
            tested_variants, tested_variants_en, not_applicable, not_applicable_en, sources
     FROM pro_review_scores
     WHERE make_slug = ? AND model_slug = ? AND (hidden IS NULL OR hidden != 1)
     ORDER BY set_index`,
    makeSlug, modelSlug,
  ).catch(() => []);

  return rows.map(r => ({
    scoreKey: r.score_key,
    setIndex: r.set_index,
    score: r.score,
    n: r.n,
    generation: r.generation,
    generationEn: r.generation_en,
    years: r.years,
    powertrains: parseJson<string[]>(r.powertrains, []),
    powertrainsEn: parseJson<string[]>(r.powertrains_en, []),
    assessmentLevel: r.assessment_level,
    caveats: parseJson<string[]>(r.caveats, []),
    caveatsEn: parseJson<string[]>(r.caveats_en, []),
    testedVariants: parseJson<string[]>(r.tested_variants, []),
    testedVariantsEn: parseJson<string[]>(r.tested_variants_en, []),
    notApplicable: parseJson<string[]>(r.not_applicable, []),
    notApplicableEn: parseJson<string[]>(r.not_applicable_en, []),
    sources: parseJson<Record<string, unknown>[]>(r.sources, []).map(s => ({
      site: String(s.site ?? ''),
      market: typeof s.market === 'string' ? s.market : null,
      original: String(s.original ?? ''),
      norm: typeof s.norm === 'number' ? s.norm : 0,
      date: typeof s.date === 'string' ? s.date : null,
      url: String(s.url ?? ''),
      author: typeof s.author === 'string' ? s.author : undefined,
      evidence: typeof s.evidence === 'string' ? s.evidence : undefined,
    })).filter(s => s.site),
  })).filter(r => r.sources.length > 0);
}

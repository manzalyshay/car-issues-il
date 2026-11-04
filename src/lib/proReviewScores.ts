/**
 * External test scores (icar, Autocar, Top Gear, ...) stored in D1 `pro_review_scores`,
 * each normalised to a score out of 10.
 */
import { dbAll } from './db';
import type { ProReviewScoreSet } from './proReviewScoreLabels';
import { scoreSetsForPageYear, headlineTestScoreAvg } from './proReviewScoreLabels';

export { filterScoreSetsForYear, scoreSetsForPageYear } from './proReviewScoreLabels';

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

/**
 * Headline test-score average for every model, applying the same rules as the
 * model page: hidden sets excluded, sets restricted to the generation covering
 * the model's newest year (when the model has years), and variant-level sets
 * left out when broader sets exist. Used by list pages (home, rankings,
 * categories) so their scores match the model page.
 */
export async function getAllHeadlineTestAverages(): Promise<Map<string, number>> {
  const [rows, models] = await Promise.all([
    dbAll<{ make_slug: string; model_slug: string; score: number; years: string | null; assessment_level: string | null }>(
      `SELECT make_slug, model_slug, score, years, assessment_level FROM pro_review_scores
       WHERE hidden IS NULL OR hidden != 1 ORDER BY set_index`,
    ).catch(() => []),
    dbAll<{ make_slug: string; slug: string; years: string | null }>(
      'SELECT make_slug, slug, years FROM car_models',
    ).catch(() => []),
  ]);
  const maxYear = new Map<string, number>();
  for (const m of models) {
    const years = parseJson<number[]>(m.years, []);
    if (years.length) maxYear.set(`${m.make_slug}/${m.slug}`, Math.max(...years));
  }
  const byModel = new Map<string, Array<{ score: number; years: string | null; assessmentLevel: string | null }>>();
  for (const r of rows) {
    const key = `${r.make_slug}/${r.model_slug}`;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push({ score: r.score, years: r.years, assessmentLevel: r.assessment_level });
  }
  const out = new Map<string, number>();
  for (const [key, sets] of byModel) {
    const year = maxYear.get(key);
    // Same as the model page: no matching generation means no test blend.
    const relevant = year != null ? scoreSetsForPageYear(sets, year, year) : sets;
    const avg = headlineTestScoreAvg(relevant);
    if (avg != null) out.set(key, avg);
  }
  return out;
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

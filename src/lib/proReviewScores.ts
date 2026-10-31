/**
 * External test scores (icar, Autocar, Top Gear, ...) stored in D1 `pro_review_scores`,
 * each normalised to a score out of 10.
 */
import { dbAll } from './db';

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

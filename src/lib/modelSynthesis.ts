/**
 * Hand-researched sourced strengths/weaknesses for a small number of pilot
 * score sets (model_synthesis table) - opened and paraphrased directly from
 * the source URLs already in pro_review_scores, never invented. Most models
 * have no row here and fall back to the mechanical "evidence-limited" path
 * (coverage facts only, computed from the score set itself) in ModelSynthesis.tsx.
 */
import { dbAll } from './db';

export interface SynthesisPoint {
  text_he: string;
  text_en: string;
  source_site: string;
  source_url: string;
}

export interface SynthesisRow {
  scoreKey: string;
  setIndex: number;
  strengths: SynthesisPoint[];
  weaknesses: SynthesisPoint[];
}

export async function getModelSynthesisRows(makeSlug: string, modelSlug: string): Promise<SynthesisRow[]> {
  try {
    const rows = await dbAll<Record<string, unknown>>(
      `SELECT score_key, set_index, strengths, weaknesses FROM model_synthesis WHERE make_slug = ? AND model_slug = ?`,
      makeSlug, modelSlug,
    );
    return rows.map((r) => ({
      scoreKey: r.score_key as string,
      setIndex: r.set_index as number,
      strengths: JSON.parse((r.strengths as string) ?? '[]'),
      weaknesses: JSON.parse((r.weaknesses as string) ?? '[]'),
    }));
  } catch {
    return [];
  }
}

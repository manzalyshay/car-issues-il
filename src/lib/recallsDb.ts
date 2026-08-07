import { dbAll } from '@/lib/db';

export interface CachedRecall {
  id: string;
  make: string;
  model: string;
  date: string;
  recall_year: number | null;
  manufacturer: string;
  component_en: string | null;
  summary_en: string | null;
  consequence_en: string | null;
  remedy_en: string | null;
  component_he: string | null;
  summary_he: string | null;
  consequence_he: string | null;
  remedy_he: string | null;
}

/** Fetch all cached recalls for a make+model (all years). Returns empty array on error. */
export async function getRecallsFromCache(makeEn: string, modelEn: string): Promise<CachedRecall[]> {
  return dbAll<CachedRecall>(
    'SELECT * FROM recalls_cache WHERE make = ? AND model = ? ORDER BY date DESC',
    makeEn.toLowerCase(),
    modelEn.toLowerCase(),
  ).catch(() => []);
}

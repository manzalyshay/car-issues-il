import { dbAll } from '@/lib/db';
import { dateSortKey } from '@/lib/nhtsaRecalls';

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

/**
 * Fetch all cached US recalls for a make+model (all years), including campaigns
 * shared with other models (via recalls_cache_models). Newest first.
 * Returns an empty array on error.
 */
export async function getRecallsFromCache(makeEn: string, modelEn: string): Promise<CachedRecall[]> {
  const make = makeEn.toLowerCase();
  const model = modelEn.toLowerCase();
  const rows = await dbAll<CachedRecall>(
    `SELECT c.* FROM recalls_cache c
     WHERE c.id IN (SELECT id FROM recalls_cache_models WHERE make = ? AND model = ?)
        OR (c.make = ? AND c.model = ?)`,
    make, model, make, model,
  ).catch(() => [] as CachedRecall[]);
  // Stored dates are DD/MM/YYYY strings - sort on YYYYMMDD, not the raw string.
  return rows.sort((a, b) => dateSortKey(b.date).localeCompare(dateSortKey(a.date)));
}

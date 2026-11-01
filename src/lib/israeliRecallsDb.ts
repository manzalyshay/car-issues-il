import { dbAll } from '@/lib/db';

export interface IsraeliRecall {
  id: string;
  recallId: number | null;
  year: number | null;
  buildBegin: string | null;
  buildEnd: string | null;
  recallType: string | null;
  faultType: string | null;
  faultDescription: string | null;
  fixMethod: string | null;
  importer: string | null;
  phone: string | null;
  website: string | null;
  manufacturer: string;
}

interface RecallIlRow {
  id: string;
  recall_id: number | null;
  make_raw: string;
  degem: string;
  recall_year: number | null;
  build_begin: string | null;
  build_end: string | null;
  recall_type: string | null;
  fault_type: string | null;
  fault_description: string | null;
  fix_method: string | null;
  importer: string | null;
  phone: string | null;
  website: string | null;
}

/** Uppercase, strip diacritics and non-alphanumerics - matches how `make` is stored in recalls_il. */
export function normalizeForMatch(s: string): string {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/** Fetch Israeli recalls for a make+model by exact (normalized) DEGEM segment match. */
export async function getIsraeliRecalls(makeEn: string, modelEn: string): Promise<IsraeliRecall[]> {
  const makeKey = normalizeForMatch(makeEn);
  const modelKey = normalizeForMatch(modelEn);
  if (!makeKey || !modelKey) return [];

  const rows = await dbAll<RecallIlRow>(
    'SELECT * FROM recalls_il WHERE make = ? ORDER BY recall_year DESC',
    makeKey,
  ).catch(() => []);

  const matched = rows.filter((r) =>
    (r.degem || '').split(',').some((seg) => normalizeForMatch(seg) === modelKey),
  );

  return matched.map((r) => ({
    id: r.id,
    recallId: r.recall_id,
    year: r.recall_year,
    buildBegin: r.build_begin,
    buildEnd: r.build_end,
    recallType: r.recall_type,
    faultType: r.fault_type,
    faultDescription: r.fault_description,
    fixMethod: r.fix_method,
    importer: r.importer,
    phone: r.phone,
    website: r.website,
    manufacturer: r.make_raw,
  }));
}

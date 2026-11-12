import { dbAll } from '@/lib/db';
import { MAKE_ALIASES, degemMatches, normalizeForMatch } from './israeliRecallMatch';

export { normalizeForMatch, degemSegmentMatches, degemMatches, buildWindowOverlaps } from './israeliRecallMatch';

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

/**
 * Fetch Israeli recalls for a make+model. Matches DEGEM segments by normalized
 * model name (plus powertrain/chassis suffixes, see degemSegmentMatches) under the
 * make and its known aliases (e.g. Cupra notices filed under SEAT).
 */
export async function getIsraeliRecalls(makeEn: string, modelEn: string): Promise<IsraeliRecall[]> {
  const makeKey = normalizeForMatch(makeEn);
  const modelKey = normalizeForMatch(modelEn);
  if (!makeKey || !modelKey) return [];

  const makeKeys = MAKE_ALIASES[makeKey] ?? [makeKey];
  const rows = await dbAll<RecallIlRow>(
    `SELECT * FROM recalls_il WHERE make IN (${makeKeys.map(() => '?').join(',')}) ORDER BY recall_year DESC, recall_id DESC`,
    ...makeKeys,
  ).catch(() => []);

  const matched = rows.filter((r) => degemMatches(r.degem, modelKey, makeKeys));

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

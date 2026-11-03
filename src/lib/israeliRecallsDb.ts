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

// Manufacturers whose Israeli notices are (also) filed under another make name.
const MAKE_ALIASES: Record<string, string[]> = {
  CUPRA: ['CUPRA', 'SEAT'],
};

// Powertrain / body / chassis-code suffixes that still mean "this model" when they
// follow the model name in a DEGEM segment (e.g. "KUGA PHEV", "AVENGER BEV",
// "NEW RANGE ROVER EVOQUE LZ"). Anything else (e.g. "RANGE ROVER SPORT", "IX3")
// is a different model and is not matched.
const MODEL_SUFFIXES = ['PHEV', 'MHEV', 'HEV', 'BEV', 'EV', 'HYBRID', 'PLUGINHYBRID', 'LZ', 'JZ'];

/**
 * Whether one DEGEM segment names the given model. Segments are split on ',' and
 * '/', normalized, and a leading "NEW" or the brand name itself is ignored.
 * Mercedes-style class names may carry a 3-digit chassis code ("C CLASS 206").
 */
export function degemSegmentMatches(segment: string, modelKey: string, makeKeys: string[]): boolean {
  let seg = normalizeForMatch(segment);
  if (!seg || !modelKey) return false;
  if (seg.startsWith('NEW') && seg !== modelKey) seg = seg.slice(3);
  for (const mk of makeKeys) if (seg.startsWith(mk) && seg.length > mk.length && seg !== modelKey) seg = seg.slice(mk.length);
  if (seg === modelKey) return true;
  if (!seg.startsWith(modelKey)) return false;
  const rest = seg.slice(modelKey.length);
  if (MODEL_SUFFIXES.includes(rest)) return true;
  if (modelKey.endsWith('CLASS') && /^\d{3}$/.test(rest)) return true;
  return false;
}

export function degemMatches(degem: string | null, modelKey: string, makeKeys: string[]): boolean {
  return (degem || '').split(/[,/]/).some((seg) => degemSegmentMatches(seg, modelKey, makeKeys));
}

/** Whether a notice's production window overlaps [fromYear, toYear] (inclusive). Unknown dates count as overlapping. */
export function buildWindowOverlaps(r: Pick<IsraeliRecall, 'buildBegin' | 'buildEnd'>, fromYear: number, toYear: number): boolean {
  const b = parseInt((r.buildBegin || '').slice(0, 4));
  const e = parseInt((r.buildEnd || '').slice(0, 4));
  return (isNaN(b) || b <= toYear) && (isNaN(e) || e >= fromYear);
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

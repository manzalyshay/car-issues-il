/**
 * 3D model lookup - data lives in D1 `car_3d_models` table.
 * Supports multiple models per car keyed by year range (year_from / year_to).
 * Uses a globalThis cache so the table is only queried once per Worker isolate.
 */
import { dbAll } from './db';

export interface SketchfabModel {
  uid: string;
  name: string;
  nameHe: string | null;
  author: string;
  license: string;
  viewerUrl: string;
  reelUrl: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}

type ModelEntry = {
  uid: string;
  name: string;
  nameHe: string | null;
  author: string;
  license: string;
  reelUrl: string | null;
  yearFrom: number | null;
  yearTo: number | null;
};

// map key: "make_slug/model_slug" → array of entries (one per year range)
type ModelsMap = Record<string, ModelEntry[]>;

// Remove entries that are clearly a different vehicle, a race-only variant, an
// interior scene, or a low-poly placeholder rather than a usable exterior model.
const UNSUITABLE_3D_TITLES: RegExp[] = [
  /\blow[ -]?poly\b/i,
  /\binterior\b/i,
  /\basset(?:s|'s)?\s+pack\b/i,
  /\b(?:rally\s*1|e-racer|gt2)\b/i,
];

const MISASSIGNED_3D_TITLES: Record<string, RegExp[]> = {
  'alfa-romeo/tonale': [/\bconcept\b/i],
  'byd/sealion6': [/\bsealion\s*7\b/i],
  'chery/arrizo6': [/\barrizo\s*8\b/i],
  'cupra/ateca': [/\bseat\s+ateca\b/i],
  'cupra/born': [/\bvolkswagen\s+id[ .-]?3\b/i],
  'fiat/500': [/\boutlaw\b/i],
  'fiat/500e': [/\b500e\s+2013\b/i],
  'land-rover/range-rover-velar': [/\bland\s+rover\s+range\s+rover\s+2022\b/i],
  'mercedes/c43-amg': [/\bamg\s+gt2\b/i],
  'mercedes/eqa': [/\beqs\s+580\b/i],
  'mercedes/eqe-suv': [/\beqs[_ -]?suv\b/i],
  'mini/countryman': [/\bvuitton\b/i],
  'opel/corsa': [/\b1995\b/i],
  'seat/leon': [/\be-racer\b/i],
  'volkswagen/id4': [/\bid[ .-]?3\b/i],
  'volkswagen/taigo': [/\bvirtus\b/i],
};

function isUnsuitable3DTitle(makeSlug: string, modelSlug: string, title: string): boolean {
  if (UNSUITABLE_3D_TITLES.some(pattern => pattern.test(title))) return true;
  return (MISASSIGNED_3D_TITLES[`${makeSlug}/${modelSlug}`] ?? []).some(pattern => pattern.test(title));
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const g = globalThis as typeof globalThis & {
  _3dModelsCache?: { data: ModelsMap; ts: number };
};

async function fetch3dModels(): Promise<ModelsMap> {
  const now = Date.now();
  if (g._3dModelsCache && now - g._3dModelsCache.ts < CACHE_TTL_MS) {
    return g._3dModelsCache.data;
  }
  try {
    const rows = await dbAll<{
      make_slug: string; model_slug: string; sketchfab_uid: string;
      sketchfab_name: string; name_he: string | null; sketchfab_author: string; license: string;
      reel_url: string | null; year_from: number | null; year_to: number | null;
    }>('SELECT make_slug, model_slug, sketchfab_uid, sketchfab_name, name_he, sketchfab_author, license, reel_url, year_from, year_to FROM car_3d_models WHERE hidden IS NOT 1');
    const map: ModelsMap = {};
    for (const row of rows) {
      const key = `${row.make_slug}/${row.model_slug}`;
      if (!map[key]) map[key] = [];
      map[key].push({
        uid: row.sketchfab_uid,
        name: row.sketchfab_name,
        nameHe: row.name_he ?? null,
        author: row.sketchfab_author,
        license: row.license,
        reelUrl: row.reel_url ?? null,
        yearFrom: row.year_from ?? null,
        yearTo: row.year_to ?? null,
      });
    }
    g._3dModelsCache = { data: map, ts: now };
    return map;
  } catch {
    return {};
  }
}

/**
 * Pick the "most recent" entry: the open-ended one (yearTo == null), else the
 * entry with the highest yearFrom. Used for the main model page.
 */
function pickMostRecent(entries: ModelEntry[]): ModelEntry {
  const openEnded = entries.find(e => e.yearTo == null);
  if (openEnded) return openEnded;
  return entries.reduce((best, e) =>
    (e.yearFrom ?? -Infinity) > (best.yearFrom ?? -Infinity) ? e : best,
  );
}

/**
 * Pick the best entry for the given year (or no year).
 * Year-page selection order:
 *  1. Entry whose range contains `year` (yearFrom <= year <= yearTo, yearTo=null = no upper bound)
 *  2. Entry with the highest yearFrom that is still < year
 *  3. Entry with the lowest yearFrom
 * No year requested (main model page): most recent entry (yearTo=null, else highest yearFrom).
 */
function pickEntry(entries: ModelEntry[], year?: number): ModelEntry | null {
  if (!entries.length) return null;
  if (!year) return pickMostRecent(entries);

  const covering = entries.filter(e =>

    e.yearFrom != null &&
    year >= e.yearFrom &&
    (e.yearTo == null || year <= e.yearTo),
  );
  if (covering.length) {
    // Narrowest range wins among covering entries
    covering.sort((a, b) => {
      const rangeA = (a.yearTo ?? 9999) - (a.yearFrom ?? 0);
      const rangeB = (b.yearTo ?? 9999) - (b.yearFrom ?? 0);
      return rangeA - rangeB;
    });
    return covering[0];
  }

  const before = entries.filter(e => e.yearFrom != null && e.yearFrom < year);
  if (before.length) {
    return before.reduce((best, e) => (e.yearFrom! > best.yearFrom!) ? e : best);
  }

  const withYear = entries.filter(e => e.yearFrom != null);
  if (withYear.length) {
    return withYear.reduce((best, e) => (e.yearFrom! < best.yearFrom!) ? e : best);
  }

  // No entries have a yearFrom at all: single generic entry, show for all years
  return entries[0];
}

export async function findCarModel(
  makeSlug: string,
  modelSlug: string,
  year?: number,
): Promise<SketchfabModel | null> {
  const models = await fetch3dModels();
  const entries = models[`${makeSlug}/${modelSlug}`]?.filter(entry =>
    !isUnsuitable3DTitle(makeSlug, modelSlug, entry.name),
  );
  if (!entries?.length) return null;
  const entry = pickEntry(entries, year);
  if (!entry) return null;
  return {
    uid: entry.uid,
    name: entry.name,
    nameHe: entry.nameHe,
    author: entry.author,
    license: entry.license,
    viewerUrl: `https://sketchfab.com/models/${entry.uid}`,
    reelUrl: entry.reelUrl,
    yearFrom: entry.yearFrom,
    yearTo: entry.yearTo,
  };
}

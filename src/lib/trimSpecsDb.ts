import { dbAll, dbFirst } from './db';
import type { TrimSpec } from '@/data/cars';
import { deriveFromAutoCoil, isAutoCoilEquipment } from './autoCoilFeatures';

/**
 * Only prices with a known source are shown: auto.co.il list prices or the Ministry of
 * Transport importer price list (scripts/sync-*-prices.mjs set price_source). Older
 * hand-entered estimates stay in price_ils but read as "no price".
 */
export const VERIFIED_PRICE_SQL = 'CASE WHEN price_source IS NOT NULL THEN price_ils END';

export interface TrimSpecWithYear extends TrimSpec {
  modelYear: number | null;
  isIsrael: boolean;
}

function parseFeatures(raw: unknown): unknown {
  try { return JSON.parse(String(raw || '[]')); } catch { return []; }
}

function rowToTrimSpec(row: Record<string, unknown>): TrimSpecWithYear {
  // auto.co.il-sourced rows store the version page's Hebrew equipment table (an object)
  // instead of a string[] of TRIM_FEATURES keys: derive the keys, seat material and
  // screen size from it (src/lib/autoCoilFeatures.ts).
  const parsed = parseFeatures(row.features);
  const derived = isAutoCoilEquipment(parsed) ? deriveFromAutoCoil(parsed) : null;
  return {
    id: row.id as string,
    name: row.name as string,
    sortOrder: (row.sort_order as number) ?? 0,
    engineType: (row.engine_type as TrimSpec['engineType']) ?? undefined,
    engineCc: (row.engine_cc as number) ?? undefined,
    engineHp: (row.engine_hp as number) ?? undefined,
    transmission: (row.transmission as TrimSpec['transmission']) ?? undefined,
    drive: (row.drive as TrimSpec['drive']) ?? undefined,
    seats: (row.seats as TrimSpec['seats']) ?? derived?.seats ?? undefined,
    seatCount: (row.seat_count as number) ?? undefined,
    screenSize: row.screen_size != null ? Number(row.screen_size) : derived?.screenSize,
    features: derived ? derived.features : Array.isArray(parsed) ? parsed : [],
    priceIls: row.price_source != null ? ((row.price_ils as number) ?? undefined) : undefined,
    acceleration: (row.acceleration_0_100 as number) ?? undefined,
    topSpeedKmh: (row.top_speed_kmh as number) ?? undefined,
    torqueNm: (row.torque_nm as number) ?? undefined,
    fuelConsumption: (row.fuel_consumption as number) ?? undefined,
    cargoLiters: (row.cargo_liters as number) ?? undefined,
    curbWeightKg: (row.curb_weight_kg as number) ?? undefined,
    modelYear: (row.model_year as number) ?? null,
    isIsrael: (row.is_israel as number) === 1,
  };
}

/** Returns a map of "make_slug/model_slug" → minimum plausible list price (ILS). */
export async function getModelPriceMins(): Promise<Map<string, number>> {
  try {
    const rows = await dbAll<{ k: string; min_price: number }>(
      `SELECT make_slug || '/' || model_slug AS k, MIN(price_ils) AS min_price
       FROM car_trims
       WHERE price_ils IS NOT NULL AND price_ils >= 20000 AND is_israel = 1 AND price_source IS NOT NULL
       GROUP BY make_slug, model_slug`,
    );
    return new Map(rows.map((r) => [r.k, r.min_price]));
  } catch {
    return new Map();
  }
}

/**
 * The scraper stores one row per (trim name, model year), so the same named trim
 * (e.g. "RS quattro") often repeats across several years with identical or
 * near-identical specs. That produces two selector buttons that are visually and
 * functionally indistinguishable (same name → same `selected` state either way).
 * Collapse same-named trims down to the single most complete / most recent row.
 */
function dedupeTrimsByName(trims: TrimSpecWithYear[]): TrimSpecWithYear[] {
  const fieldCount = (t: TrimSpecWithYear) =>
    [t.engineType, t.engineCc, t.engineHp, t.transmission, t.drive, t.seats, t.seatCount,
      t.screenSize, t.priceIls, t.acceleration, t.topSpeedKmh, t.torqueNm, t.fuelConsumption,
      t.cargoLiters, t.curbWeightKg].filter((v) => v != null).length + t.features.length;

  const byName = new Map<string, TrimSpecWithYear>();
  const order: string[] = [];
  for (const t of trims) {
    const existing = byName.get(t.name);
    if (!existing) {
      byName.set(t.name, t);
      order.push(t.name);
      continue;
    }
    const existingScore = fieldCount(existing);
    const score = fieldCount(t);
    const better = score !== existingScore
      ? score > existingScore
      : (t.modelYear ?? 0) > (existing.modelYear ?? 0);
    if (better) byName.set(t.name, t);
  }
  return order.map((name) => byName.get(name)!);
}

export async function getTrimSpecs(makeSlug: string, modelSlug: string, year?: number): Promise<TrimSpecWithYear[]> {
  try {
    if (year) {
      // Check if year-specific data exists, fall back to all rows
      const hasYear = await dbFirst(
        'SELECT id FROM car_trims WHERE make_slug = ? AND model_slug = ? AND model_year = ? AND is_israel = 1 LIMIT 1',
        makeSlug, modelSlug, year,
      );
      if (hasYear) {
        const rows = await dbAll(
          'SELECT * FROM car_trims WHERE make_slug = ? AND model_slug = ? AND model_year = ? AND is_israel = 1 ORDER BY sort_order',
          makeSlug, modelSlug, year,
        );
        return dedupeTrimsByName(rows.map(rowToTrimSpec));
      }
    }
    const rows = await dbAll(
      'SELECT * FROM car_trims WHERE make_slug = ? AND model_slug = ? AND is_israel = 1 ORDER BY sort_order',
      makeSlug, modelSlug,
    );
    return dedupeTrimsByName(currentLineup(rows.map(rowToTrimSpec)));
  } catch {
    return [];
  }
}

/**
 * The trims on sale now, for pages without a year (model page, compare, FAQ). Rows with a
 * model_year are a year-by-year history (auto.co.il), so mixing every year would show
 * e.g. a 2019 plug-in "EX" next to the 2026 hybrid "EX": only the latest year is shown.
 * Undated rows are an importer price list of current trims; they win only when the dated
 * history stops before this year.
 */
function currentLineup(trims: TrimSpecWithYear[]): TrimSpecWithYear[] {
  const dated = trims.filter((t) => t.modelYear != null);
  if (!dated.length) return trims;
  const latest = Math.max(...dated.map((t) => t.modelYear!));
  const undated = trims.filter((t) => t.modelYear == null);
  if (undated.length && latest < new Date().getFullYear()) return undated;
  return dated.filter((t) => t.modelYear === latest);
}

/**
 * Every Israeli trim of a model, newest year first, one per name: trim pages
 * (/trim/<slug>) and the sitemap cover past years' trims too, not just the current lineup.
 */
export async function getAllTrimSpecs(makeSlug: string, modelSlug: string): Promise<TrimSpecWithYear[]> {
  try {
    const rows = await dbAll(
      'SELECT * FROM car_trims WHERE make_slug = ? AND model_slug = ? AND is_israel = 1 ORDER BY model_year IS NULL, model_year DESC, sort_order',
      makeSlug, modelSlug,
    );
    const seen = new Set<string>();
    return rows.map(rowToTrimSpec).filter((t) => !seen.has(t.name) && !!seen.add(t.name));
  } catch {
    return [];
  }
}

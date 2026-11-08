import { dbAll, dbFirst } from './db';
import type { TrimSpec } from '@/data/cars';
import { normalizeDrive, normalizeEngineType, normalizeSeats, normalizeTransmission } from './trimLocalize';

export interface TrimSpecWithYear extends TrimSpec {
  modelYear: number | null;
  isIsrael: boolean;
}

function rowToTrimSpec(row: Record<string, unknown>): TrimSpecWithYear {
  return {
    id: row.id as string,
    name: row.name as string,
    sortOrder: (row.sort_order as number) ?? 0,
    engineType: normalizeEngineType(row.engine_type) as TrimSpec['engineType'],
    engineCc: (row.engine_cc as number) ?? undefined,
    engineHp: (row.engine_hp as number) ?? undefined,
    transmission: normalizeTransmission(row.transmission) as TrimSpec['transmission'],
    drive: normalizeDrive(row.drive) as TrimSpec['drive'],
    seats: normalizeSeats(row.seats) as TrimSpec['seats'],
    seatCount: (row.seat_count as number) ?? undefined,
    screenSize: row.screen_size != null ? Number(row.screen_size) : undefined,
    features: (() => {
      // auto.co.il-sourced rows sometimes store a raw Hebrew equipment-description
      // object here instead of the expected string[] of TRIM_FEATURES keys - guard
      // against that shape so the UI never calls .includes() on a non-array.
      try {
        const parsed = JSON.parse(String(row.features || '[]'));
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    })(),
    priceIls: (row.price_ils as number) ?? undefined,
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
       WHERE price_ils IS NOT NULL AND price_ils >= 20000 AND is_israel = 1
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
    return dedupeTrimsByName(rows.map(rowToTrimSpec));
  } catch {
    return [];
  }
}

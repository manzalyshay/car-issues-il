import { dbAll, dbFirst } from './db';
import type { TrimSpec } from '@/data/cars';

export interface TrimSpecWithYear extends TrimSpec {
  modelYear: number | null;
  isIsrael: boolean;
}

function rowToTrimSpec(row: Record<string, unknown>): TrimSpecWithYear {
  return {
    id: row.id as string,
    name: row.name as string,
    sortOrder: (row.sort_order as number) ?? 0,
    engineType: (row.engine_type as TrimSpec['engineType']) ?? undefined,
    engineCc: (row.engine_cc as number) ?? undefined,
    engineHp: (row.engine_hp as number) ?? undefined,
    transmission: (row.transmission as TrimSpec['transmission']) ?? undefined,
    drive: (row.drive as TrimSpec['drive']) ?? undefined,
    seats: (row.seats as TrimSpec['seats']) ?? undefined,
    seatCount: (row.seat_count as number) ?? undefined,
    screenSize: row.screen_size != null ? Number(row.screen_size) : undefined,
    features: (() => {
      try { return JSON.parse(String(row.features || '[]')); } catch { return []; }
    })(),
    priceIls: (row.price_ils as number) ?? undefined,
    modelYear: (row.model_year as number) ?? null,
    isIsrael: (row.is_israel as number) === 1,
  };
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
        return rows.map(rowToTrimSpec);
      }
    }
    const rows = await dbAll(
      'SELECT * FROM car_trims WHERE make_slug = ? AND model_slug = ? AND is_israel = 1 ORDER BY sort_order',
      makeSlug, modelSlug,
    );
    return rows.map(rowToTrimSpec);
  } catch {
    return [];
  }
}

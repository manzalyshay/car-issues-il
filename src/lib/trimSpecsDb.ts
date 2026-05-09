import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';
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
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    priceIls: (row.price_ils as number) ?? undefined,
    modelYear: (row.model_year as number) ?? null,
    isIsrael: (row.is_israel as boolean) ?? true,
  };
}

export async function getTrimSpecs(makeSlug: string, modelSlug: string, year?: number): Promise<TrimSpecWithYear[]> {
  const cacheKey = year
    ? `trim-specs-${makeSlug}-${modelSlug}-${year}`
    : `trim-specs-${makeSlug}-${modelSlug}`;
  const fetcher = unstable_cache(
    async () => {
      const db = getServiceClient();
      let q = db
        .from('car_trims')
        .select('*')
        .eq('make_slug', makeSlug)
        .eq('model_slug', modelSlug)
        .eq('is_israel', true)
        .order('sort_order');
      // Filter by year if specified and data exists; fall back to all rows if none match
      if (year) {
        const { data: yearData } = await db
          .from('car_trims')
          .select('id')
          .eq('make_slug', makeSlug)
          .eq('model_slug', modelSlug)
          .eq('model_year', year)
          .eq('is_israel', true)
          .limit(1);
        if (yearData && yearData.length > 0) {
          q = db
            .from('car_trims')
            .select('*')
            .eq('make_slug', makeSlug)
            .eq('model_slug', modelSlug)
            .eq('model_year', year)
            .eq('is_israel', true)
            .order('sort_order');
        }
      }
      const { data, error } = await q;
      if (error) throw new Error(`car_trims: ${error.message}`);
      return (data ?? []).map(rowToTrimSpec);
    },
    [cacheKey],
    { revalidate: 3600, tags: ['trim-specs', `trim-specs-${makeSlug}-${modelSlug}`] },
  );
  return fetcher();
}

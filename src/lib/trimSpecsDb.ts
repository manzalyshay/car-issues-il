import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';
import type { TrimSpec } from '@/data/cars';

function rowToTrimSpec(row: Record<string, unknown>): TrimSpec {
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
  };
}

export async function getTrimSpecs(makeSlug: string, modelSlug: string): Promise<TrimSpec[]> {
  const fetcher = unstable_cache(
    async () => {
      const db = getServiceClient();
      const { data, error } = await db
        .from('car_trims')
        .select('*')
        .eq('make_slug', makeSlug)
        .eq('model_slug', modelSlug)
        .order('sort_order');
      if (error) throw new Error(`car_trims: ${error.message}`);
      return (data ?? []).map(rowToTrimSpec);
    },
    [`trim-specs-${makeSlug}-${modelSlug}`],
    { revalidate: 3600, tags: ['trim-specs', `trim-specs-${makeSlug}-${modelSlug}`] },
  );
  return fetcher();
}

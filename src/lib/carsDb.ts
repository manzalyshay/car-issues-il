/**
 * DB-backed replacement for src/data/cars.ts
 * All car data now lives in Supabase (car_makes + car_models tables).
 * Same function signatures as the old static file for easy migration.
 */
import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';
import type { CarMake, CarModel } from '@/data/cars';

export type { CarMake, CarModel };
export { getCategoryLabel } from '@/data/cars';

// Cache the full database for 1 hour; revalidate via tag 'car-data'
const fetchAllMakes = unstable_cache(
  async (): Promise<CarMake[]> => {
    const db = getServiceClient();

    const [{ data: makesData, error: makesErr }, { data: modelsData, error: modelsErr }] =
      await Promise.all([
        db.from('car_makes').select('*').order('sort_order'),
        db.from('car_models').select('*').order('make_slug').order('sort_order'),
      ]);

    if (makesErr) throw new Error(`car_makes: ${makesErr.message}`);
    if (modelsErr) throw new Error(`car_models: ${modelsErr.message}`);

    return (makesData ?? []).map((m) => ({
      slug: m.slug as string,
      nameHe: m.name_he as string,
      nameEn: m.name_en as string,
      country: m.country as string,
      logoUrl: m.logo_url as string,
      popular: m.is_popular as boolean,
      models: (modelsData ?? [])
        .filter((mo) => mo.make_slug === m.slug)
        .map((mo) => ({
          slug: mo.slug as string,
          nameHe: mo.name_he as string,
          nameEn: mo.name_en as string,
          years: (mo.years ?? []) as number[],
          category: mo.category as CarModel['category'],
        })),
    }));
  },
  ['car-database'],
  { revalidate: 3600, tags: ['car-data'] },
);

export async function getAllMakes(): Promise<CarMake[]> {
  return fetchAllMakes();
}

export async function getMakeBySlug(slug: string): Promise<CarMake | undefined> {
  const makes = await fetchAllMakes();
  return makes.find((m) => m.slug === slug);
}

/** Accepts either (makeSlug, modelSlug) or (make, modelSlug) for backwards compat */
export async function getModelBySlug(
  makeOrSlug: CarMake | string,
  modelSlug: string,
): Promise<CarModel | undefined> {
  const makeSlug = typeof makeOrSlug === 'string' ? makeOrSlug : makeOrSlug.slug;
  const makes = await fetchAllMakes();
  const make = makes.find((m) => m.slug === makeSlug);
  return make?.models.find((m) => m.slug === modelSlug);
}

export async function getPopularMakes(): Promise<CarMake[]> {
  const makes = await fetchAllMakes();
  return makes.filter((m) => m.popular);
}

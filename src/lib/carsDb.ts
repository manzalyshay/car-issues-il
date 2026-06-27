/**
 * Car data backed by Cloudflare D1.
 * Uses a globalThis cache so data survives across requests within the same
 * Worker instance — avoids re-querying D1 on every page load.
 */
import { dbAll } from './db';
import type { CarMake, CarModel } from '@/data/cars';

export type { CarMake, CarModel };
export { getCategoryLabel } from '@/data/cars';

// Cache persists for the lifetime of the Worker isolate (~minutes on free tier)
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const g = globalThis as typeof globalThis & {
  _carsCache?: { data: CarMake[]; ts: number };
};

async function fetchAllMakes(): Promise<CarMake[]> {
  const now = Date.now();
  if (g._carsCache && now - g._carsCache.ts < CACHE_TTL_MS) {
    return g._carsCache.data;
  }

  const [makesData, modelsData] = await Promise.all([
    dbAll<{
      slug: string; name_he: string; name_en: string; country: string;
      logo_url: string; is_popular: number; sort_order: number;
    }>('SELECT * FROM car_makes ORDER BY sort_order'),
    dbAll<{
      slug: string; make_slug: string; name_he: string; name_en: string;
      years: string; category: string; trims: string; sort_order: number;
    }>('SELECT * FROM car_models ORDER BY make_slug, sort_order'),
  ]);

  const data = makesData.map((m) => ({
    slug: m.slug,
    nameHe: m.name_he,
    nameEn: m.name_en,
    country: m.country,
    logoUrl: m.logo_url,
    popular: m.is_popular === 1,
    models: modelsData
      .filter((mo) => mo.make_slug === m.slug)
      .map((mo) => ({
        slug: mo.slug,
        nameHe: mo.name_he,
        nameEn: mo.name_en,
        years: JSON.parse(mo.years || '[]') as number[],
        category: mo.category as CarModel['category'],
        trims: (() => {
          const t = JSON.parse(mo.trims || '[]');
          return Array.isArray(t) && t.length > 0 ? (t as string[]) : undefined;
        })(),
      })),
  }));

  g._carsCache = { data, ts: now };
  return data;
}

export async function getAllMakes(): Promise<CarMake[]> {
  return fetchAllMakes();
}

export async function getMakeBySlug(slug: string): Promise<CarMake | undefined> {
  const makes = await fetchAllMakes();
  return makes.find((m) => m.slug === slug);
}

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

export async function getSimilarModels(
  makeSlug: string,
  modelSlug: string,
  category: CarModel['category'],
  limit = 8,
): Promise<{ makeSlug: string; makeNameHe: string; makeNameEn: string; model: CarModel }[]> {
  const makes = await fetchAllMakes();
  const results: { makeSlug: string; makeNameHe: string; makeNameEn: string; model: CarModel }[] = [];
  for (const make of makes) {
    for (const model of make.models) {
      if (make.slug === makeSlug && model.slug === modelSlug) continue;
      if (model.category === category) {
        results.push({ makeSlug: make.slug, makeNameHe: make.nameHe, makeNameEn: make.nameEn, model });
      }
    }
  }
  return results.slice(0, limit);
}

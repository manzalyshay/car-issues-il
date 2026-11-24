/**
 * Motorcycles (/motorcycles) backed by the D1 tables moto_makes / moto_models
 * (migrations/0020_motorcycles.sql, filled from scripts/moto/models.json).
 *
 * Owner reviews and follows for a bike are stored under the make key `moto-<make>`
 * (see motoKeys.ts).
 */
import { dbAll } from './db';
import type { Recall } from '@/app/api/recalls/route';
import { buildWindowOverlaps } from './israeliRecallsDb';

export type MotoCategory = 'scooter' | 'adventure' | 'naked' | 'sport' | 'offroad' | 'cruiser' | 'electric';

export interface MotoModel {
  slug: string;
  nameHe: string;
  nameEn: string;
  category: MotoCategory;
  /** Newest first, like CarModel.years. */
  years: number[];
  trims: string[];
  ccMin: number | null;
  ccMax: number | null;
  recallPatterns: string[];
  activeVehiclesIl: number | null;
  activeVehiclesIlAsOf: string | null;
  /** Main photo (car_images row marked is_main under the moto- key), for list cards. */
  leadingImageUrl: string | null;
}

export interface MotoMake {
  slug: string;
  nameHe: string;
  nameEn: string;
  country: string;
  logoUrl: string;
  recallMakes: string[];
  models: MotoModel[];
}

import { MOTO_KEY_PREFIX } from './motoKeys';
export { MOTO_KEY_PREFIX, motoKey, isMotoKey, vehiclePath } from './motoKeys';

const CATEGORY: Record<MotoCategory, { he: string; en: string }> = {
  scooter: { he: 'קטנוע', en: 'Scooter' },
  adventure: { he: 'אדוונצ׳ר', en: 'Adventure' },
  naked: { he: 'נייקד', en: 'Naked' },
  sport: { he: 'ספורט', en: 'Sport' },
  offroad: { he: 'שטח', en: 'Off-road' },
  cruiser: { he: 'קרוזר', en: 'Cruiser' },
  electric: { he: 'חשמלי', en: 'Electric' },
};
export const MOTO_CATEGORIES = Object.keys(CATEGORY) as MotoCategory[];
export const motoCategoryLabel = (c: MotoCategory, locale: string = 'he') =>
  (locale === 'en' ? CATEGORY[c]?.en : CATEGORY[c]?.he) ?? c;

const parse = <T,>(s: string | null, fallback: T): T => {
  try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const g = globalThis as typeof globalThis & { _motoCache?: { data: MotoMake[]; ts: number } };

export async function getAllMotoMakes(): Promise<MotoMake[]> {
  const now = Date.now();
  if (g._motoCache && now - g._motoCache.ts < CACHE_TTL_MS) return g._motoCache.data;
  const [makes, models] = await Promise.all([
    dbAll<{ slug: string; name_he: string; name_en: string; country: string; logo_url: string; recall_makes: string }>(
      'SELECT slug, name_he, name_en, country, logo_url, recall_makes FROM moto_makes ORDER BY sort_order',
    ),
    dbAll<{
      make_slug: string; slug: string; name_he: string; name_en: string; category: string; years: string; trims: string;
      cc_min: number | null; cc_max: number | null; recall_patterns: string;
      active_vehicles_il: number | null; active_vehicles_il_as_of: string | null; leading_image_url: string | null;
    }>('SELECT * FROM moto_models ORDER BY sort_order'),
  ]);
  const data: MotoMake[] = makes.map((m) => ({
    slug: m.slug,
    nameHe: m.name_he,
    nameEn: m.name_en,
    country: m.country,
    logoUrl: m.logo_url,
    recallMakes: parse<string[]>(m.recall_makes, []),
    models: models.filter((mo) => mo.make_slug === m.slug).map((mo) => ({
      slug: mo.slug,
      nameHe: mo.name_he,
      nameEn: mo.name_en,
      category: mo.category as MotoCategory,
      years: parse<number[]>(mo.years, []).sort((a, b) => b - a),
      trims: parse<string[]>(mo.trims, []),
      ccMin: mo.cc_min,
      ccMax: mo.cc_max,
      recallPatterns: parse<string[]>(mo.recall_patterns, []),
      activeVehiclesIl: mo.active_vehicles_il,
      activeVehiclesIlAsOf: mo.active_vehicles_il_as_of,
      leadingImageUrl: mo.leading_image_url,
    })),
  }));
  g._motoCache = { data, ts: now };
  return data;
}

export async function getMotoMake(slug: string): Promise<MotoMake | undefined> {
  return (await getAllMotoMakes().catch(() => [] as MotoMake[])).find((m) => m.slug === slug);
}

export async function getMotoModel(makeSlug: string, modelSlug: string) {
  const make = await getMotoMake(makeSlug);
  const model = make?.models.find((mo) => mo.slug === modelSlug);
  return make && model ? { make, model } : undefined;
}

/** Engine size as shown on pages: "125 סמ״ק", "250-450 סמ״ק", or null for electric bikes. */
export function ccLabel(mo: Pick<MotoModel, 'ccMin' | 'ccMax'>, locale: string = 'he'): string | null {
  if (!mo.ccMin || !mo.ccMax) return null;
  const n = mo.ccMin === mo.ccMax ? `${mo.ccMin}` : `${mo.ccMin}-${mo.ccMax}`;
  return locale === 'en' ? `${n} cc` : `${n} סמ״ק`;
}

const norm = (s: string) => s.toUpperCase().replace(/[\s-]+/g, '');

/** Israeli recall notices (Ministry of Transport) for a bike, matched by the model's recall patterns. */
export async function getMotoRecalls(make: MotoMake, model: MotoModel): Promise<Recall[]> {
  if (!make.recallMakes.length || !model.recallPatterns.length) return [];
  const patterns = model.recallPatterns.map((p) => new RegExp(p));
  const rows = await dbAll<{
    id: string; recall_id: number | null; make_raw: string | null; degem: string | null; recall_year: number | null;
    build_begin: string | null; build_end: string | null; recall_type: string | null; fault_type: string | null;
    fault_description: string | null; fix_method: string | null; importer: string | null; website: string | null;
  }>(
    `SELECT * FROM recalls_il WHERE make IN (${make.recallMakes.map(() => '?').join(',')}) ORDER BY recall_year DESC, recall_id DESC`,
    ...make.recallMakes,
  ).catch(() => []);
  const [newest, oldest] = [model.years[0], model.years[model.years.length - 1]];
  return rows
    .filter((r) => r.degem && patterns.some((p) => p.test(norm(r.degem!))))
    .filter((r) => !newest || buildWindowOverlaps({ buildBegin: r.build_begin, buildEnd: r.build_end }, oldest, newest))
    .map((r) => ({
      id: r.id,
      year: null,
      date: '',
      component: r.fault_type ?? '',
      componentEn: '',
      summary: r.fault_description ?? '',
      consequence: '',
      remedy: r.fix_method ?? '',
      manufacturer: r.make_raw ?? '',
      source: 'il',
      importer: r.importer,
      website: r.website,
      ilRecallYear: r.recall_year,
      buildBegin: r.build_begin,
      buildEnd: r.build_end,
      recallType: r.recall_type,
    } as Recall));
}

/** Owner review count and average per bike, keyed "make/model" (site make slug, not the moto- key). */
export async function getMotoReviewStats(): Promise<Map<string, { n: number; avg: number }>> {
  const rows = await dbAll<{ make_slug: string; model_slug: string; n: number; avg: number }>(
    `SELECT make_slug, model_slug, COUNT(*) AS n, AVG(rating) AS avg FROM reviews
     WHERE make_slug LIKE '${MOTO_KEY_PREFIX}%' GROUP BY make_slug, model_slug`,
  ).catch(() => []);
  return new Map(rows.map((r) => [`${r.make_slug.slice(MOTO_KEY_PREFIX.length)}/${r.model_slug}`, { n: r.n, avg: r.avg }]));
}

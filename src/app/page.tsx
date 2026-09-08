import { getAllMakes, getPopularMakes } from '@/lib/carsDb';
import { dbAll } from '@/lib/db';
import HomeClient from '@/components/HomeClient';

export const revalidate = 300; // cache home page for 5 minutes

async function getTopRanked(limit = 3) {
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; leadingImageUrl: string | null }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl, leadingImageUrl: model.leadingImageUrl ?? null });

  const [expertData, reviewData, modelData] = await Promise.all([
    dbAll<{ make_slug: string; model_slug: string; top_score: number }>(
      'SELECT make_slug, model_slug, top_score FROM expert_reviews WHERE year IS NULL AND top_score IS NOT NULL',
    ),
    dbAll<{ make_slug: string; model_slug: string; rating: number }>(
      'SELECT make_slug, model_slug, rating FROM reviews',
    ),
    dbAll<{ make_slug: string; model_slug: string; sketchfab_uid: string }>(
      'SELECT make_slug, model_slug, sketchfab_uid FROM car_3d_models WHERE hidden IS NOT 1',
    ).catch(() => []),
  ]);

  const scoreMap = new Map<string, number>();
  for (const row of expertData) scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }
  const fabMap = new Map<string, string>();
  for (const row of modelData) {
    fabMap.set(`${row.make_slug}/${row.model_slug}`, row.sketchfab_uid);
  }

  const ranked: { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; avgRating: number | null; imageUrl: string | null; sketchfabUid: string | null }[] = [];
  for (const [key, info] of lookup.entries()) {
    const topScore = scoreMap.get(key) ?? null;
    const ratings = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const scores: number[] = [];
    if (topScore != null) scores.push(topScore);
    if (avgRating != null) scores.push(avgRating * 2);
    if (!scores.length) continue;
    const combined = scores.reduce((a, b) => a + b, 0) / scores.length;
    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, combined, avgRating, imageUrl: info.leadingImageUrl, sketchfabUid: fabMap.get(key) ?? null });
  }
  // Shuffle the ranked pool and pick randomly so the homepage shows different cars each visit
  for (let i = ranked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ranked[i], ranked[j]] = [ranked[j], ranked[i]];
  }
  return ranked.slice(0, limit);
}

async function getRecentReviews(limit = 3) {
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl });

  const rows = await dbAll<Record<string, unknown>>(
    'SELECT * FROM reviews ORDER BY created_at DESC LIMIT ?', limit,
  );

  return rows.map((r) => ({
    ...r,
    ...(lookup.get(`${r.make_slug}/${r.model_slug}`) ?? { makeHe: r.make_slug, modelHe: r.model_slug, makeEn: r.make_slug, modelEn: r.model_slug, logoUrl: '' }),
  }));
}

export interface TickerItem { code: string; textHe: string; textEn: string; color: string; }

const REPAIR_KEY_EN: Record<string, string> = {
  battery: 'Battery replacement',
  oil_change: 'Engine oil change',
  brake_pads_front: 'Front brake pads & discs',
  brake_pads_rear: 'Rear brake pads & discs',
  timing_belt: 'Timing belt replacement',
  air_filter: 'Air filter replacement',
  spark_plugs: 'Spark plug replacement',
  gearbox_auto: 'Automatic gearbox repair',
  catalytic_converter: 'Catalytic converter replacement',
  fuel_injectors: 'Fuel injector replacement',
  oil_leak_repair: 'Oil leak repair',
  steering_rack: 'Steering rack repair',
  wheel_alignment: 'Wheel alignment',
  pre_purchase_inspection: 'Pre-purchase inspection',
  service_10k: '10,000 km service',
  service_15k: '15,000 km service',
};

async function getTickerItems(): Promise<TickerItem[]> {
  const makes = await getAllMakes().catch(() => []);
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn });

  const [reviews, repairs, recalls] = await Promise.all([
    dbAll<{ make_slug: string; model_slug: string; year: number | null; rating: number }>(
      'SELECT make_slug, model_slug, year, rating FROM reviews ORDER BY created_at DESC LIMIT 6',
    ).catch(() => []),
    dbAll<{ make_slug: string; model_slug: string; repair_name_he: string; repair_key: string; cost_ils: number }>(
      'SELECT make_slug, model_slug, repair_name_he, repair_key, cost_ils FROM user_repair_costs ORDER BY created_at DESC LIMIT 4',
    ).catch(() => []),
    dbAll<{ make: string; model: string; component_he: string }>(
      "SELECT make, model, component_he FROM recalls_cache WHERE component_he IS NOT NULL AND component_he NOT LIKE '%:%' ORDER BY ROWID DESC LIMIT 4",
    ).catch(() => []),
  ]);

  const items: TickerItem[] = [];

  for (const r of reviews) {
    const info = lookup.get(`${r.make_slug}/${r.model_slug}`);
    if (!info) continue;
    const suffix = `${r.year ? ` ${r.year}` : ''} · ${r.rating}/5 ★`;
    items.push({
      code: 'ביקורת',
      textHe: `${info.makeHe} ${info.modelHe}${suffix}`,
      textEn: `${info.makeEn} ${info.modelEn}${suffix}`,
      color: '#9dc4e8',
    });
  }

  for (const r of repairs) {
    const info = lookup.get(`${r.make_slug}/${r.model_slug}`);
    if (!info) continue;
    const cost = `₪${r.cost_ils.toLocaleString()}`;
    items.push({
      code: 'תיקון',
      textHe: `${info.makeHe} ${info.modelHe} · ${r.repair_name_he} ${cost}`,
      textEn: `${info.makeEn} ${info.modelEn} · ${REPAIR_KEY_EN[r.repair_key] ?? r.repair_name_he} ${cost}`,
      color: '#6fd9a0',
    });
  }

  for (const r of recalls) {
    const info = lookup.get(`${r.make}/${r.model}`);
    const makeHe = info?.makeHe ?? r.make;
    const modelHe = info?.modelHe ?? r.model;
    const makeEn = info?.makeEn ?? r.make;
    const modelEn = info?.modelEn ?? r.model;
    items.push({
      code: 'ריקול',
      textHe: `ריקול · ${makeHe} ${modelHe} · ${r.component_he}`,
      textEn: `Recall · ${makeEn} ${modelEn} · ${r.component_he}`,
      color: '#ff9b8d',
    });
  }

  // Shuffle for variety
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items.slice(0, 10);
}

export default async function HomePage() {
  const [popularMakes, allMakes, topRanked, recentReviews, tickerItems] = await Promise.all([
    getPopularMakes().catch(() => []),
    getAllMakes().catch(() => []),
    getTopRanked(3).catch(() => []),
    getRecentReviews(3).catch(() => []),
    getTickerItems().catch(() => []),
  ]);

  return (
    <HomeClient
      popularMakes={popularMakes}
      allMakes={allMakes}
      topRanked={topRanked}
      recentReviews={recentReviews}
      tickerItems={tickerItems}
    />
  );
}

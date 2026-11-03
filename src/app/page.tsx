import { getAllMakes } from '@/lib/carsDb';
import { dbAll, dbFirst } from '@/lib/db';
import { getAllAiScores, blendWithOwnerRating } from '@/lib/aiScore';
import { getAllHeadlineTestAverages } from '@/lib/proReviewScores';
import { blendWithTestScore } from '@/lib/proReviewScoreLabels';
import { getLatestNews } from '@/lib/carNews';
import { getHostLocale } from '@/lib/hostLocale';
import HomeClient from '@/components/HomeClient';
import EnglishVersionBanner from '@/components/EnglishVersionBanner';
import { resolvePairs } from '@/lib/comparePairs';
import { TOP_COMPARE_PAIRS } from '@/data/top-compare-pairs';
import { getValidatedRepairReports } from '@/lib/repairReports';

export const revalidate = 300; // cache home page for 5 minutes

// Models sold only under an Israel-specific badge (not a globally-marketed car) -
// excluded from the English homepage's "Top Model" spotlight.
const ISRAEL_ONLY_MODELS = new Set(['hyundai/i25']);

async function getTopRanked(limit = 3, isEn = false) {
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; leadingImageUrl: string | null }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl, leadingImageUrl: model.leadingImageUrl ?? null });

  const [aiScores, reviewData, modelData, testScoreAvgs] = await Promise.all([
    getAllAiScores(),
    dbAll<{ make_slug: string; model_slug: string; rating: number }>(
      'SELECT make_slug, model_slug, rating FROM reviews',
    ),
    dbAll<{ make_slug: string; model_slug: string; sketchfab_uid: string; year_from: number | null; year_to: number | null }>(
      'SELECT make_slug, model_slug, sketchfab_uid, year_from, year_to FROM car_3d_models WHERE hidden IS NOT 1',
    ).catch(() => []),
    getAllHeadlineTestAverages().catch(() => new Map<string, number>()),
  ]);

  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }
  // Verified external test scores (icar, Autocar, carwow, etc.) - averaged per
  // model and blended into the displayed score below as one more real input.
  // Keep only the most recent 3D model per car (open-ended yearTo wins, else highest yearFrom)
  const fabBest = new Map<string, { uid: string; yearFrom: number | null; yearTo: number | null }>();
  for (const row of modelData) {
    const key = `${row.make_slug}/${row.model_slug}`;
    const existing = fabBest.get(key);
    const isBetter = !existing
      || (row.year_to == null && existing.yearTo != null)
      || ((row.year_to == null) === (existing.yearTo == null) && (row.year_from ?? -Infinity) > (existing.yearFrom ?? -Infinity));
    if (isBetter) fabBest.set(key, { uid: row.sketchfab_uid, yearFrom: row.year_from, yearTo: row.year_to });
  }
  const fabMap = new Map<string, string>();
  for (const [key, v] of fabBest) fabMap.set(key, v.uid);

  const ranked: { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; aiScore: number; aiConfidence: 'high' | 'medium' | 'low'; avgRating: number | null; reviewCount: number; imageUrl: string | null; sketchfabUid: string | null }[] = [];
  for (const [key, info] of lookup.entries()) {
    if (isEn && ISRAEL_ONLY_MODELS.has(key)) continue;
    const ai = aiScores[key] ?? null;
    if (!ai) continue;
    const ratings = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    let displayScore = blendWithOwnerRating(ai.score, avgRating, ratings.length);
    const testAvg = testScoreAvgs.get(key) ?? null;
    if (testAvg != null) displayScore = blendWithTestScore(displayScore, testAvg);
    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, aiScore: displayScore, aiConfidence: ai.confidence, avgRating, reviewCount: ratings.length, imageUrl: info.leadingImageUrl, sketchfabUid: fabMap.get(key) ?? null });
  }
  // Shuffle the ranked pool and pick randomly so the homepage shows different cars each visit
  for (let i = ranked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ranked[i], ranked[j]] = [ranked[j], ranked[i]];
  }
  return ranked.slice(0, limit);
}

async function getRecentReviews(limit = 3, locale?: string) {
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl });

  const where = locale === 'en' ? 'WHERE body_en IS NOT NULL' : '';
  const rows = await dbAll<{
    id: string; make_slug: string; model_slug: string; year: number | null; rating: number;
    title: string; body: string; title_en: string | null; body_en: string | null;
    author: string; created_at: string;
  }>(
    `SELECT * FROM reviews ${where} ORDER BY created_at DESC LIMIT ?`, limit,
  );

  return rows.map((r) => ({
    ...r,
    ...(lookup.get(`${r.make_slug}/${r.model_slug}`) ?? { makeHe: r.make_slug, modelHe: r.model_slug, makeEn: r.make_slug, modelEn: r.model_slug, logoUrl: '' }),
  }));
}

export interface TickerItem { code: string; codeEn: string; isRecall: boolean; textHe: string; textEn: string; color: string; }

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
    getValidatedRepairReports(20).catch(() => []),
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
      code: 'ביקורת', codeEn: 'REVIEW', isRecall: false,
      textHe: `${info.makeHe} ${info.modelHe}${suffix}`,
      textEn: `${info.makeEn} ${info.modelEn}${suffix}`,
      color: '#9dc4e8',
    });
  }

  for (const r of repairs) {
    const info = lookup.get(`${r.make_slug}/${r.model_slug}`);
    if (!info) continue;
    const costHe = `₪${r.cost_ils.toLocaleString()}`;
    const costEn = `$${Math.round(r.cost_ils / 3.65).toLocaleString()}`;
    items.push({
      code: 'תיקון', codeEn: 'REPAIR', isRecall: false,
      textHe: `${info.makeHe} ${info.modelHe} · ${r.repair_name_he} ${costHe}`,
      textEn: `${info.makeEn} ${info.modelEn} · ${REPAIR_KEY_EN[r.repair_key] ?? 'Repair'} ${costEn}`,
      color: '#6fd9a0',
    });
  }

  for (const r of recalls) {
    const info = lookup.get(`${r.make}/${r.model}`);
    const makeHe = info?.makeHe ?? r.make;
    const modelHe = info?.modelHe ?? r.model;
    const makeEn = info?.makeEn ?? r.make;
    const modelEn = info?.modelEn ?? r.model;
    const component = r.component_he.replace(/[\u0591-\u05C7]/g, '').trim();
    items.push({
      code: 'ריקול', codeEn: 'RECALL', isRecall: true,
      textHe: `ריקול · ${makeHe} ${modelHe} · ${component}`,
      textEn: `Recall · ${makeEn} ${modelEn} · ${component}`,
      color: '#ff9b8d',
    });
  }

  // Shuffle for variety
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const unique = [...new Map(items.map(item => [`${item.code}/${item.textHe.replace(/\s+/g, ' ').trim()}`, item])).values()];
  return unique.slice(0, 10);
}

export default async function HomePage() {
  const locale = await getHostLocale().catch(() => 'he');
  const [allMakes, topRanked, recentReviews, tickerItems, news, reviewTotal, recallTotal] = await Promise.all([
    getAllMakes().catch(() => []),
    getTopRanked(3, locale === 'en').catch(() => []),
    getRecentReviews(3, locale).catch(() => []),
    getTickerItems().catch(() => []),
    getLatestNews(12, 0, locale).catch(() => []),
    dbFirst<{ count: number }>('SELECT COUNT(*) AS count FROM reviews').then(r => r?.count ?? 0).catch(() => 0),
    dbFirst<{ count: number }>('SELECT COUNT(*) AS count FROM recalls_cache').then(r => r?.count ?? 0).catch(() => 0),
  ]);

  // Client component props get serialized into the page HTML - strip the other
  // locale's title/body so it never leaks into the page source. On the English
  // site also drop outlet-identifying fields (source, original_url) - DB-only.
  // Articles with no usable photo are not shown at all (no text-only cards).
  const newsWithImages = news
    .filter((n) => n.image_url && !n.image_url.includes('motor1.com') && !n.image_url.includes('hearstapps.com'))
    .slice(0, 4);
  const newsForClient = newsWithImages.map((n) => (locale === 'he'
    ? { ...n, title_en: null, body_en: null }
    : { ...n, title_he: null, body_he: null, source: '', original_url: '' }
  ));

  // allMakes/models carry Hebrew names + other Hebrew-only fields (country, trims)
  // that HomeClient never renders on the English site but that still get
  // serialized into the page HTML as client component props - strip them for EN.
  const makesForClient = locale === 'en'
    ? allMakes.map((m) => ({ ...m, nameHe: '', country: '', models: m.models.map((mm) => ({ ...mm, nameHe: '', trims: undefined, activeVehiclesIl: undefined })) }))
    : allMakes;

  const topPairs = resolvePairs(allMakes, TOP_COMPARE_PAIRS).slice(0, 6).map((p) => ({
    href: p.path,
    aHe: locale === 'en' ? '' : `${p.a.make.nameHe} ${p.a.model.nameHe}`, aEn: `${p.a.make.nameEn} ${p.a.model.nameEn}`,
    bHe: locale === 'en' ? '' : `${p.b.make.nameHe} ${p.b.model.nameHe}`, bEn: `${p.b.make.nameEn} ${p.b.model.nameEn}`,
  }));

  // Same RSC-payload-leak concern as news/makes above - these all carry raw
  // Hebrew fields (makeHe/modelHe/textHe/title/body) regardless of locale.
  const topRankedForClient = locale === 'en'
    ? topRanked.map((c) => ({ ...c, makeHe: '', modelHe: '' }))
    : topRanked;
  const recentReviewsForClient = locale === 'en'
    ? recentReviews.map((r) => ({ ...r, makeHe: '', modelHe: '', title: r.title_en ?? '', body: r.body_en ?? '', author: 'Anonymous', sub_model: undefined }))
    : recentReviews;
  const tickerItemsForClient = locale === 'en'
    ? tickerItems.map((t) => ({ ...t, code: t.codeEn, textHe: '' }))
    : tickerItems;

  return (
    <>
      {locale === 'he' && <EnglishVersionBanner />}
      <HomeClient
        allMakes={makesForClient}
        topRanked={topRankedForClient}
        recentReviews={recentReviewsForClient}
        tickerItems={tickerItemsForClient}
        initialNews={newsForClient}
        topPairs={topPairs}
        reviewTotal={reviewTotal}
        recallTotal={recallTotal}
      />
    </>
  );
}

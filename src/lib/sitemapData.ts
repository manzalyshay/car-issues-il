/**
 * Sitemap builders.
 *
 *  - carissues.co.il → one flat <urlset> at /sitemap.xml (full catalogue, unchanged coverage).
 *  - carissues.net   → /sitemap.xml is a <sitemapindex> pointing at four child sitemaps
 *    (/sitemaps/static.xml, makes.xml, models.xml, compare.xml) that list only pages with
 *    real content: models with an expert review or ≥ EN_MIN_OWNER_REVIEWS owner reviews,
 *    and compare pairs that are curated or got organic UK/AU visits.
 *
 * lastmod values come from the data (expert review scraped_at, owner review created_at,
 * known-issue scraped_at, news published_at) — never "now". Where no date exists the
 * field is omitted.
 */
import type { MetadataRoute } from 'next';
import { getAllMakes } from './carsDb';
import { dbAll } from './db';
import { getLatestNews } from './carNews';
import { curatedPairs, resolvePairs } from './comparePairs';
import { NET_ORGANIC_COMPARE_PAIRS } from '@/data/net-organic-compare-pairs';
import type { CarMake } from '@/data/cars';

export const HE_BASE = 'https://carissues.co.il';
export const EN_BASE = 'https://carissues.net';

/** A model without an expert review gets into the English sitemap with this many owner reviews. */
export const EN_MIN_OWNER_REVIEWS = 1;

export const EN_CHILD_SITEMAPS = ['static', 'makes', 'models', 'compare'] as const;
export type EnChildSitemap = (typeof EN_CHILD_SITEMAPS)[number];

export function isEnHost(h: string) {
  return h === 'carissues.net' || h === 'www.carissues.net' || h.startsWith('en.');
}

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const STATIC_PAGES: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/news', changeFrequency: 'daily', priority: 0.7 },
  { path: '/cars', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/cars/compare', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/embed', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/rankings', changeFrequency: 'daily', priority: 0.7 },
  { path: '/repairs', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/tco', changeFrequency: 'monthly', priority: 0.75 },
  { path: '/vehicle-lookup', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.2 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.2 },
];

// ── XML ──────────────────────────────────────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function fmtDate(d: string | Date | undefined) {
  if (!d) return undefined;
  return typeof d === 'string' ? d : d.toISOString();
}

export function urlsetXml(entries: MetadataRoute.Sitemap): string {
  const body = entries.map((e) => {
    const lastmod = fmtDate(e.lastModified as string | Date | undefined);
    return '<url>\n'
      + `<loc>${esc(e.url)}</loc>\n`
      + (lastmod ? `<lastmod>${lastmod}</lastmod>\n` : '')
      + (e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>\n` : '')
      + (e.priority != null ? `<priority>${e.priority}</priority>\n` : '')
      + '</url>\n';
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</urlset>\n`;
}

export function sitemapIndexXml(children: { url: string; lastModified?: string }[]): string {
  const body = children.map((c) =>
    `<sitemap>\n<loc>${esc(c.url)}</loc>\n${c.lastModified ? `<lastmod>${c.lastModified}</lastmod>\n` : ''}</sitemap>\n`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}</sitemapindex>\n`;
}

export function xmlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
}

// ── Hebrew (carissues.co.il): full catalogue ────────────────────────────────────────

export async function heSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const BASE = HE_BASE;
  const [makes, news] = await Promise.all([
    getAllMakes().catch(() => []),
    getLatestNews(200, 0, 'he').catch(() => []),
  ]);

  const makeUrls = makes.map((make) => ({ url: `${BASE}/cars/${make.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 }));
  const modelUrls = makes.flatMap((make) => make.models.map((model) => ({
    url: `${BASE}/cars/${make.slug}/${model.slug}`, changeFrequency: 'daily' as const, priority: 0.9,
  })));
  const issuesUrls = makes.flatMap((make) => make.models.map((model) => ({
    url: `${BASE}/cars/${make.slug}/${model.slug}/issues`, changeFrequency: 'weekly' as const, priority: 0.8,
  })));
  // Every year in car_models.years — new model years (e.g. 2027) appear automatically.
  const yearUrls = makes.flatMap((make) => make.models.flatMap((model) => (model.years ?? []).map((year) => ({
    url: `${BASE}/cars/${make.slug}/${model.slug}/${year}`, changeFrequency: 'weekly' as const, priority: 0.7,
  }))));

  const trims = await dbAll<{ make_slug: string; model_slug: string; name: string }>(
    'SELECT make_slug, model_slug, name FROM car_trims',
  ).catch(() => []);
  const trimUrls: MetadataRoute.Sitemap = trims.map((t) => ({
    url: `${BASE}/cars/${t.make_slug}/${t.model_slug}/trim/${toTrimSlug(t.name)}`, changeFrequency: 'weekly' as const, priority: 0.75,
  }));

  // All same-category pairs, plus curated pairs (top-clicked + searched) even across categories.
  const compareUrls: MetadataRoute.Sitemap = [];
  const flat = makes.flatMap((m) => m.models.map((mo) => ({ make: m.slug, model: mo.slug, category: mo.category })));
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i].category !== flat[j].category) continue;
      const [c1, c2] = [`${flat[i].make}/${flat[i].model}`, `${flat[j].make}/${flat[j].model}`].sort();
      compareUrls.push({ url: `${BASE}/cars/compare/${c1}/${c2}`, changeFrequency: 'weekly' as const, priority: 0.65 });
    }
  }
  const have = new Set(compareUrls.map((u) => u.url));
  for (const p of curatedPairs(makes)) {
    const url = `${BASE}${p.path}`;
    if (have.has(url)) continue;
    have.add(url);
    compareUrls.push({ url, changeFrequency: 'weekly' as const, priority: 0.7 });
  }

  const newsUrls: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${BASE}/news/${n.id}`,
    lastModified: n.published_at ? new Date(n.published_at) : undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    ...STATIC_PAGES.map((s) => ({ url: `${BASE}${s.path}`, changeFrequency: s.changeFrequency, priority: s.priority })),
    ...makeUrls, ...modelUrls, ...issuesUrls, ...yearUrls, ...trimUrls, ...compareUrls, ...newsUrls,
  ];
}

// ── English (carissues.net): content-backed pages only ──────────────────────────────

const maxDate = (...ds: (string | undefined)[]) => ds.filter(Boolean).sort().pop();

interface EnData {
  makes: CarMake[];
  /** "make/model" → YYYY-MM-DD of the latest content change, for models that qualify. */
  models: Map<string, string | undefined>;
  newsLatest?: string;
}

async function loadEnData(): Promise<EnData> {
  const [makes, rows, news] = await Promise.all([
    getAllMakes().catch(() => [] as CarMake[]),
    dbAll<{ k: string; expert: number; owners: number; lastmod: string | null }>(
      `SELECT k, MAX(expert) AS expert, SUM(owners) AS owners, MAX(d) AS lastmod FROM (
         SELECT make_slug || '/' || model_slug AS k, 1 AS expert, 0 AS owners, substr(scraped_at, 1, 10) AS d FROM expert_reviews WHERE year IS NULL
         UNION ALL SELECT make_slug || '/' || model_slug, 0, 1, substr(created_at, 1, 10) FROM reviews
         UNION ALL SELECT make_slug || '/' || model_slug, 0, 0, substr(scraped_at, 1, 10) FROM known_issues
       ) GROUP BY k`,
    ).catch(() => []),
    getLatestNews(1, 0, 'en').catch(() => []),
  ]);
  const models = new Map<string, string | undefined>();
  for (const r of rows) {
    if (r.expert || r.owners >= EN_MIN_OWNER_REVIEWS) models.set(r.k, r.lastmod ?? undefined);
  }
  const p = news[0]?.published_at;
  return { makes, models, newsLatest: p ? new Date(p).toISOString().slice(0, 10) : undefined };
}

function enEntries(d: EnData): Record<EnChildSitemap, MetadataRoute.Sitemap> {
  const BASE = EN_BASE;
  const catalogueLatest = maxDate(...d.models.values());

  const models: MetadataRoute.Sitemap = [];
  const makes: MetadataRoute.Sitemap = [];
  for (const make of d.makes) {
    const own = make.models
      .map((mo) => ({ mo, key: `${make.slug}/${mo.slug}` }))
      .filter(({ key }) => d.models.has(key));
    for (const { mo, key } of own) {
      models.push({ url: `${BASE}/cars/${make.slug}/${mo.slug}`, lastModified: d.models.get(key), changeFrequency: 'weekly', priority: 0.9 });
    }
    makes.push({
      url: `${BASE}/cars/${make.slug}`,
      lastModified: maxDate(...own.map(({ key }) => d.models.get(key))),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  const compare: MetadataRoute.Sitemap = resolvePairs(d.makes, [
    ...curatedPairs(d.makes).map((p) => [p.a.key, p.b.key] as const),
    ...NET_ORGANIC_COMPARE_PAIRS,
  ]).map((p) => ({
    url: `${BASE}${p.path}`,
    lastModified: maxDate(d.models.get(p.a.key), d.models.get(p.b.key)),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const datedStatic: Record<string, string | undefined> = {
    '': catalogueLatest, '/cars': catalogueLatest, '/cars/compare': catalogueLatest, '/rankings': catalogueLatest, '/news': d.newsLatest,
  };
  const statics: MetadataRoute.Sitemap = STATIC_PAGES.map((s) => ({
    url: `${BASE}${s.path}`, lastModified: datedStatic[s.path], changeFrequency: s.changeFrequency, priority: s.priority,
  }));

  return { static: statics, makes, models, compare };
}

export async function enSitemapIndex(): Promise<{ url: string; lastModified?: string }[]> {
  const all = enEntries(await loadEnData());
  return EN_CHILD_SITEMAPS.map((name) => ({
    url: `${EN_BASE}/sitemaps/${name}.xml`,
    lastModified: maxDate(...all[name].map((e) => e.lastModified as string | undefined)),
  }));
}

export async function enChildSitemap(name: EnChildSitemap): Promise<MetadataRoute.Sitemap> {
  return enEntries(await loadEnData())[name];
}

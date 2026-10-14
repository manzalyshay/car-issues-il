/**
 * Sitemap entries, split by page type. Served as /sitemaps/sitemap/{section}.xml and
 * listed by the /sitemap.xml index. Indexability comes from lib/seoIndexing, so every
 * URL listed here is one whose page renders `index`.
 */
import type { MetadataRoute } from 'next';
import { getAllMakes } from './carsDb';
import { dbAll } from './db';
import { getLatestNews } from './carNews';
import { getBaseUrl } from './hostLocale';
import { getComparePolicy, getModelYearIndexability } from './seoIndexing';
import { newsPath } from './newsSlug';

export const SITEMAP_SECTIONS = ['static', 'models', 'issues', 'years', 'trims', 'compare', 'news'] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];
type Sections = Record<SitemapSection, MetadataRoute.Sitemap>;

/**
 * D1 timestamps come as 'YYYY-MM-DD HH:MM:SS' (UTC, also what the queries' datetime()
 * normalizes mixed formats to) or ISO strings (car_news.published_at).
 */
function parseUtc(v: string | null | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? `${v.replace(' ', 'T')}Z` : v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function latest(...dates: (Date | undefined)[]): Date | undefined {
  let best: Date | undefined;
  for (const d of dates) if (d && (!best || d > best)) best = d;
  return best;
}

export function sectionLastModified(entries: MetadataRoute.Sitemap): Date | undefined {
  return latest(...entries.map((e) => (e.lastModified ? new Date(e.lastModified) : undefined)));
}

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Newest owner review / expert review / known-issue per key, from MAX(datetime(col)) rows. */
function lastModMap(...rowSets: { k: string; ts: string | null }[][]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const rows of rowSets) {
    for (const { k, ts } of rows) {
      const d = parseUtc(ts);
      const prev = map.get(k);
      if (d && (!prev || d > prev)) map.set(k, d);
    }
  }
  return map;
}

async function buildSections(locale: 'en' | 'he'): Promise<Sections> {
  const BASE = getBaseUrl(locale);
  const [makes, isYearIndexable, comparePolicy, news, trims, reviewRows, expertRows, issueRows] = await Promise.all([
    getAllMakes(),
    getModelYearIndexability(),
    getComparePolicy(),
    getLatestNews(1000, 0, locale),
    dbAll<{ make_slug: string; model_slug: string; name: string }>(
      'SELECT DISTINCT make_slug, model_slug, name FROM car_trims WHERE is_israel = 1',
    ),
    dbAll<{ make_slug: string; model_slug: string; year: number; ts: string | null }>(
      'SELECT make_slug, model_slug, year, MAX(datetime(created_at)) AS ts FROM reviews GROUP BY make_slug, model_slug, year',
    ),
    dbAll<{ make_slug: string; model_slug: string; year: number | null; ts: string | null }>(
      'SELECT make_slug, model_slug, year, MAX(datetime(scraped_at)) AS ts FROM expert_reviews GROUP BY make_slug, model_slug, year',
    ),
    dbAll<{ make_slug: string; model_slug: string; ts: string | null }>(
      'SELECT make_slug, model_slug, MAX(datetime(scraped_at)) AS ts FROM known_issues GROUP BY make_slug, model_slug',
    ).catch(() => []), // table is populated by a scraper and may be missing on fresh DBs
  ]);
  if (makes.length === 0) throw new Error('sitemap: no makes loaded');

  const modelKey = (r: { make_slug: string; model_slug: string }) => `${r.make_slug}/${r.model_slug}`;
  const yearKey = (r: { make_slug: string; model_slug: string; year: number | null }) => `${modelKey(r)}/${r.year}`;
  const modelMod = lastModMap(
    reviewRows.map((r) => ({ k: modelKey(r), ts: r.ts })),
    expertRows.map((r) => ({ k: modelKey(r), ts: r.ts })),
  );
  const yearMod = lastModMap(
    reviewRows.map((r) => ({ k: yearKey(r), ts: r.ts })),
    expertRows.filter((r) => r.year != null).map((r) => ({ k: yearKey(r), ts: r.ts })),
  );
  const issuesMod = lastModMap(issueRows.map((r) => ({ k: modelKey(r), ts: r.ts })));
  const makeMod = (slug: string) =>
    latest(...makes.find((m) => m.slug === slug)!.models.map((mo) => modelMod.get(`${slug}/${mo.slug}`)));

  const models: MetadataRoute.Sitemap = makes.flatMap((make) => [
    { url: `${BASE}/cars/${make.slug}`, lastModified: makeMod(make.slug), changeFrequency: 'weekly' as const, priority: 0.8 },
    ...make.models.map((model) => ({
      url: `${BASE}/cars/${make.slug}/${model.slug}`,
      lastModified: modelMod.get(`${make.slug}/${model.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ]);

  const issues: MetadataRoute.Sitemap = makes.flatMap((make) =>
    make.models.map((model) => {
      const k = `${make.slug}/${model.slug}`;
      return {
        url: `${BASE}/cars/${k}/issues`,
        lastModified: latest(modelMod.get(k), issuesMod.get(k)),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      };
    }),
  );

  const years: MetadataRoute.Sitemap = makes.flatMap((make) =>
    make.models.flatMap((model) =>
      (model.years ?? [])
        .filter((year) => isYearIndexable(make.slug, model.slug, year, model.years))
        .map((year) => ({
          url: `${BASE}/cars/${make.slug}/${model.slug}/${year}`,
          lastModified: yearMod.get(`${make.slug}/${model.slug}/${year}`),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })),
    ),
  );

  // car_trims has no timestamp column, so trim URLs carry no lastmod.
  const knownModels = new Set(makes.flatMap((m) => m.models.map((mo) => `${m.slug}/${mo.slug}`)));
  const trimUrls = new Set<string>();
  for (const t of trims) {
    const slug = toTrimSlug(t.name);
    if (slug && knownModels.has(modelKey(t))) trimUrls.add(`${BASE}/cars/${modelKey(t)}/trim/${slug}`);
  }
  const trimEntries: MetadataRoute.Sitemap = [...trimUrls].map((url) => ({
    url,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const compare: MetadataRoute.Sitemap = comparePolicy.pairs().map(([a, b]) => ({
    url: `${BASE}/cars/compare/${a}/${b}`,
    lastModified: latest(modelMod.get(a), modelMod.get(b)),
    changeFrequency: 'weekly' as const,
    priority: 0.65,
  }));

  const newsEntries: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${BASE}${newsPath(n)}`,
    lastModified: parseUtc(n.published_at) ?? parseUtc(n.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const contentMod = latest(...modelMod.values());
  const newsMod = sectionLastModified(newsEntries);
  const staticEntries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: latest(contentMod, newsMod), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/news`, lastModified: newsMod, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/cars`, lastModified: contentMod, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/cars/compare`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/embed`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/rankings`, lastModified: contentMod, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/repairs`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/tco`, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${BASE}/vehicle-lookup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/accessibility`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  return { static: staticEntries, models, issues, years, trims: trimEntries, compare, news: newsEntries };
}

// The index and each child sitemap are separate requests; share one build per locale.
const _cache = new Map<string, { at: number; value: Promise<Sections> }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function getSitemapSections(locale: 'en' | 'he'): Promise<Sections> {
  const hit = _cache.get(locale);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = buildSections(locale);
  _cache.set(locale, { at: Date.now(), value });
  value.catch(() => _cache.delete(locale)); // don't cache failures
  return value;
}

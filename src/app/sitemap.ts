import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getAllMakes } from '@/lib/carsDb';
import { dbAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

const HE_BASE = 'https://carissues.co.il';
const EN_BASE = 'https://carissues.net';

function isEnHost(h: string) {
  return h === 'carissues.net' || h === 'www.carissues.net' || h.startsWith('en.');
}

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? '';
  const BASE = isEnHost(host) ? EN_BASE : HE_BASE;
  const isEn = isEnHost(host);
  const makes = await getAllMakes().catch(() => []);

  const makeUrls = makes.map((make) => ({
    url: `${BASE}/cars/${make.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const modelUrls = makes.flatMap((make) =>
    make.models.map((model) => ({
      url: `${BASE}/cars/${make.slug}/${model.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }))
  );

  const issuesUrls = makes.flatMap((make) =>
    make.models.map((model) => ({
      url: `${BASE}/cars/${make.slug}/${model.slug}/issues`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  );

  // On the English site, only include year pages that have expert reviews —
  // bare year pages with no content waste crawl budget and hurt quality signals.
  let yearUrls: MetadataRoute.Sitemap;
  if (isEn) {
    const expertRows = await dbAll<{ make_slug: string; model_slug: string; year: number }>(
      'SELECT DISTINCT make_slug, model_slug, year FROM expert_reviews WHERE year IS NOT NULL',
    ).catch(() => []);
    const expertSet = new Set(expertRows.map((r) => `${r.make_slug}/${r.model_slug}/${r.year}`));
    yearUrls = makes.flatMap((make) =>
      make.models.flatMap((model) =>
        (model.years ?? [])
          .filter((year) => expertSet.has(`${make.slug}/${model.slug}/${year}`))
          .map((year) => ({
            url: `${BASE}/cars/${make.slug}/${model.slug}/${year}`,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
      )
    );
  } else {
    yearUrls = makes.flatMap((make) =>
      make.models.flatMap((model) =>
        (model.years ?? []).map((year) => ({
          url: `${BASE}/cars/${make.slug}/${model.slug}/${year}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      )
    );
  }

  // Trim pages
  const trims = await dbAll<{ make_slug: string; model_slug: string; name: string }>(
    'SELECT make_slug, model_slug, name FROM car_trims',
  ).catch(() => []);
  const trimUrls: MetadataRoute.Sitemap = trims.map((t) => ({
    url: `${BASE}/cars/${t.make_slug}/${t.model_slug}/trim/${toTrimSlug(t.name)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  // Compare pages: include on Hebrew site always; on English site include only pairs
  // where at least one model has an expert review (ensures content quality, not thin stubs).
  const compareUrls: MetadataRoute.Sitemap = [];
  {
    const expertRows = isEn
      ? await dbAll<{ make_slug: string; model_slug: string }>(
          'SELECT DISTINCT make_slug, model_slug FROM expert_reviews',
        ).catch(() => [])
      : [];
    const expertSet = new Set(expertRows.map((r) => `${r.make_slug}/${r.model_slug}`));

    const flat = makes.flatMap((m) =>
      m.models.map((mo) => ({ make: m.slug, model: mo.slug, category: mo.category }))
    );
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        if (flat[i].category !== flat[j].category) continue;
        const key1 = `${flat[i].make}/${flat[i].model}`;
        const key2 = `${flat[j].make}/${flat[j].model}`;
        // On English site, only include if at least one car has an expert review
        if (isEn && !expertSet.has(key1) && !expertSet.has(key2)) continue;
        const [c1, c2] = [key1, key2].sort();
        compareUrls.push({
          url: `${BASE}/cars/compare/${c1}/${c2}`,
          changeFrequency: 'weekly' as const,
          priority: 0.65,
        });
      }
    }
  }

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/cars`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/cars/compare`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/embed`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/rankings`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/repairs`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/tco`, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${BASE}/vehicle-lookup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: 'monthly', priority: 0.2 },
    ...makeUrls,
    ...modelUrls,
    ...issuesUrls,
    ...yearUrls,
    ...trimUrls,
    ...compareUrls,
  ];
}

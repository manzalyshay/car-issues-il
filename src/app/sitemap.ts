import type { MetadataRoute } from 'next';
import { getAllMakes } from '@/lib/carsDb';
import { getServiceClient } from '@/lib/adminAuth';

const BASE = 'https://carissues.co.il';

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const makes = await getAllMakes();
  const db = getServiceClient();

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

  const yearUrls = makes.flatMap((make) =>
    make.models.flatMap((model) =>
      (model.years ?? []).map((year) => ({
        url: `${BASE}/cars/${make.slug}/${model.slug}/${year}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    )
  );

  // Trim pages
  const { data: trims } = await db
    .from('car_trims')
    .select('make_slug, model_slug, name');
  const trimUrls: MetadataRoute.Sitemap = (trims ?? []).map((t) => ({
    url: `${BASE}/cars/${t.make_slug}/${t.model_slug}/trim/${toTrimSlug(t.name)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  // Same-category compare pairs only (reduces 24k → ~7k URLs)
  const flat = makes.flatMap((m) =>
    m.models.map((mo) => ({ make: m.slug, model: mo.slug, category: mo.category }))
  );
  const compareUrls: MetadataRoute.Sitemap = [];
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i].category !== flat[j].category) continue;
      const [c1, c2] = [`${flat[i].make}/${flat[i].model}`, `${flat[j].make}/${flat[j].model}`].sort();
      compareUrls.push({
        url: `${BASE}/cars/compare/${c1}/${c2}`,
        changeFrequency: 'weekly' as const,
        priority: 0.65,
      });
    }
  }

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/cars`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/rankings`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/repairs`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/tco`, changeFrequency: 'monthly', priority: 0.75 },
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

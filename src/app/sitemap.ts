import type { MetadataRoute } from 'next';
import { getAllMakes } from '@/lib/carsDb';

const BASE = 'https://carissues.co.il';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const makes = await getAllMakes();

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

  const yearUrls = makes.flatMap((make) =>
    make.models.flatMap((model) =>
      (model.years ?? []).map((year) => ({
        url: `${BASE}/cars/${make.slug}/${model.slug}/${year}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    )
  );

  // Top compare pairs (same-make comparisons + most popular cross-make, cap at 300)
  const flat = makes.flatMap((m) => m.models.map((mo) => ({ make: m.slug, model: mo.slug })));
  const compareUrls: MetadataRoute.Sitemap = [];
  for (let i = 0; i < flat.length && compareUrls.length < 300; i++) {
    for (let j = i + 1; j < flat.length && compareUrls.length < 300; j++) {
      compareUrls.push({
        url: `${BASE}/cars/compare/${flat[i].make}/${flat[i].model}/${flat[j].make}/${flat[j].model}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      });
    }
  }

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/cars`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/rankings`, changeFrequency: 'daily', priority: 0.7 },

    { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: 'monthly', priority: 0.2 },
    ...makeUrls,
    ...modelUrls,
    ...yearUrls,
    ...compareUrls,
  ];
}

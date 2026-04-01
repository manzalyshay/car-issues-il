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

  return [
    { url: BASE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/cars`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/rankings`, changeFrequency: 'daily', priority: 0.7 },
    ...makeUrls,
    ...modelUrls,
  ];
}

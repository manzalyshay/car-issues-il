import type { MetadataRoute } from 'next';
import { getAllMakes } from '@/lib/carsDb';

const BASE_URL = 'https://carissues.co.il';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const carDatabase = await getAllMakes();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/cars`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
  ];

  const makeRoutes: MetadataRoute.Sitemap = carDatabase.map((make) => ({
    url: `${BASE_URL}/cars/${make.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const modelRoutes: MetadataRoute.Sitemap = carDatabase.flatMap((make) =>
    make.models.map((model) => ({
      url: `${BASE_URL}/cars/${make.slug}/${model.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  );

  const yearRoutes: MetadataRoute.Sitemap = carDatabase.flatMap((make) =>
    make.models.flatMap((model) =>
      model.years.map((year) => ({
        url: `${BASE_URL}/cars/${make.slug}/${model.slug}/${year}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
    ),
  );

  return [...staticRoutes, ...makeRoutes, ...modelRoutes, ...yearRoutes];
}

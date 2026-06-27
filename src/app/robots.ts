import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? '';
  const isEn = host === 'carissues.net' || host === 'www.carissues.net' || host.startsWith('en.');
  const base = isEn ? 'https://carissues.net' : 'https://carissues.co.il';
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${base}/sitemap.xml`,
  };
}

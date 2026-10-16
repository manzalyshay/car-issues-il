import { headers } from 'next/headers';
import { enSitemapIndex, heSitemapEntries, isEnHost, sitemapIndexXml, urlsetXml, xmlResponse } from '@/lib/sitemapData';

export const dynamic = 'force-dynamic';

/** co.il: flat urlset of the full catalogue. .net: sitemap index of the child sitemaps under /sitemaps/. */
export async function GET() {
  const host = (await headers()).get('host') ?? '';
  if (isEnHost(host)) return xmlResponse(sitemapIndexXml(await enSitemapIndex()));
  return xmlResponse(urlsetXml(await heSitemapEntries()));
}

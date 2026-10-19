import { headers } from 'next/headers';
import { EN_CHILD_SITEMAPS, enChildSitemap, isEnHost, urlsetXml, xmlResponse, type EnChildSitemap } from '@/lib/sitemapData';

export const dynamic = 'force-dynamic';

/** Child sitemaps of the carissues.net sitemap index (/sitemaps/static.xml, makes.xml, models.xml, compare.xml). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const child = name.replace(/\.xml$/, '') as EnChildSitemap;
  const host = (await headers()).get('host') ?? '';
  if (!isEnHost(host) || !name.endsWith('.xml') || !EN_CHILD_SITEMAPS.includes(child)) {
    return new Response('Not found', { status: 404 });
  }
  return xmlResponse(urlsetXml(await enChildSitemap(child)));
}

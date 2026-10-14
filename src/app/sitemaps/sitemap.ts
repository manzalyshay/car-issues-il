import type { MetadataRoute } from 'next';
import { getHostLocale } from '@/lib/hostLocale';
import { getSitemapSections, SITEMAP_SECTIONS, type SitemapSection } from '@/lib/sitemapData';

// Per-host output (carissues.co.il vs carissues.net) — must render per request
export const dynamic = 'force-dynamic';

// Served at /sitemaps/sitemap/{id}.xml and listed in the /sitemap.xml index
export async function generateSitemaps() {
  return SITEMAP_SECTIONS.map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = (await props.id) as SitemapSection;
  const sections = await getSitemapSections(await getHostLocale());
  return sections[id] ?? [];
}

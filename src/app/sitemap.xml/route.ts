import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getSitemapSections, sectionLastModified, SITEMAP_SECTIONS } from '@/lib/sitemapData';

// Next's generateSitemaps() doesn't emit an index, so /sitemap.xml is a sitemap index
// pointing at the per-type sitemaps under /sitemaps/sitemap/{id}.xml.
export const dynamic = 'force-dynamic';

export async function GET() {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const sections = await getSitemapSections(locale);

  const items = SITEMAP_SECTIONS.map((id) => {
    const lastmod = sectionLastModified(sections[id]);
    return `  <sitemap>
    <loc>${base}/sitemaps/sitemap/${id}.xml</loc>${lastmod ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>` : ''}
  </sitemap>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
}

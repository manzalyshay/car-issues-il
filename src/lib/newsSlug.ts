/**
 * Readable news URLs: /news/{slug-from-english-title}-{first 10 hex of the id}.
 *
 * Article ids are SHA-1 hashes of the source URL. The short id suffix is what we look
 * the article up by, so the slug part can change (e.g. a corrected title) without
 * breaking links — the page 308-redirects any non-canonical form, including the old
 * bare 40-char hash URLs, to the current one. Pure module: safe for client components.
 */

const SHORT_ID_LEN = 10;
const MAX_SLUG_LEN = 70;

export function newsSlug(titleEn: string | null | undefined): string {
  const slug = (titleEn ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return 'car-news';
  if (slug.length <= MAX_SLUG_LEN) return slug;
  const cut = slug.slice(0, MAX_SLUG_LEN);
  const lastDash = cut.lastIndexOf('-');
  return lastDash > 20 ? cut.slice(0, lastDash) : cut;
}

/** The URL segment after /news/ for an article. */
export function newsSegment(item: { id: string; title_en: string | null }): string {
  return `${newsSlug(item.title_en)}-${item.id.slice(0, SHORT_ID_LEN)}`;
}

export function newsPath(item: { id: string; title_en: string | null }): string {
  return `/news/${newsSegment(item)}`;
}

/**
 * Parse a /news/[id] segment. Returns the full id for legacy hash URLs, or the short
 * id prefix for slug URLs; null when the segment matches neither.
 */
export function parseNewsSegment(segment: string): { fullId: string } | { idPrefix: string } | null {
  const s = decodeURIComponent(segment).toLowerCase();
  if (/^[0-9a-f]{40}$/.test(s)) return { fullId: s };
  const m = s.match(new RegExp(`(?:^|-)([0-9a-f]{${SHORT_ID_LEN}})$`));
  return m ? { idPrefix: m[1] } : null;
}

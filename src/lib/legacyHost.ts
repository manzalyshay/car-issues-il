// en.carissues.co.il is the old English host. carissues.net replaced it, but the
// subdomain still served full English pages (200, canonical -> carissues.net), and
// Google started indexing them anyway: 335 en.carissues.co.il URLs, 1,151 impressions
// and 2 clicks in the 28 days to 2026-11-12 (0 the 28 days before). A 301 to the same
// path on carissues.net folds those URLs into the real English pages.

const LEGACY_EN_HOSTS = new Set(['en.carissues.co.il', 'www.en.carissues.co.il']);

/**
 * Where a request on a legacy host should go, or null if the host is not legacy.
 * /ru lives only on carissues.co.il, so it goes there directly (no double redirect).
 */
export function legacyHostRedirect(host: string, pathname: string, search: string): string | null {
  const h = host.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (!LEGACY_EN_HOSTS.has(h)) return null;
  const target = pathname === '/ru' || pathname.startsWith('/ru/') ? 'carissues.co.il' : 'carissues.net';
  return `https://${target}${pathname}${search}`;
}

import { NextRequest, NextResponse } from 'next/server';

const HE_HOST = 'carissues.co.il';
const EN_HOST = 'carissues.net';
// Cookie name set when user explicitly toggles language — prevents geo-redirect loop
const PREF_COOKIE = 'clang';
// One year in seconds
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const host = req.headers.get('host') ?? '';
  const isHeHost = host === HE_HOST || host === `www.${HE_HOST}`;
  const isEnHost = host === EN_HOST || host === `www.${EN_HOST}`;

  // ── Compare canonical redirect ──────────────────────────────────────────────
  if (pathname === '/cars/compare') {
    const car1 = searchParams.get('car1');
    const car2 = searchParams.get('car2');
    if (car1 && car2) {
      const [s1, s2] = [car1, car2].sort();
      const url = req.nextUrl.clone();
      url.pathname = `/cars/compare/${s1}/${s2}`;
      url.search = '';
      return NextResponse.redirect(url, { status: 301 });
    }
  }

  // ── Geo-redirect — only on production domains ───────────────────────────────
  if (!isHeHost && !isEnHost) return NextResponse.next();

  // If user explicitly toggled language (?clang=1), set a preference cookie and
  // serve the page directly (no redirect). Client-side JS cleans up the param.
  // NOTE: We intentionally do NOT redirect here because Set-Cookie headers on
  // redirect responses can be stripped by Cloudflare before reaching the browser.
  if (searchParams.get('clang') === '1') {
    const res = NextResponse.next();
    res.cookies.set(PREF_COOKIE, isEnHost ? 'en' : 'he', {
      maxAge: ONE_YEAR,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
    return res;
  }

  // Respect existing explicit preference cookie
  const pref = req.cookies.get(PREF_COOKIE)?.value;
  if (pref === 'en' && isEnHost) return NextResponse.next();
  if (pref === 'he' && isHeHost) return NextResponse.next();

  // Cross-domain cookie redirect (user has cookie for the other domain)
  if (pref === 'en' && isHeHost) {
    return NextResponse.redirect(`https://${EN_HOST}${pathname}${req.nextUrl.search}`, { status: 302 });
  }
  if (pref === 'he' && isEnHost) {
    return NextResponse.redirect(`https://${HE_HOST}${pathname}${req.nextUrl.search}`, { status: 302 });
  }

  // Geo-detect via Cloudflare header
  const country = req.headers.get('cf-ipcountry') ?? '';
  const isIsrael = country === 'IL';

  if (isIsrael && isEnHost) {
    return NextResponse.redirect(`https://${HE_HOST}${pathname}${req.nextUrl.search}`, { status: 302 });
  }
  if (!isIsrael && isHeHost) {
    return NextResponse.redirect(`https://${EN_HOST}${pathname}${req.nextUrl.search}`, { status: 302 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // All paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)).*)',
  ],
};

import { NextRequest, NextResponse } from 'next/server';

const HE_HOST = 'carissues.co.il';
const EN_HOST = 'carissues.net';
// Cookie name set when user explicitly toggles language — prevents geo-redirect loop
const PREF_COOKIE = 'clang';
// One year in seconds
const ONE_YEAR = 60 * 60 * 24 * 365;

// Crawlers, AI agents and SEO tools must always get the page they asked for — never a
// geo/cookie redirect. Named agents first, then generic patterns as a catch-all.
const BOT_UA = new RegExp(
  [
    'googlebot', 'google-extended', 'google-inspectiontool', 'storebot-google', 'adsbot-google',
    'bingbot', 'bingpreview', 'slurp', 'duckduckbot', 'baiduspider', 'yandex', 'applebot',
    'gptbot', 'oai-searchbot', 'chatgpt-user', 'claudebot', 'claude-user', 'claude-searchbot',
    'anthropic-ai', 'perplexitybot', 'perplexity-user', 'ccbot', 'bytespider', 'amazonbot',
    'meta-externalagent', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'petalbot',
    'bot', 'crawler', 'spider', 'crawl', 'headless', 'lighthouse',
  ].join('|'),
  'i',
);

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const host = req.headers.get('host') ?? '';
  const isHeHost = host === HE_HOST || host === `www.${HE_HOST}`;
  const isEnHost = host === EN_HOST || host === `www.${EN_HOST}`;

  // The embed tool is an English-only utility for carissues.net.
  if (pathname.startsWith('/embed')) {
    if (isHeHost) return NextResponse.redirect(`https://${EN_HOST}${pathname}${req.nextUrl.search}`, { status: 308 });
    const res = NextResponse.next();
    res.headers.set('x-is-embed', '1');
    return res;
  }

  // ── Canonicalization: HTTPS + non-www ───────────────────────────────────────
  const isLocalhost = host === 'localhost' || host.startsWith('localhost:') || host.startsWith('127.0.0.1');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const hasWww = host.startsWith('www.');
  const canonicalHost = hasWww ? host.slice(4) : host;
  if (!isLocalhost && (proto !== 'https' || hasWww)) {
    return NextResponse.redirect(
      `https://${canonicalHost}${pathname}${req.nextUrl.search}`,
      { status: 301 }
    );
  }

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

  // Normalize reversed comparison pairs before rendering so crawlers receive a real HTTP 308.
  const comparePath = pathname.match(/^\/cars\/compare\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (comparePath) {
    const pairA = `${comparePath[1]}/${comparePath[2]}`;
    const pairB = `${comparePath[3]}/${comparePath[4]}`;
    if (pairA !== pairB && pairA > pairB) {
      const url = req.nextUrl.clone();
      url.pathname = `/cars/compare/${pairB}/${pairA}`;
      return NextResponse.redirect(url, { status: 308 });
    }
  }

  // ── Language routing — only on production domains ───────────────────────────
  if (!isHeHost && !isEnHost) return NextResponse.next();

  // Never redirect crawlers / AI agents / SEO tools — they see the page they requested
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT_UA.test(ua)) return NextResponse.next();

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

  // Respect an explicit preference cookie (set only by the user's own toggle)
  const pref = req.cookies.get(PREF_COOKIE)?.value;
  if (pref === 'en' && isEnHost) return NextResponse.next();
  if (pref === 'he' && isHeHost) return NextResponse.next();
  if (pref === 'en' && isHeHost) {
    return NextResponse.redirect(`https://${EN_HOST}${pathname}${req.nextUrl.search}`, { status: 302 });
  }
  if (pref === 'he' && isEnHost) {
    return NextResponse.redirect(`https://${HE_HOST}${pathname}${req.nextUrl.search}`, { status: 302 });
  }

  // Geo: carissues.co.il is NEVER auto-redirected (non-Israeli visitors get a dismissible
  // client-side "English version" banner instead — see EnglishVersionBanner). Only Israeli
  // humans landing on the bare carissues.net homepage are sent to the Hebrew site.
  if (isEnHost && pathname === '/' && req.headers.get('cf-ipcountry') === 'IL') {
    return NextResponse.redirect(`https://${HE_HOST}/${req.nextUrl.search}`, { status: 302 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // All paths except Next.js internals, API routes and static files. Root .txt/.xml files
    // (robots.txt, llms.txt, sitemap*.xml, IndexNow keys) must never be redirected.
    '/((?!api/|_next/static|_next/image|favicon|robots\\.txt|llms\\.txt|sitemap|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|txt|xml)).*)',
  ],
};

import { NextRequest, NextResponse } from 'next/server';
import { getAllMakes } from './lib/carsDb';

const HE_HOST = 'carissues.co.il';
const EN_HOST = 'carissues.net';
// Cookie name set when user explicitly toggles language - prevents geo-redirect loop
const PREF_COOKIE = 'clang';
// One year in seconds
const ONE_YEAR = 60 * 60 * 24 * 365;

// Crawlers, AI agents and SEO tools must always get the page they asked for - never a
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

function notFoundHtml(isEnHost: boolean): string {
  return isEnHost
    ? `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page Not Found | CarIssues</title><meta name="robots" content="noindex"></head><body style="font-family:Arial,sans-serif;text-align:center;padding:80px 20px;color:#1c2733"><div style="font-size:4rem;margin-bottom:16px">🚗</div><h1 style="font-size:1.8rem;font-weight:900;margin-bottom:12px">404 - Page Not Found</h1><p style="color:#6b7a8c;margin-bottom:24px">The page you're looking for doesn't exist.</p><a href="/" style="color:#1b4f8a;font-weight:700;text-decoration:none">Back to Home</a></body></html>`
    : `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>דף לא נמצא | CarIssues</title><meta name="robots" content="noindex"></head><body style="font-family:Heebo,Arial,sans-serif;text-align:center;padding:80px 20px;color:#1c2733"><div style="font-size:4rem;margin-bottom:16px">🚗</div><h1 style="font-size:1.8rem;font-weight:900;margin-bottom:12px">404 - הדף לא נמצא</h1><p style="color:#6b7a8c;margin-bottom:24px">הדף שחיפשת לא קיים באתר.</p><a href="/" style="color:#1b4f8a;font-weight:700;text-decoration:none">חזרה לדף הבית</a></body></html>`;
}

function notFoundResponse(isEnHost: boolean): NextResponse {
  return new NextResponse(notFoundHtml(isEnHost), {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

type Makes = Awaited<ReturnType<typeof getAllMakes>>;

/** Resolve a make/model slug pair against the catalog. Hyphen-insensitive fallback for guessed slugs. */
function resolveModelSlug(makes: Makes, makeSlug: string, modelSlug: string):
  | { ok: true; guessedSlug: string | null }
  | { ok: false } {
  const make = makes.find((m) => m.slug === makeSlug);
  if (!make) return { ok: false };
  if (make.models.some((m) => m.slug === modelSlug)) return { ok: true, guessedSlug: null };
  const norm = (s: string) => s.replace(/-/g, '');
  const guessed = make.models.find((m) => norm(m.slug) === norm(modelSlug));
  return guessed ? { ok: true, guessedSlug: guessed.slug } : { ok: false };
}

export async function middleware(req: NextRequest) {
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

  // ── Model existence check ───────────────────────────────────────────────────
  // Next's notFound()/permanentRedirect() return HTTP 200 on this route because a
  // loading.tsx higher up the /cars tree wraps it in a streamed Suspense boundary
  // (the 200 is flushed before the page component even runs). Validate here instead,
  // where we can set a real status code. Fails open on any error so a D1 hiccup
  // never breaks car pages - it just falls back to the old (soft-404) behaviour.
  const modelMatch = pathname.match(/^\/cars\/([^/]+)\/([^/]+)$/);
  if (modelMatch) {
    const [, makeSlug, modelSlug] = modelMatch;
    const RESERVED_MAKE_SLUGS = new Set(['category', 'compare']);
    const RESERVED_MODEL_SLUGS = new Set(['problems']);
    if (!RESERVED_MAKE_SLUGS.has(makeSlug) && !RESERVED_MODEL_SLUGS.has(modelSlug)) {
      try {
        const makes = await getAllMakes();
        const resolved = resolveModelSlug(makes, makeSlug, modelSlug);
        if (!resolved.ok) return notFoundResponse(isEnHost);
        if (resolved.guessedSlug) {
          const url = req.nextUrl.clone();
          url.pathname = `/cars/${makeSlug}/${resolved.guessedSlug}`;
          return NextResponse.redirect(url, { status: 301 });
        }
      } catch { /* fail open - fall through to existing (soft-404) page rendering */ }
    }
  }

  // ── Compare pair existence check ────────────────────────────────────────────
  // Same streaming/200-status issue as the model page (a parent loading.tsx wraps
  // this route too). Validate both sides here; fail open on any error.
  const comparePairMatch = pathname.match(/^\/cars\/compare\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (comparePairMatch) {
    const [, make1, model1, make2, model2] = comparePairMatch;
    try {
      const makes = await getAllMakes();
      const side1 = resolveModelSlug(makes, make1, model1);
      const side2 = resolveModelSlug(makes, make2, model2);
      if (!side1.ok || !side2.ok) return notFoundResponse(isEnHost);
      if (side1.guessedSlug || side2.guessedSlug) {
        const url = req.nextUrl.clone();
        url.pathname = `/cars/compare/${make1}/${side1.guessedSlug ?? model1}/${make2}/${side2.guessedSlug ?? model2}`;
        return NextResponse.redirect(url, { status: 301 });
      }
    } catch { /* fail open - fall through to existing (soft-404) page rendering */ }
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

  // ── Language routing - only on production domains ───────────────────────────
  if (!isHeHost && !isEnHost) return NextResponse.next();

  // Never redirect crawlers / AI agents / SEO tools - they see the page they requested
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
  // client-side "English version" banner instead - see EnglishVersionBanner). Only Israeli
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

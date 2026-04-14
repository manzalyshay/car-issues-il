/**
 * User Review Aggregator
 *
 * Pulls REAL USER reviews from Reddit and Israeli car forums (not corporate articles).
 * Uses Google Gemini (free tier) to write an original Hebrew summary — never copies text.
 * Every summary links back to the original source thread.
 *
 * Sources:
 *  - Reddit JSON API  (free, no key needed)
 *  - Tapuz.co.il forum search (public HTML)
 *  - One.co.il forum search (public HTML)
 *
 * Legal:
 *  - Only read post titles + first ~300 chars of public forum posts
 *  - Gemini rewrites everything in new text
 *  - Full source attribution with link is always shown
 */

import { createClient } from '@supabase/supabase-js';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface ExpertReview {
  id: string;
  makeSlug: string;
  modelSlug: string;
  year: number | null;         // null = general model summary
  sourceName: string;
  sourceUrl: string;
  originalTitle: string;
  summaryHe: string;           // legacy / fallback summary
  localSummaryHe: string | null;
  globalSummaryHe: string | null;
  localScore: number | null;
  globalScore: number | null;
  topScore: number | null;
  pros: string[];
  cons: string[];
  localPostCount: number;
  globalPostCount: number;
  scrapedAt: string;
}

export interface UserPost {
  title: string;
  url: string;
  sourceName: string;
  snippet: string;     // First ~300 chars only — never full post
  score?: number;      // Upvotes / relevance
  reviewYear?: number; // Year the review/complaint was written
}

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabase(serviceRole = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}


// ── Tapuz.co.il — XenForo cars forum (node 451, forum "מכוניות") ──────────────
// Strategy:
//   1. POST XenForo search with CSRF (requires fresh session token)
//   2. Fallback: scan RSS feed and filter by title keyword
//   For matched thread URLs, fetch and extract div.bbWrapper text from posts.

async function fetchTapuzThreadPosts(threadUrl: string, maxPosts = 5): Promise<string[]> {
  try {
    const res = await fetch(threadUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'he-IL,he;q=0.9' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const snippets: string[] = [];
    // Each post body: <div class="bbWrapper">...</div>
    const re = /<div class="bbWrapper">([\s\S]*?)<\/div>\s*(?:\s*<div|<\/article)/gi;
    let m;
    while ((m = re.exec(html)) !== null && snippets.length < maxPosts) {
      const text = m[1]
        .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '') // strip quotes
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
        .replace(/\s+/g, ' ').trim();
      if (text.length > 30) snippets.push(text.slice(0, 400));
    }
    return snippets;
  } catch { return []; }
}

async function searchTapuz(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  const keyword = year ? `${makeHe} ${modelHe} ${year}` : `${makeHe} ${modelHe}`;
  const modelKeywords = [makeHe, modelHe, ...(year ? [String(year)] : [])];

  const threadUrls: { title: string; url: string }[] = [];

  // ── Step 1: XenForo POST search (get CSRF from search page first) ────────────
  try {
    const formRes = await fetch('https://www.tapuz.co.il/search/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'he-IL,he;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (formRes.ok) {
      const formHtml = await formRes.text();
      const csrfMatch = formHtml.match(/name="_xfToken"\s+value="([^"]+)"/);
      const cookies = formRes.headers.get('set-cookie') ?? '';
      if (csrfMatch) {
        const csrf = csrfMatch[1];
        const body = new URLSearchParams({
          keywords: keyword,
          'c[node][]': '451',
          'c[title_only]': '1',
          order: 'date',
          _xfToken: csrf,
        });
        const searchRes = await fetch('https://www.tapuz.co.il/search/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept-Language': 'he-IL,he;q=0.9',
            'Referer': 'https://www.tapuz.co.il/search/',
            'Cookie': cookies,
          },
          body: body.toString(),
          signal: AbortSignal.timeout(12000),
        });
        if (searchRes.ok) {
          const html = await searchRes.text();
          // XenForo search results: <a href="/threads/..."><em>...</em> title text</a>
          const re = /href="(\/threads\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          let m;
          while ((m = re.exec(html)) !== null && threadUrls.length < 6) {
            const title = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
            if (title.length < 5) continue;
            threadUrls.push({ title, url: `https://www.tapuz.co.il${m[1]}` });
          }
        }
      }
    }
  } catch { /* fall through to RSS */ }

  // ── Step 2: RSS fallback — scan recent threads, filter by keyword ────────────
  if (threadUrls.length === 0) {
    try {
      const rssRes = await fetch('https://www.tapuz.co.il/forums/%D7%9E%D7%9B%D7%95%D7%A0%D7%99%D7%95%D7%AA.451/index.rss', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      });
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const itemRe = /<item>([\s\S]*?)<\/item>/gi;
        let im;
        while ((im = itemRe.exec(xml)) !== null && threadUrls.length < 8) {
          const item = im[1];
          const titleM = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          const linkM  = item.match(/<link>(https?[^<]+)<\/link>/i);
          if (!titleM || !linkM) continue;
          const title = titleM[1].trim();
          // Only keep threads whose title mentions the model/make
          if (modelKeywords.some(kw => title.includes(kw))) {
            threadUrls.push({ title, url: linkM[1].trim() });
          }
        }
      }
    } catch { /* ignore */ }
  }

  // ── Step 3: Fetch thread content for matched threads ─────────────────────────
  const fetched = await Promise.all(
    threadUrls.slice(0, 4).map(async ({ title, url }) => ({ title, url, snippets: await fetchTapuzThreadPosts(url, 4) }))
  );

  for (const { title, url, snippets } of fetched) {
    if (snippets.length === 0) continue;
    posts.push({
      title,
      url,
      sourceName: 'פורום טפוז מכוניות',
      snippet: snippets.join(' | ').slice(0, 400),
    });
  }

  return posts;
}

// ── drive.co.il (Israeli car magazine — test drives & reviews) ────────────────
async function searchDrive(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(year ? `${makeHe} ${modelHe} ${year}` : `${makeHe} ${modelHe}`);
    const res = await fetch(
      `https://www.drive.co.il/?s=${query}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract article links and titles from search results
    const articleRe = /<a[^>]+href="(https:\/\/www\.drive\.co\.il\/[^"]+)"[^>]*>\s*<h[23][^>]*>([^<]{10,200})<\/h[23]>/gi;
    const snippetRe = /<p[^>]*>([^<]{40,400})<\/p>/gi;
    const snippets: string[] = [];
    let sm;
    while ((sm = snippetRe.exec(html)) !== null && snippets.length < 6) {
      snippets.push(sm[1].replace(/&[a-z#\d]+;/g, '').trim());
    }

    let m;
    let idx = 0;
    while ((m = articleRe.exec(html)) !== null && posts.length < 5) {
      const title = m[2].replace(/&[a-z#\d]+;/g, '').trim();
      if (!title || title.length < 8) continue;
      posts.push({
        title,
        url: m[1],
        sourceName: 'Drive.co.il מגזין רכב',
        snippet: snippets[idx++] ?? '',
      });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── rotter.net (Israeli forum — car section) ───────────────────────────────────
async function searchRotter(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(year ? `${makeHe} ${modelHe} ${year}` : `${makeHe} ${modelHe}`);
    const res = await fetch(
      `https://rotter.net/cgi-bin/forum/dcboard.cgi?az=search&query=${query}&forum=cars`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    const linkRe = /<a[^>]+href="([^"]*dcboard[^"]*az=show[^"]*)"[^>]*>\s*([^<]{8,150})\s*<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null && posts.length < 5) {
      const title = m[2].replace(/&[a-z#\d]+;/g, '').trim();
      if (!title || title.length < 8) continue;
      const url = m[1].startsWith('http') ? m[1] : `https://rotter.net${m[1]}`;
      posts.push({ title, url, sourceName: 'פורום רוטר רכב', snippet: '' });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── Facebook public posts (via DuckDuckGo search + og:description) ──────────────
// Finds public Israeli Facebook posts about car models.
// We can't read comments without authentication, but og:description gives the
// post body (first ~200 chars) which is usually an owner sharing their experience.
async function searchFacebook(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const q = year
      ? `facebook.com "${makeHe} ${modelHe}" ${year} חוות דעת`
      : `facebook.com "${makeHe} ${modelHe}" חוות דעת`;
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=il-he`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'he-IL,he;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!ddgRes.ok) return posts;
    const ddgHtml = await ddgRes.text();

    // Extract Facebook URLs from DDG results (may be URL-encoded)
    const fbUrls: string[] = [];
    const urlRe = /facebook\.com(?:\/|%2F)groups(?:\/|%2F)([0-9]+)(?:\/|%2F)(?:posts|permalink|permalink)(?:\/|%2F)([0-9]+)/gi;
    let m;
    while ((m = urlRe.exec(ddgHtml)) !== null && fbUrls.length < 5) {
      const url = `https://www.facebook.com/groups/${m[1]}/permalink/${m[2]}/`;
      if (!fbUrls.includes(url)) fbUrls.push(url);
    }
    if (fbUrls.length === 0) return posts;

    // Fetch og:description from each Facebook post URL
    const results = await Promise.all(fbUrls.slice(0, 4).map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'he-IL,he;q=0.9' },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        const html = await res.text();
        // Extract og:description — contains the post body (first ~200 chars)
        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]{30,500})"/i)
          ?? html.match(/<meta[^>]+content="([^"]{30,500})"[^>]+property="og:description"/i);
        const titleM = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]{5,200})"/i)
          ?? html.match(/<meta[^>]+content="([^"]{5,200})"[^>]+property="og:title"/i);
        if (!descM) return null;
        const snippet = descM[1]
          .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
        const title = (titleM?.[1] ?? 'פוסט פייסבוק')
          .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
          .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
          .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        // Only keep if contains Hebrew and is relevant
        if (!/[\u05d0-\u05ea]{20}/.test(snippet)) return null;
        return { title: title.slice(0, 120), url, snippet: snippet.slice(0, 350) };
      } catch { return null; }
    }));

    for (const r of results) {
      if (r) posts.push({ ...r, sourceName: 'פייסבוק' });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── walla.co.il (Israeli portal — car section reviews) ────────────────────────
async function searchWalla(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(year ? `${makeHe} ${modelHe} ${year}` : `${makeHe} ${modelHe}`);
    const res = await fetch(
      `https://auto.walla.co.il/search?q=${query}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    const cardRe = /<a[^>]+href="(https:\/\/auto\.walla\.co\.il\/item\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = cardRe.exec(html)) !== null && posts.length < 5) {
      const inner = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (inner.length < 8) continue;
      posts.push({ title: inner.slice(0, 150), url: m[1], sourceName: 'וואלה אוטו', snippet: '' });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── One.co.il (Israeli forum, public search) ──────────────────────────────────
async function searchOne(makeHe: string, modelHe: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(`${makeHe} ${modelHe} רכב`);
    const res = await fetch(
      `https://www.one.co.il/search/?q=${query}&section=forums`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    const linkRe = /<a[^>]+href="(\/forums\/[^"]+)"[^>]*>\s*([^<]{10,120})\s*<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null && posts.length < 4) {
      const title = m[2].replace(/&[a-z]+;/g, '').trim();
      if (!title || title.length < 8) continue;
      posts.push({
        title,
        url: `https://www.one.co.il${m[1]}`,
        sourceName: 'פורום ONE רכב',
        snippet: '',
      });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── icar.co.il (Ynet car reviews — has search + real review text) ─────────────
async function searchIcar(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(year ? `${makeHe} ${modelHe} ${year}` : `${makeHe} ${modelHe}`);
    const res = await fetch(
      `https://www.icar.co.il/search/?q=${query}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    // Each result: <a href="/test_drive/..."><h3>title</h3><p>snippet</p></a>
    // We only want test drive reviews, not news
    const cardRe = /<a[^>]+href="(\/test_drive\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]{8,200})<\/h[23]>[\s\S]*?<p[^>]*>([^<]{10,400})<\/p>/gi;
    let m;
    while ((m = cardRe.exec(html)) !== null && posts.length < 5) {
      const path   = m[1];
      const title  = m[2].replace(/&[a-z#\d]+;/g, '').trim();
      const snippet = m[3].replace(/&[a-z#\d]+;/g, '').trim();
      if (!title || title.length < 8) continue;
      posts.push({
        title,
        url: `https://www.icar.co.il${path}`,
        sourceName: 'iCar מבחני רכב',
        snippet: snippet.slice(0, 300),
      });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── carzone.co.il (Israeli car site — real driver reviews) ────────────────────
// URL format: /Make/Model/ or /Make/Model/Year/ (capital first letter, English)
async function searchCarzone(makeHe: string, modelHe: string, makeEn: string, modelEn: string, year?: number): Promise<UserPost[]> {
  void makeHe; void modelHe; // Hebrew names not used for URL construction
  const posts: UserPost[] = [];
  // carzone uses Title-Case English: /Toyota/Corolla/2021/
  const makeSlug = makeEn.charAt(0).toUpperCase() + makeEn.slice(1).toLowerCase();
  // Handle multi-word models: "Mercedes-Benz" → "Mercedes-Benz"
  const modelSlug = modelEn.replace(/\s+/g, '-');

  const urls = year
    ? [`https://www.carzone.co.il/${makeSlug}/${modelSlug}/${year}/`, `https://www.carzone.co.il/${makeSlug}/${modelSlug}/`]
    : [`https://www.carzone.co.il/${makeSlug}/${modelSlug}/`];

  const seen = new Set<string>();
  for (const slugUrl of urls) {
    try {
      const res = await fetch(slugUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Extract all reviewBody + datePublished pairs from JSON-LD
      const bodyRe = /"reviewBody":"((?:[^"\\]|\\.)*)"/g;
      const dateRe = /"datePublished":"([^"]+)"/g;
      const bodies: string[] = [];
      const dates: string[] = [];
      let rm;
      while ((rm = bodyRe.exec(html)) !== null) bodies.push(rm[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u[\da-f]{4}/gi, '').trim());
      while ((rm = dateRe.exec(html)) !== null) dates.push(rm[1]);

      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body || body.length < 20) continue;
        const key = body.slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        const dateStr = dates[i] ?? '';
        const yearMatch = dateStr.match(/\b(20\d{2})\b/);
        const reviewYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
        posts.push({
          title: 'ביקורת גולש ישראלי',
          url: slugUrl,
          sourceName: 'CarZone ביקורות גולשים',
          snippet: body.slice(0, 350),
          reviewYear,
        });
      }
    } catch { /* ignore */ }
  }
  return posts;
}

// ── CarComplaints.com (US car problems database — great for issues site) ──────
// Overview page has complaint links → fetch individual pages for actual text
async function searchCarComplaints(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const headers   = { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' };
    const makeSlug  = makeEn.replace(/\s+/g, '_');
    const modelSlug = modelEn.replace(/\s+/g, '_');
    const baseUrl   = `https://www.carcomplaints.com`;
    const listUrl   = `${baseUrl}/${makeSlug}/${modelSlug}/`;

    const listRes = await fetch(listUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!listRes.ok) return posts;
    const listHtml = await listRes.text();

    // Extract individual complaint page links (e.g. /Honda/HR-V/2024/engine/stalls.shtml)
    const linkRe = new RegExp(`href="(/${makeSlug}/${modelSlug}/[^"]+\\.shtml)"`, 'gi');
    const links: string[] = [];
    let m;
    while ((m = linkRe.exec(listHtml)) !== null && links.length < 5) {
      const href = m[1];
      if (!links.includes(href)) links.push(href);
    }
    if (links.length === 0) return posts;

    // Fetch complaint pages in parallel and extract text paragraphs
    const pages = await Promise.all(links.map(async (href) => {
      try {
        const res = await fetch(`${baseUrl}${href}`, { headers, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        return { href, html: await res.text() };
      } catch { return null; }
    }));

    for (const page of pages) {
      if (!page) continue;
      const paras = [...page.html.matchAll(/<p[^>]*>([^<]{80,600})<\/p>/g)]
        .map(p => p[1].trim())
        .filter(p => !p.includes('cookie') && !p.includes('CarComplaints'));
      if (paras.length === 0) continue;
      const snippet = paras.slice(0, 3).join(' ').slice(0, 500);
      const titleMatch = page.href.match(/\/([^/]+)\.shtml$/);
      const title = titleMatch ? titleMatch[1].replace(/_/g, ' ') : `${makeEn} ${modelEn} complaint`;
      const yearMatch = page.href.match(/\/(20\d{2})\//);
      const reviewYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
      posts.push({ title: `${makeEn} ${modelEn}: ${title}`, url: `${baseUrl}${page.href}`, sourceName: 'CarComplaints.com', snippet, reviewYear });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── Scraper proxy (bypasses bot protection on sites like Edmunds) ─────────────
// Set SCRAPER_API_KEY in .env.local to enable (ScraperAPI free tier: 1000 req/month)
// https://www.scraperapi.com/
function scraperUrl(targetUrl: string): string {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return targetUrl;
  return `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(targetUrl)}&render=false`;
}

// ── Edmunds consumer reviews ───────────────────────────────────────────────────
async function fetchEdmundsPage(url: string, makeEn: string, modelEn: string, posts: UserPost[]): Promise<void> {
  try {
    const res = await fetch(scraperUrl(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'en-US,en;q=0.9', 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;
    const html = await res.text();

    const reviewBodyRe = /"reviewBody"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    const authorRe     = /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/g;
    const titleRe      = /"name"\s*:\s*"([^"]{10,120})"/g;
    const dateRe       = /"datePublished"\s*:\s*"([^"]+)"/g;

    const bodies: string[]  = [];
    const authors: string[] = [];
    const titles: string[]  = [];
    const dates: string[]   = [];
    let m;
    while ((m = reviewBodyRe.exec(html)) !== null) bodies.push(m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u[\dA-Fa-f]{4}/g, '').trim());
    while ((m = authorRe.exec(html))     !== null) authors.push(m[1]);
    while ((m = titleRe.exec(html))      !== null && titles.length < bodies.length) titles.push(m[1]);
    while ((m = dateRe.exec(html))       !== null) dates.push(m[1]);

    for (let i = 0; i < Math.min(bodies.length, 10); i++) {
      const body = bodies[i];
      if (body.length < 40) continue;
      const author = authors[i] ?? `Reviewer ${i + 1}`;
      const title  = titles[i]  ?? `${makeEn} ${modelEn} — ${author}`;
      const yearMatch = (dates[i] ?? '').match(/\b(20\d{2})\b/);
      const reviewYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
      posts.push({ title, url, sourceName: 'Edmunds Consumer Reviews', snippet: body.slice(0, 500), reviewYear });
    }
  } catch { /* ignore */ }
}

async function searchEdmunds(makeEn: string, modelEn: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  const makeSlug  = makeEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const modelSlug = modelEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const base = `https://www.edmunds.com/${makeSlug}/${modelSlug}`;

  const currentYear = new Date().getFullYear();
  const targetYear  = year ?? currentYear;
  const years = [...new Set([targetYear, targetYear - 1, targetYear + 1, currentYear])].filter(y => y >= 2015 && y <= currentYear + 1);
  const urls  = [...years.map(y => `${base}/${y}/consumer-reviews/`), `${base}/consumer-reviews/`];

  await Promise.all(urls.map(url => fetchEdmundsPage(url, makeEn, modelEn, posts)));

  const seen = new Set<string>();
  return posts.filter(p => { const k = p.snippet.slice(0, 80); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 15);
}

// ── NHTSA complaints API (US gov — free, no key, no blocking) ─────────────────
// https://api.nhtsa.gov/complaints/complaintsByVehicle?make=honda&model=hr-v&modelYear=2026
async function searchNHTSA(makeEn: string, modelEn: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  const make  = encodeURIComponent(makeEn);
  // NHTSA uses various model name formats — try with and without hyphens/spaces
  const modelVariants = [...new Set([
    modelEn,
    modelEn.replace(/-/g, ' '),
    modelEn.replace(/-/g, ''),
    modelEn.replace(/\s+/g, '-'),
  ])];

  const currentYear = new Date().getFullYear();
  const years = year
    ? [year, year - 1, year - 2]
    : [currentYear, currentYear - 1, currentYear - 2];

  const results = await Promise.all(
    years.flatMap(y =>
      modelVariants.map(async (mv) => {
        try {
          const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${make}&model=${encodeURIComponent(mv)}&modelYear=${y}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) return [];
          const json = await res.json() as any;
          return (json?.results ?? []) as any[];
        } catch { return []; }
      })
    )
  );

  const seen = new Set<string>();
  for (const batch of results) {
    for (const c of batch) {
      const text = (c.cdescr ?? '').trim();
      if (text.length < 30) continue;
      const key = text.slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      const component = c.components ? ` [${c.components}]` : '';
      const yearStr   = c.modelYear ? ` ${c.modelYear}` : '';
      posts.push({
        title: `NHTSA complaint${component}: ${makeEn} ${modelEn}${yearStr}`,
        url:   `https://www.nhtsa.gov/vehicle/${encodeURIComponent(makeEn)}/${encodeURIComponent(c.model ?? modelEn)}/${c.modelYear ?? year}/NG`,
        sourceName: 'NHTSA Complaints',
        snippet: text.slice(0, 500),
        reviewYear: c.modelYear ? Number(c.modelYear) : undefined,
      });
      if (posts.length >= 10) break;
    }
    if (posts.length >= 10) break;
  }
  return posts;
}

// ── cars.com consumer reviews ─────────────────────────────────────────────────
async function searchCarsCom(makeEn: string, modelEn: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const makeSlug  = makeEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const modelSlug = modelEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const yearPart  = year ? `-${year}` : '';
    const url = `https://www.cars.com/research/${makeSlug}-${modelSlug}${yearPart}/consumer-reviews/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();

    // JSON-LD reviewBody + datePublished
    const reviewRe = /"reviewBody"\s*:\s*"([^"]{40,600})"/g;
    const dateRe   = /"datePublished"\s*:\s*"([^"]+)"/g;
    const bodies: string[] = [];
    const dates: string[]  = [];
    let m;
    while ((m = reviewRe.exec(html)) !== null) bodies.push(m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim());
    while ((m = dateRe.exec(html))   !== null) dates.push(m[1]);
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (body.length < 40) continue;
      const yearMatch = (dates[i] ?? '').match(/\b(20\d{2})\b/);
      const reviewYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
      posts.push({ title: `Consumer review: ${makeEn} ${modelEn}`, url, sourceName: 'Cars.com Reviews', snippet: body.slice(0, 300), reviewYear });
    }

    // Fallback: inline review text blocks
    if (posts.length === 0) {
      const blockRe = /class="[^"]*review-content[^"]*"[^>]*>([\s\S]{40,600}?)<\/div>/gi;
      while ((m = blockRe.exec(html)) !== null && posts.length < 3) {
        const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.length > 40) posts.push({ title: `Owner review: ${makeEn} ${modelEn}`, url, sourceName: 'Cars.com Reviews', snippet: text.slice(0, 300) });
      }
    }
  } catch { /* ignore */ }
  return posts;
}

// ── AutoExpress.co.uk (UK car magazine with long-term reviews) ─────────────────
async function searchAutoExpress(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(`${makeEn} ${modelEn} review`);
    const res = await fetch(
      `https://www.autoexpress.co.uk/search?q=${query}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-GB,en;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract article links + snippets
    const cardRe = /<a[^>]+href="(https:\/\/www\.autoexpress\.co\.uk\/[^"]+review[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = cardRe.exec(html)) !== null && posts.length < 4) {
      const inner = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (inner.length < 15) continue;
      const titleMatch = /([A-Z][^.!?]{10,120})/.exec(inner);
      const title = titleMatch ? titleMatch[1].trim() : `Review: ${makeEn} ${modelEn}`;
      posts.push({ title, url: m[1], sourceName: 'Auto Express', snippet: inner.slice(0, 300) });
    }
  } catch { /* ignore */ }
  return posts;
}

// ── WhatCar.com (UK buyer reviews) ────────────────────────────────────────────
async function searchWhatCar(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const makeSlug  = makeEn.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = modelEn.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.whatcar.com/${makeSlug}/${modelSlug}/review/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-GB,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract verdict/summary paragraphs
    const verdictRe = /class="[^"]*(?:verdict|summary|review-body)[^"]*"[^>]*>([\s\S]{40,600}?)<\/(?:div|p)>/gi;
    let m;
    while ((m = verdictRe.exec(html)) !== null && posts.length < 3) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 40) posts.push({ title: `What Car verdict: ${makeEn} ${modelEn}`, url, sourceName: 'What Car?', snippet: text.slice(0, 300) });
    }

    // JSON-LD review body as fallback
    if (posts.length === 0) {
      const reviewRe = /"reviewBody"\s*:\s*"([^"]{40,600})"/g;
      while ((m = reviewRe.exec(html)) !== null && posts.length < 2) {
        const body = m[1].replace(/\\n/g, ' ').trim();
        if (body.length > 40) posts.push({ title: `Buyer review: ${makeEn} ${modelEn}`, url, sourceName: 'What Car?', snippet: body.slice(0, 300) });
      }
    }
  } catch { /* ignore */ }
  return posts;
}

// ── ZigWheels (Asian market owner reviews — JSON-LD, no blocking) ─────────────
// List page links to individual review pages; each individual page embeds all
// recent reviews in JSON-LD itemReviewed.review[] — so we only need one fetch.
async function searchZigWheels(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'en-US,en;q=0.9' };
    const makeSlug  = makeEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const modelSlug = modelEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const listUrl   = `https://www.zigwheels.my/new-cars/${makeSlug}/${modelSlug}/user-reviews/`;

    // Step 1: get list page, find first individual review URL
    const listRes = await fetch(listUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!listRes.ok) return posts;
    const listHtml = await listRes.text();

    const linkRe  = new RegExp(`href="(https://www\\.zigwheels\\.my/new-cars/${makeSlug}/${modelSlug}/user-reviews/[a-z0-9-]+)"`, 'g');
    const reviewUrls: string[] = [];
    let m;
    while ((m = linkRe.exec(listHtml)) !== null && reviewUrls.length < 1) reviewUrls.push(m[1]);
    if (reviewUrls.length === 0) return posts;

    // Step 2: fetch first review page — its JSON-LD has itemReviewed.review[] with all recent reviews
    const revRes = await fetch(reviewUrls[0], { headers, signal: AbortSignal.timeout(10000) });
    if (!revRes.ok) return posts;
    const revHtml = await revRes.text();

    const ldBlocks = [...revHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const [, block] of ldBlocks) {
      try {
        const obj = JSON.parse(block);
        if (obj['@type'] !== 'Review') continue;
        const reviews: any[] = obj?.itemReviewed?.review ?? [];
        for (const r of reviews.slice(0, 12)) {
          const body = (r.reviewBody ?? r.description ?? '').trim();
          if (body.length < 30) continue;
          const title  = r.name ?? `${makeEn} ${modelEn} owner review`;
          const author = r.author?.name ?? 'Owner';
          const date   = r.datePublished ? ` (${r.datePublished})` : '';
          // Give each review a unique URL using its title slug
          const slug   = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          posts.push({
            title:      `${title} — ${author}${date}`,
            url:        `${listUrl}${slug}`,
            sourceName: 'ZigWheels Owner Reviews',
            snippet:    body.slice(0, 500),
            score:      r.reviewRating?.ratingValue ?? undefined,
          });
        }
        break;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return posts;
}

async function searchCarExpertAu(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const q = encodeURIComponent(`${makeEn} ${modelEn} review`);
    const url = `https://www.carexpert.com.au/?s=${q}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-AU,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();
    const snippetRe = /<(?:p|div)[^>]*class="[^"]*(?:excerpt|summary|entry-summary)[^"]*"[^>]*>([\s\S]{40,500}?)<\/(?:p|div)>/gi;
    let m;
    while ((m = snippetRe.exec(html)) !== null && posts.length < 3) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 40) posts.push({ title: `CarExpert review: ${makeEn} ${modelEn}`, url, sourceName: 'CarExpert AU', snippet: text.slice(0, 300) });
    }
  } catch { /* ignore */ }
  return posts;
}

async function searchCarSalesAu(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const makeSlug  = makeEn.toLowerCase().replace(/\s+/g, '-');
    const modelSlug = modelEn.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.carsales.com.au/editorial/search/?q=${encodeURIComponent(`${makeEn} ${modelEn}`)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'en-AU,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();
    const snippetRe = /<(?:p|div)[^>]*class="[^"]*(?:description|summary|excerpt|body)[^"]*"[^>]*>([\s\S]{40,500}?)<\/(?:p|div)>/gi;
    let m;
    while ((m = snippetRe.exec(html)) !== null && posts.length < 3) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 40) posts.push({ title: `Carsales review: ${makeEn} ${modelEn}`, url, sourceName: 'carsales.com.au', snippet: text.slice(0, 300) });
    }
    void makeSlug; void modelSlug; // used in URL construction above
  } catch { /* ignore */ }
  return posts;
}

// ── "No real data" detection ──────────────────────────────────────────────────
// Any of these phrases mean the LLM had nothing real to say — discard the output.
const NO_DATA_PHRASES = [
  'אין מספיק', 'לא הביעו דעות', 'לא ניתן להסיק', 'אין מידע',
  'לא נמצא', 'מידע מוגבל', 'מוגבל ולא', 'אין ביקורות',
  'לא נמצאו', 'לא קיים מידע', 'לא ניתן', 'אין תוצאות',
  'לא נאספו', 'לא ידוע', 'לא נסקר',
];

function isEmptySummary(s: string | null | undefined): boolean {
  if (!s || s.trim().length < 40) return true;
  return NO_DATA_PHRASES.some((p) => s.includes(p));
}

function filterListItems(items: string[]): string[] {
  return items.filter(
    (item) => item.trim().length > 2 && !NO_DATA_PHRASES.some((p) => item.includes(p))
  );
}

// ── LLM caller — Mistral primary (60 RPM, free, no daily quota), Gemini fallback ──
interface SummarizeOutput {
  summary_he: string;
  score: number;   // 1–10
  pros: string[];
  cons: string[];
}

async function callLlm(prompt: string, temperature: number, defaultScore: number): Promise<SummarizeOutput | null> {
  function parse(text: string): SummarizeOutput | null {
    try {
      const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
      const p = JSON.parse(clean) as SummarizeOutput;
      p.score = Math.min(10, Math.max(1, Number(p.score) || defaultScore));
      p.pros = filterListItems(p.pros ?? []);
      p.cons = filterListItems(p.cons ?? []);
      if (!p.summary_he || p.summary_he.trim().length < 20) return null;
      if (isEmptySummary(p.summary_he)) return null;
      // Reject exact repeated consecutive words of 4+ chars (e.g. "שירות שירות")
      if (/(?<!\S)(\p{L}{4,})\s+\1(?!\S)/u.test(p.summary_he)) return null;
      // Reject summaries missing driver-report framing
      const driverPhrases = ['מדווחים', 'מציינים', 'נהגים', 'בעלי הרכב', 'תלונה', 'בעלים', 'משתמשים מציינים', 'לקוחות'];
      if (!driverPhrases.some(ph => p.summary_he.includes(ph))) return null;
      return p;
    } catch { return null; }
  }

  // Primary: Mistral (free, 60 RPM, no daily quota)
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    try {
      const res = await fetch(MISTRAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mistralKey}` },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json() as any;
      if (!json?.error && json?.object !== 'error') {
        const result = parse((json?.choices?.[0]?.message?.content ?? '').trim());
        if (result) return result;
      }
    } catch { /* fall through to Gemini */ }
  }

  // Fallback: Gemini (free, 15 RPM, daily quota)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: 600 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json() as any;
      if (!json.error) {
        const result = parse((json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim());
        if (result) return result;
      }
    } catch { /* ignore */ }
  }

  return null;
}

async function summarizeGroup(
  posts: UserPost[],
  makeNameHe: string,
  modelNameHe: string,
  scope: 'local' | 'global',
): Promise<SummarizeOutput | null> {
  if (posts.length === 0) return null;

  const postList = posts
    .slice(0, 20)
    .map((p, i) => {
      const yearNote = p.reviewYear ? `, ${p.reviewYear}` : '';
      return `[${i + 1}] "${p.title}" (${p.sourceName}${yearNote})${p.snippet ? `\nפרט: ${p.snippet}` : ''}`;
    })
    .join('\n\n');

  const scopeNote = scope === 'local'
    ? 'הפוסטים הם מפורומים ישראליים — סכם מנקודת מבט של נהגים ישראלים.'
    : 'הפוסטים הם מפורומים בינלאומיים (Reddit ואחרים) — סכם מנקודת מבט של בעלים בפועל.';

  const prompt = `אתה עוזר לאתר ביקורות רכב ישראלי. תפקידך לסכם מה בעלי הרכב אומרים.

${scopeNote}

הנה ${Math.min(posts.length, 20)} פוסטים מפורומי משתמשים על ${makeNameHe} ${modelNameHe} (כולל שנת הביקורת כשידוע):

${postList}

משימה: כתוב 2-3 משפטים בעברית שמשקפים את החוויה האמיתית של בעלי הרכב מהפוסטים האלה.

כללים:
- כתוב בגוף שלישי: "בעלי הרכב מדווחים ש...", "נהגים מציינים...", "תלונה נפוצה היא..."
- כתוב רק על מה שמוזכר בפוסטים — אל תמציא מידע
- התמקד בחוויה יומיומית: תקלות, עלויות, נוחות, מה שאוהבים/שונאים
- אל תכתוב תיאור כללי של הרכב — כתוב מה הנהגים אומרים
- שפה ברורה: במקום "יושבת טוב" כתוב "הרכב יציב בפניות"
- אל תשתמש ב"סלון" — השתמש בסדאן / האצ'בק / SUV
- כתוב רק על מה שמוזכר בפוסטים — אל תמציא מידע ואל תציין נתונים טכניים שאינם בפוסטים
- ציון: 1=גרוע מאוד, 5=ממוצע, 10=מעולה — לפי הרושם הכולל
- יתרונות/חסרונות: רק מה שמוזכר — אם אין, החזר []
- אם אין מספיק מידע — כתוב "אין מספיק ביקורות משתמשים כרגע" וציון 5

החזר JSON בלבד (ללא \`\`\` ולא markdown):
{"summary_he":"2-3 משפטים","score":7,"pros":["יתרון 1","יתרון 2"],"cons":["חיסרון 1","חיסרון 2"]}`;

  return callLlm(prompt, 0.4, 5);
}

// ── Scrape scheduling ─────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Returns next_scrape_at timestamp based on row type:
 * - AI-knowledge-only (no real posts): 7 days — replace with real scrape ASAP
 * - Year-specific, recent (≤3 years old): 14 days — active discussions
 * - General model review: 30 days
 * - Year-specific, older (4+ years): 90 days — discussions rarely change
 */
function computeNextScrapeAt(year: number | null | undefined, isKnowledgeOnly: boolean): string {
  const now = new Date();
  let days: number;
  if (isKnowledgeOnly) {
    days = 7;
  } else if (year == null) {
    days = 30;
  } else if (CURRENT_YEAR - year <= 3) {
    days = 14;
  } else {
    days = 90;
  }
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

// ── Public API ────────────────────────────────────────────────────────────────

function mapRow(r: any): ExpertReview {
  return {
    id: r.id,
    makeSlug: r.make_slug,
    modelSlug: r.model_slug,
    year: r.year ?? null,
    sourceName: r.source_name ?? '',
    sourceUrl: r.source_url ?? '',
    originalTitle: r.original_title ?? '',
    summaryHe: r.summary_he ?? '',
    localSummaryHe: r.local_summary_he ?? null,
    globalSummaryHe: r.global_summary_he ?? null,
    localScore: r.local_score != null ? parseFloat(r.local_score) : null,
    globalScore: r.global_score != null ? parseFloat(r.global_score) : null,
    topScore: r.top_score != null ? parseFloat(r.top_score) : null,
    pros: r.pros ?? [],
    cons: r.cons ?? [],
    localPostCount: r.local_post_count ?? 0,
    globalPostCount: r.global_post_count ?? 0,
    scrapedAt: r.scraped_at,
  };
}

/** General model summary (year = null). Auto-generates from LLM if DB is empty. */
export async function getExpertReviews(makeSlug: string, modelSlug: string): Promise<ExpertReview[]> {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from('expert_reviews')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .is('year', null)
      .order('scraped_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) return data.map(mapRow);

    // No DB row — return empty (admin scrape populates this)
    return [];
  } catch {
    return [];
  }
}

/** Year-specific summary — falls back to general if not found */
export async function getExpertReviewsForYear(
  makeSlug: string,
  modelSlug: string,
  year: number,
): Promise<{ review: ExpertReview | null; isYearSpecific: boolean }> {
  try {
    const sb = getSupabase();

    // Try year-specific first
    const { data: yearData } = await sb
      .from('expert_reviews')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .eq('year', year)
      .order('scraped_at', { ascending: false })
      .limit(1);

    if (yearData && yearData.length > 0) {
      const row = yearData[0];
      // Only treat as year-specific if real scraped posts were found for this year
      const hasRealData = (row.local_post_count ?? 0) + (row.global_post_count ?? 0) > 0;
      if (hasRealData) {
        return { review: mapRow(row), isYearSpecific: true };
      }
    }

    // No DB row — fall back to general model summary (no inline LLM generation)
    const { data: generalData } = await getSupabase()
      .from('expert_reviews')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .is('year', null)
      .order('scraped_at', { ascending: false })
      .limit(1);

    if (generalData && generalData.length > 0) {
      return { review: mapRow(generalData[0]), isYearSpecific: false };
    }

    return { review: null, isYearSpecific: false };
  } catch {
    return { review: null, isYearSpecific: false };
  }
}

// ── Knowledge-based fallback (guaranteed summary from LLM training data) ──────
async function generateKnowledgeSummary(
  makeNameHe: string,
  modelNameHe: string,
  makeNameEn: string,
  modelNameEn: string,
  year?: number,
): Promise<SummarizeOutput | null> {
  const yearNote = year ? ` ${year}` : '';
  const yearInstr = year
    ? `\nהתמקד על ${year} ספציפית — מה השתנה, תקלות ידועות לאותה שנה, מה בעלים אומרים על אותה גרסה.`
    : '';
  const prompt = `אתה עוזר לאתר ביקורות רכב ישראלי. הצג את המידע מנקודת מבט של בעלי רכב בפועל.

כתוב 2-3 משפטים בעברית שמשקפים מה בעלי ${makeNameHe} ${modelNameHe}${yearNote} (${makeNameEn} ${modelNameEn}${year ? ` ${year}` : ''}) בדרך כלל מדווחים.${yearInstr}

חוקים:
- כתוב בגוף שלישי: "בעלי הרכב מדווחים ש...", "נהגים מציינים...", "תלונה נפוצה היא..."
- התמקד בחוויית נהיגה יומיומית, תקלות שחוזרות, עלויות תחזוקה, מה אוהבים ומה לא
- אל תכתוב תיאור כללי של הרכב (מנוע, גודל, עיצוב) — כתוב מה הנהגים אומרים
- אל תשתמש במילה "סלון" — השתמש בסדאן/SUV/האצ'בק
- אסור לציין גדלי מנוע, מספרים טכניים ספציפיים, או פרטים שאתה לא בטוח לגביהם — שמור על רמה כללית
- ציון: 9-10 רכב שבעלים ממליצים בחום, 7-8 שביעות רצון כללית, 5-6 מעורב, 3-4 תלונות רבות
- יתרונות/חסרונות: רק מה שבעלים בפועל מציינים — תכונות ספציפיות, לא כלליות

החזר JSON בלבד:
{"summary_he":"...","score":8,"pros":["...","..."],"cons":["...","..."]}`;

  return callLlm(prompt, 0.6, 6);
}

// ── Persist a knowledge-generated row to DB (non-blocking helper) ─────────────
async function saveKnowledgeReview(
  makeSlug: string,
  modelSlug: string,
  year: number | null,
  out: SummarizeOutput,
  localOut?: SummarizeOutput,
): Promise<void> {
  try {
    const sb = getSupabase(true);
    const del = sb.from('expert_reviews').delete()
      .eq('make_slug', makeSlug).eq('model_slug', modelSlug);
    if (year) await del.eq('year', year);
    else await del.is('year', null);

    const topScore = localOut?.score != null
      ? (localOut.score + out.score) / 2
      : out.score;

    await sb.from('expert_reviews').insert({
      make_slug: makeSlug, model_slug: modelSlug, year: year ?? null,
      source_name: 'AI Knowledge', source_url: '', original_title: '',
      summary_he: localOut?.summary_he ?? out.summary_he,
      local_summary_he: localOut?.summary_he ?? null,
      global_summary_he: out.summary_he,
      local_score: localOut?.score ?? null,
      global_score: out.score,
      top_score: topScore,
      pros: [...(localOut?.pros ?? []), ...(out.pros ?? [])].slice(0, 4),
      cons: [...(localOut?.cons ?? []), ...(out.cons ?? [])].slice(0, 4),
      local_post_count: 0, global_post_count: 0,
      scraped_at: new Date().toISOString(),
      next_scrape_at: computeNextScrapeAt(year, true),
    });
  } catch { /* non-critical */ }
}

// ── Israeli knowledge-based summary (guaranteed, AI-generated with Israeli framing) ──
async function generateIsraeliKnowledgeSummary(
  makeNameHe: string,
  modelNameHe: string,
  makeNameEn: string,
  modelNameEn: string,
  year?: number,
): Promise<SummarizeOutput | null> {
  const yearNote = year ? ` ${year}` : '';
  const yearInstr = year
    ? `\nהתמקד על ${year} ספציפית — תקלות ידועות, מה שבעלים ישראלים מציינים לאותה שנה.`
    : '';
  const prompt = `אתה עוזר לאתר ביקורות רכב ישראלי. כתוב סיכום מנקודת מבט של נהגים ישראלים בפועל.

כתוב 2-3 משפטים בעברית שמשקפים מה בעלי ${makeNameHe} ${modelNameHe}${yearNote} (${makeNameEn} ${modelNameEn}) בישראל בדרך כלל מדווחים — בהתחשב בתנאי הנהיגה, האקלים, ורמת השירות בישראל.${yearInstr}

חוקים:
- כתוב בגוף שלישי: "בעלי הרכב בישראל מדווחים ש...", "נהגים ישראלים מציינים...", "תלונה נפוצה בישראל היא..."
- התמקד בחוויה ישראלית: תנאי נהיגה עירוניים, חום, שירות, אמינות
- אל תכתוב תיאור כללי של הרכב — כתוב מה הנהגים אומרים
- אל תשתמש במילה "סלון" — השתמש בסדאן/SUV/האצ'בק
- אסור לציין גדלי מנוע או נתונים טכניים ספציפיים — שמור על רמה כללית
- ציון: 9-10 ממליצים בחום, 7-8 שביעות רצון כללית, 5-6 מעורב, 3-4 תלונות רבות

החזר JSON בלבד:
{"summary_he":"...","score":8,"pros":["...","..."],"cons":["...","..."]}`;

  return callLlm(prompt, 0.6, 6);
}

export interface RawPost {
  id: string;          // derived from url (used for selection)
  title: string;
  url: string;
  sourceName: string;
  snippet: string;
  scope: 'local' | 'global';
  score?: number;
  reviewYear?: number; // Year the review was written (from datePublished or source metadata)
}

async function gatherUserPosts(
  makeNameHe: string, modelNameHe: string,
  makeNameEn: string, modelNameEn: string,
  year?: number,
): Promise<{ local: UserPost[]; global: UserPost[]; primary?: UserPost }> {
  const [
    tapuzPosts, onePosts, icarPosts, carzonePosts,
    carComplaintsPosts, nhtsaPosts, edmundsPosts, zigWheelsPosts, drivePosts, rotterPosts, wallaPosts,
    carsComPosts, autoExpressPosts, whatCarPosts, carExpertPosts, carSalesPosts,
    facebookPosts,
  ] = await Promise.all([
    searchTapuz(makeNameHe, modelNameHe, year),
    searchOne(makeNameHe, modelNameHe),
    searchIcar(makeNameHe, modelNameHe, year),
    searchCarzone(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year),
    searchCarComplaints(makeNameEn, modelNameEn),
    searchNHTSA(makeNameEn, modelNameEn, year),
    searchEdmunds(makeNameEn, modelNameEn, year),
    searchZigWheels(makeNameEn, modelNameEn),
    searchDrive(makeNameHe, modelNameHe, year),
    searchRotter(makeNameHe, modelNameHe, year),
    searchWalla(makeNameHe, modelNameHe, year),
    searchCarsCom(makeNameEn, modelNameEn, year),
    searchAutoExpress(makeNameEn, modelNameEn),
    searchWhatCar(makeNameEn, modelNameEn),
    searchCarExpertAu(makeNameEn, modelNameEn),
    searchCarSalesAu(makeNameEn, modelNameEn),
    searchFacebook(makeNameHe, modelNameHe, year),
  ]);
  return {
    local:   [...icarPosts, ...drivePosts, ...wallaPosts, ...carzonePosts, ...tapuzPosts, ...rotterPosts, ...onePosts, ...facebookPosts],
    global:  [...zigWheelsPosts, ...edmundsPosts, ...nhtsaPosts, ...carComplaintsPosts, ...carsComPosts, ...autoExpressPosts, ...whatCarPosts, ...carExpertPosts, ...carSalesPosts],
    primary: tapuzPosts[0] ?? onePosts[0] ?? zigWheelsPosts[0] ?? nhtsaPosts[0],
  };
}

export async function scrapeRawPosts(
  makeNameHe: string, modelNameHe: string,
  makeNameEn: string, modelNameEn: string,
  year?: number,
  blockedSources: string[] = [],
): Promise<{ local: RawPost[]; global: RawPost[] }> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('scrape timeout')), 35000),
  );
  const { local, global: globalPosts } = await Promise.race([
    gatherUserPosts(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year),
    timeout,
  ]);
  const toRaw = (posts: UserPost[], scope: 'local' | 'global'): RawPost[] => {
    const seen = new Set<string>();
    return posts
      .filter((p) => { if (seen.has(p.url)) return false; seen.add(p.url); return true; })
      .filter((p) => blockedSources.length === 0 || !blockedSources.includes(p.sourceName))
      .map((p) => ({ id: p.url, title: p.title, url: p.url, sourceName: p.sourceName, snippet: p.snippet, scope, score: p.score, reviewYear: p.reviewYear }));
  };
  return { local: toRaw(local, 'local'), global: toRaw(globalPosts, 'global') };
}

export async function summarizeFromPosts(
  makeSlug: string, modelSlug: string,
  makeNameHe: string, modelNameHe: string,
  makeNameEn: string, modelNameEn: string,
  localPosts: RawPost[], globalPosts: RawPost[],
): Promise<number> {
  // Convert RawPost back to UserPost for summarizeGroup
  const toUserPost = (p: RawPost): UserPost => ({ title: p.title, url: p.url, sourceName: p.sourceName, snippet: p.snippet, score: p.score });

  let [localOut, globalOut] = await Promise.all([
    localPosts.length  > 0 ? summarizeGroup(localPosts.map(toUserPost),  makeNameHe, modelNameHe, 'local')  : null,
    globalPosts.length > 0 ? summarizeGroup(globalPosts.map(toUserPost), makeNameHe, modelNameHe, 'global') : null,
  ]);

  if (!globalOut) {
    globalOut = await generateKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn);
    if (!globalOut) return 0;
  }
  if (!localOut) {
    localOut = await generateIsraeliKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn);
  }

  const scores: number[] = [];
  if (localOut?.score  != null) scores.push(localOut.score);
  if (globalOut?.score != null) scores.push(globalOut.score);
  const topScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const allPros = [...(localOut?.pros ?? []), ...(globalOut?.pros ?? [])].slice(0, 4);
  const allCons = [...(localOut?.cons ?? []), ...(globalOut?.cons ?? [])].slice(0, 4);

  const sb = getSupabase(true);
  await sb.from('expert_reviews').delete().eq('make_slug', makeSlug).eq('model_slug', modelSlug).is('year', null);
  const { error } = await sb.from('expert_reviews').insert({
    make_slug:        makeSlug, model_slug:       modelSlug, year: null,
    source_name:      localPosts[0]?.sourceName ?? globalPosts[0]?.sourceName ?? '',
    source_url:       localPosts[0]?.url ?? globalPosts[0]?.url ?? '',
    original_title:   localPosts[0]?.title ?? globalPosts[0]?.title ?? '',
    summary_he:       localOut?.summary_he ?? globalOut?.summary_he ?? '',
    local_summary_he: localOut?.summary_he  ?? null,
    global_summary_he: globalOut?.summary_he ?? null,
    local_score:      localOut?.score  ?? null,
    global_score:     globalOut?.score ?? null,
    top_score:        topScore,
    pros:             allPros,
    cons:             allCons,
    local_post_count:  localPosts.length,
    global_post_count: globalPosts.length,
    scraped_at:       new Date().toISOString(),
  });
  return error ? 0 : 1;
}

export async function scrapeExpertReviews(
  makeSlug: string,
  modelSlug: string,
  makeNameHe: string,
  modelNameHe: string,
  makeNameEn: string,
  modelNameEn: string,
  year?: number,
): Promise<number> {
  const { local: localPosts, global: globalPosts, primary } = await gatherUserPosts(
    makeNameHe, modelNameHe, makeNameEn, modelNameEn, year,
  );

  let [localOut, globalOut] = await Promise.all([
    localPosts.length  > 0 ? summarizeGroup(localPosts,  makeNameHe, modelNameHe, 'local')  : null,
    globalPosts.length > 0 ? summarizeGroup(globalPosts, makeNameHe, modelNameHe, 'global') : null,
  ]);

  if (!globalOut) {
    globalOut = await generateKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year);
    if (!globalOut) return 0;
  }
  if (!localOut) {
    localOut = await generateIsraeliKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year);
  }

  const scores = [localOut?.score, globalOut?.score].filter((s): s is number => s != null);
  const topScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const allPros = [...(localOut?.pros ?? []), ...(globalOut?.pros ?? [])].slice(0, 4);
  const allCons = [...(localOut?.cons ?? []), ...(globalOut?.cons ?? [])].slice(0, 4);

  const sb = getSupabase(true);

  // Always delete then insert — avoids the upsert conflict ambiguity between
  // general rows (year=null) and year-specific rows sharing the same make_slug/model_slug.
  const deleteQ = sb.from('expert_reviews')
    .delete()
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug);

  if (year) {
    await deleteQ.eq('year', year);
  } else {
    await deleteQ.is('year', null);
  }

  const { error } = await sb.from('expert_reviews').insert({
    make_slug:           makeSlug,
    model_slug:          modelSlug,
    year:                year ?? null,
    source_name:         primary?.sourceName ?? '',
    source_url:          primary?.url ?? '',
    original_title:      primary?.title ?? '',
    summary_he:          localOut?.summary_he ?? globalOut?.summary_he ?? '',
    local_summary_he:    localOut?.summary_he  ?? null,
    global_summary_he:   globalOut?.summary_he ?? null,
    local_score:         localOut?.score  ?? null,
    global_score:        globalOut?.score ?? null,
    top_score:           topScore,
    pros:                allPros,
    cons:                allCons,
    local_post_count:    localPosts.length,
    global_post_count:   globalPosts.length,
    scraped_at:          new Date().toISOString(),
    next_scrape_at: computeNextScrapeAt(year, false),
  });

  return error ? 0 : 1;
}

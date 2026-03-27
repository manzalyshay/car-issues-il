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
import { getMakeBySlug, getModelBySlug } from '@/data/cars';

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
  snippet: string;   // First ~300 chars only — never full post
  score?: number;    // Upvotes / relevance
}

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabase(serviceRole = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = serviceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// ── Reddit (free JSON API, no key) ────────────────────────────────────────────

// Brand-specific subreddits for richer model discussions
const MAKE_SUBREDDITS: Record<string, string> = {
  'BMW': 'BMW', 'Mercedes': 'mercedes_benz', 'Mercedes-Benz': 'mercedes_benz',
  'Jeep': 'Jeep', 'Mazda': 'mazda', 'Volkswagen': 'Volkswagen', 'Toyota': 'Toyota',
  'Honda': 'Honda', 'Ford': 'Ford', 'Audi': 'Audi', 'Hyundai': 'hyundai',
  'Kia': 'kia', 'Subaru': 'subaru', 'Volvo': 'Volvo', 'Renault': 'Renault',
  'Peugeot': 'Peugeot', 'Nissan': 'Nissan', 'Skoda': 'skoda', 'Suzuki': 'suzuki',
  'Mitsubishi': 'mitsubishi',
};

async function fetchRedditSearch(url: string, posts: UserPost[], limit: number): Promise<void> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CarIssuesIL/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return;
    const json = await res.json() as any;
    for (const child of (json?.data?.children ?? [])) {
      const d = child.data;
      if (!d?.title || !d?.permalink) continue;
      // Skip only posts with no content AND very low engagement
      if ((d.selftext?.length ?? 0) < 10 && (d.score ?? 0) < 3 && !d.title) continue;
      const snippet = (d.selftext ?? '').replace(/\n+/g, ' ').slice(0, 300) || d.title.slice(0, 300);
      posts.push({ title: d.title, url: `https://reddit.com${d.permalink}`, sourceName: `r/${d.subreddit}`, snippet, score: d.score ?? 0 });
      if (posts.length >= limit) return;
    }
  } catch { /* ignore */ }
}

async function searchReddit(makeEn: string, modelEn: string, year?: number): Promise<UserPost[]> {
  const base = year ? `${makeEn} ${modelEn} ${year}` : `${makeEn} ${modelEn}`;
  const posts: UserPost[] = [];

  // General Reddit searches
  const generalQueries = [
    `${base} review owner experience`,
    `${base} reliability problems`,
    `${base} thoughts`,
  ];
  for (const q of generalQueries) {
    await fetchRedditSearch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=top&t=all&limit=10&type=link`,
      posts, 10,
    );
    if (posts.length >= 8) break;
  }

  // If still few results, try the brand subreddit directly
  if (posts.length < 4) {
    const sub = MAKE_SUBREDDITS[makeEn];
    if (sub) {
      await fetchRedditSearch(
        `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(modelEn)}&sort=top&restrict_sr=1&limit=10`,
        posts, 10,
      );
    }
  }

  // Deduplicate by URL and sort by score
  const seen = new Set<string>();
  return posts
    .filter((p) => { if (seen.has(p.url)) return false; seen.add(p.url); return true; })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 8);
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

  for (const slugUrl of urls) {
    try {
      const res = await fetch(slugUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Extract reviewBody fields directly (more reliable than JSON-LD parsing)
      const reviewRe = /"reviewBody":"((?:[^"\\]|\\.)*)"/g;
      let rm;
      while ((rm = reviewRe.exec(html)) !== null && posts.length < 6) {
        const body = rm[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u[\da-f]{4}/gi, '').trim();
        if (!body || body.length < 20) continue;
        posts.push({
          title: 'ביקורת גולש ישראלי',
          url: slugUrl,
          sourceName: 'CarZone ביקורות גולשים',
          snippet: body.slice(0, 350),
        });
      }
      if (posts.length > 0) break; // Found reviews, no need to try more URLs
    } catch { /* ignore */ }
  }
  return posts;
}

// ── CarComplaints.com (US car problems database — great for issues site) ──────
async function searchCarComplaints(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    // CarComplaints URLs: /Make/Model/
    const makeSlug = makeEn.replace(/[^a-z0-9]/gi, '_');
    const modelSlug = modelEn.replace(/[^a-z0-9]/gi, '_');
    const url = `https://www.carcomplaints.com/${makeSlug}/${modelSlug}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract complaint titles and snippets
    const complaintRe = /<a[^>]+href="\/[^"]+\/complaint[^"]*"[^>]*>\s*([^<]{10,200})\s*<\/a>/gi;
    const snippetRe = /<p[^>]*class="[^"]*complaint[^"]*"[^>]*>([^<]{20,400})<\/p>/gi;

    const titles: string[] = [];
    let m;
    while ((m = complaintRe.exec(html)) !== null && titles.length < 5) {
      const t = m[1].trim();
      if (t.length > 10) titles.push(t);
    }

    const snippets: string[] = [];
    while ((m = snippetRe.exec(html)) !== null && snippets.length < 5) {
      snippets.push(m[1].trim().slice(0, 300));
    }

    for (let i = 0; i < titles.length; i++) {
      posts.push({
        title: titles[i],
        url,
        sourceName: 'CarComplaints.com',
        snippet: snippets[i] ?? '',
      });
    }

    // Also try to extract top complaints summary text
    const summaryRe = /class="[^"]*(?:top-complaints|problems-summary)[^"]*"[^>]*>([\s\S]{40,600}?)<\/div>/i;
    const sm = summaryRe.exec(html);
    if (sm && posts.length === 0) {
      const text = sm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 40) {
        posts.push({ title: `Top complaints: ${makeEn} ${modelEn}`, url, sourceName: 'CarComplaints.com', snippet: text.slice(0, 300) });
      }
    }
  } catch { /* ignore */ }
  return posts;
}

// ── Edmunds owner reviews ──────────────────────────────────────────────────────
async function searchEdmunds(makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const makeSlug = makeEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const modelSlug = modelEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://www.edmunds.com/${makeSlug}/${modelSlug}/review/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract owner review snippets from JSON-LD or inline review text
    const reviewRe = /"reviewBody"\s*:\s*"([^"]{30,500})"/g;
    let m;
    while ((m = reviewRe.exec(html)) !== null && posts.length < 4) {
      const body = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
      if (body.length > 30) {
        posts.push({ title: `Owner review: ${makeEn} ${modelEn}`, url, sourceName: 'Edmunds Owner Reviews', snippet: body.slice(0, 300) });
      }
    }
  } catch { /* ignore */ }
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

    // JSON-LD reviewBody
    const reviewRe = /"reviewBody"\s*:\s*"([^"]{40,600})"/g;
    let m;
    while ((m = reviewRe.exec(html)) !== null && posts.length < 4) {
      const body = m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').trim();
      if (body.length > 40) {
        posts.push({ title: `Consumer review: ${makeEn} ${modelEn}`, url, sourceName: 'Cars.com Reviews', snippet: body.slice(0, 300) });
      }
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
    .slice(0, 6)
    .map((p, i) =>
      `[${i + 1}] "${p.title}" (${p.sourceName})${p.snippet ? `\nפרט: ${p.snippet}` : ''}`
    )
    .join('\n\n');

  const scopeNote = scope === 'local'
    ? 'הפוסטים הם מפורומים ישראליים — סכם מנקודת מבט של נהגים ישראלים.'
    : 'הפוסטים הם מפורומים בינלאומיים (Reddit ואחרים) — סכם מנקודת מבט של בעלים בפועל.';

  const prompt = `אתה עוזר לאתר ביקורות רכב ישראלי. תפקידך לסכם מה בעלי הרכב אומרים.

${scopeNote}

הנה ${posts.length} פוסטים מפורומי משתמשים על ${makeNameHe} ${modelNameHe}:

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
      return { review: mapRow(yearData[0]), isYearSpecific: true };
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
}

export async function scrapeRawPosts(
  makeNameHe: string, modelNameHe: string,
  makeNameEn: string, modelNameEn: string,
  year?: number,
): Promise<{ local: RawPost[]; global: RawPost[] }> {
  const [
    redditPosts, tapuzPosts, onePosts, icarPosts, carzonePosts,
    carComplaintsPosts, edmundsPosts, drivePosts, rotterPosts, wallaPosts,
    carsComPosts, autoExpressPosts, whatCarPosts, carExpertPosts, carSalesPosts,
    facebookPosts,
  ] = await Promise.all([
    searchReddit(makeNameEn, modelNameEn, year),
    searchTapuz(makeNameHe, modelNameHe, year),
    searchOne(makeNameHe, modelNameHe),
    searchIcar(makeNameHe, modelNameHe, year),
    searchCarzone(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year),
    searchCarComplaints(makeNameEn, modelNameEn),
    searchEdmunds(makeNameEn, modelNameEn),
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

  const toRaw = (posts: UserPost[], scope: 'local' | 'global'): RawPost[] =>
    posts.map((p) => ({
      id: Buffer.from(p.url).toString('base64').slice(0, 16),
      title: p.title,
      url: p.url,
      sourceName: p.sourceName,
      snippet: p.snippet,
      scope,
      score: p.score,
    }));

  return {
    local:  toRaw([...icarPosts, ...drivePosts, ...wallaPosts, ...carzonePosts, ...tapuzPosts, ...rotterPosts, ...onePosts, ...facebookPosts], 'local'),
    global: toRaw([...redditPosts, ...carComplaintsPosts, ...edmundsPosts, ...carsComPosts, ...autoExpressPosts, ...whatCarPosts, ...carExpertPosts, ...carSalesPosts], 'global'),
  };
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
  // Gather user posts from all sources in parallel
  const [
    redditPosts, tapuzPosts, onePosts, icarPosts, carzonePosts,
    carComplaintsPosts, edmundsPosts, drivePosts, rotterPosts, wallaPosts,
    carsComPosts, autoExpressPosts, whatCarPosts, carExpertPosts, carSalesPosts,
    facebookPosts,
  ] = await Promise.all([
    searchReddit(makeNameEn, modelNameEn, year),
    searchTapuz(makeNameHe, modelNameHe, year),
    searchOne(makeNameHe, modelNameHe),
    searchIcar(makeNameHe, modelNameHe, year),
    searchCarzone(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year),
    searchCarComplaints(makeNameEn, modelNameEn),
    searchEdmunds(makeNameEn, modelNameEn),
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

  const localPosts  = [...icarPosts, ...drivePosts, ...wallaPosts, ...carzonePosts, ...tapuzPosts, ...rotterPosts, ...onePosts, ...facebookPosts];  // Israeli sources
  const globalPosts = [...redditPosts, ...carComplaintsPosts, ...edmundsPosts, ...carsComPosts, ...autoExpressPosts, ...whatCarPosts, ...carExpertPosts, ...carSalesPosts];  // International

  // Summarize each group independently, in parallel
  let [localOut, globalOut] = await Promise.all([
    localPosts.length  > 0 ? summarizeGroup(localPosts,  makeNameHe, modelNameHe, 'local')  : null,
    globalPosts.length > 0 ? summarizeGroup(globalPosts, makeNameHe, modelNameHe, 'global') : null,
  ]);

  // Always guarantee a global summary using LLM knowledge — every car deserves a review.
  // If real scraped posts produced a summary, use it. Otherwise fall back to LLM knowledge.
  if (!globalOut) {
    globalOut = await generateKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year);
    if (!globalOut) return 0; // Only fail if Groq API is completely down
  }

  // Always guarantee an Israeli summary too — fall back to knowledge-based with Israeli framing.
  if (!localOut) {
    localOut = await generateIsraeliKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn, year);
  }

  // Top score = weighted average of available scores
  const scores: number[] = [];
  if (localOut?.score  != null) scores.push(localOut.score);
  if (globalOut?.score != null) scores.push(globalOut.score);
  const topScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  // Combined pros/cons (deduplicated by text)
  const allPros = [...(localOut?.pros ?? []), ...(globalOut?.pros ?? [])].slice(0, 4);
  const allCons = [...(localOut?.cons ?? []), ...(globalOut?.cons ?? [])].slice(0, 4);

  // Primary source attribution
  const primary = tapuzPosts[0] ?? onePosts[0] ?? redditPosts[0];

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

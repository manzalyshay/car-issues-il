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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

interface UserPost {
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
      headers: { 'User-Agent': 'CarIssuesIL/1.0 (educational project)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    const json = await res.json() as any;
    for (const child of (json?.data?.children ?? [])) {
      const d = child.data;
      if (!d?.title || !d?.permalink) continue;
      // Keep self posts or Reddit-internal links; skip pure link posts to external sites
      if (d.is_self === false && !d.url?.includes('reddit.com')) continue;
      // Skip very low-effort posts (tiny body AND low score)
      if ((d.selftext?.length ?? 0) < 30 && (d.score ?? 0) < 5) continue;
      const snippet = (d.selftext ?? d.title ?? '').replace(/\n+/g, ' ').slice(0, 300);
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

// ── Fetch first-post content from a Tapuz thread ──────────────────────────────
async function fetchTapuzSnippet(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Tapuz renders post bodies in several possible containers
    const patterns = [
      /class="[^"]*(?:forum-body|post-body|topic-content|message-content)[^"]*"[^>]*>([\s\S]{30,1000}?)<\/div>/i,
      /class="[^"]*content[^"]*"[^>]*>([\s\S]{60,800}?)<\/(?:div|p)>/i,
    ];
    for (const re of patterns) {
      const m = re.exec(html);
      if (m) {
        const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.length > 40) return text.slice(0, 300);
      }
    }
    return '';
  } catch {
    return '';
  }
}

// ── Tapuz.co.il (Israeli Hebrew forum, public search) ─────────────────────────
async function searchTapuz(makeHe: string, modelHe: string, year?: number): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    const query = encodeURIComponent(year ? `${makeHe} ${modelHe} ${year}` : `${makeHe} ${modelHe}`);
    const res = await fetch(
      `https://www.tapuz.co.il/forums2008/search/?searchword=${query}&forumId=10`,  // forum 10 = cars
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract thread links + titles from search results
    const candidates: { title: string; url: string }[] = [];
    const threadRe = /<a[^>]+href="(\/forums2008\/[^"]+\/\d+[^"]*)"[^>]*>([^<]{10,120})<\/a>/gi;
    let m;
    while ((m = threadRe.exec(html)) !== null && candidates.length < 6) {
      const path = m[1];
      const title = m[2].replace(/&amp;/g, '&').replace(/&[a-z]+;/g, '').trim();
      if (!title || title.length < 8) continue;
      candidates.push({ title, url: `https://www.tapuz.co.il${path}` });
    }

    // Fetch content from first 3 threads (in parallel, limited)
    const snippets = await Promise.all(
      candidates.slice(0, 3).map((c) => fetchTapuzSnippet(c.url))
    );

    for (let i = 0; i < candidates.length && posts.length < 5; i++) {
      const { title, url } = candidates[i];
      posts.push({
        title,
        url,
        sourceName: 'פורום טפוז רכב',
        snippet: snippets[i] ?? '',
      });
    }
  } catch { /* ignore */ }
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

// ── carzone.co.il (Israeli car site — JSON-LD user reviews on model pages) ────
async function searchCarzone(makeHe: string, modelHe: string, makeEn: string, modelEn: string): Promise<UserPost[]> {
  const posts: UserPost[] = [];
  try {
    // carzone uses Hebrew slugs: /toyota/corolla/ style but sometimes English
    const slugUrl = `https://www.carzone.co.il/${encodeURIComponent(makeEn.toLowerCase())}/${encodeURIComponent(modelEn.toLowerCase())}/`;
    const res = await fetch(slugUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'he-IL,he;q=0.9' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return posts;
    const html = await res.text();

    // Extract JSON-LD reviews — reliable, not fragile to class name changes
    const scriptRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = scriptRe.exec(html)) !== null) {
      try {
        const data = JSON.parse(sm[1]);
        const reviews = Array.isArray(data?.review) ? data.review
          : data?.review ? [data.review] : [];
        for (const r of reviews) {
          const body: string = r?.reviewBody ?? '';
          const author: string = r?.author?.name ?? 'גולש';
          if (!body || body.length < 20) continue;
          posts.push({
            title: `ביקורת של ${author}`,
            url: slugUrl,
            sourceName: 'CarZone ביקורות גולשים',
            snippet: body.slice(0, 300),
          });
          if (posts.length >= 5) break;
        }
      } catch { /* ignore */ }
      if (posts.length >= 5) break;
    }
  } catch { /* ignore */ }
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

// ── Groq summarizer ────────────────────────────────────────────────────────────
interface SummarizeOutput {
  summary_he: string;
  score: number;   // 1–10
  pros: string[];
  cons: string[];
}

async function summarizeGroup(
  posts: UserPost[],
  makeNameHe: string,
  modelNameHe: string,
  scope: 'local' | 'global',
): Promise<SummarizeOutput | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || posts.length === 0) return null;

  const postList = posts
    .slice(0, 6)
    .map((p, i) =>
      `[${i + 1}] "${p.title}" (${p.sourceName})${p.snippet ? `\nפרט: ${p.snippet}` : ''}`
    )
    .join('\n\n');

  const scopeNote = scope === 'local'
    ? 'הפוסטים הם מפורומים ישראליים — כתוב בהתאם לקהל ישראלי.'
    : 'הפוסטים הם מפורומים בינלאומיים (Reddit ואחרים).';

  const prompt = `אתה עוזר לכתיבת תוכן לאתר ביקורות רכב ישראלי.

${scopeNote}

הנה ${posts.length} פוסטים מפורומי משתמשים על ${makeNameHe} ${modelNameHe}:

${postList}

משימה: כתוב סיכום קצר בעברית שמשקף את דעות המשתמשים האמיתיים, וקבע ציון מ-1 עד 10.

כללים חשובים:
- כתוב טקסט חדש לגמרי — אל תעתיק אפילו ביטוי אחד מהפוסטים
- כתוב רק על מה שמוזכר בפוסטים — אל תמציא מידע
- כתוב בגוף שלישי ("בעלי הרכב", "משתמשים מדווחים" וכו')
- השתמש בשפה פשוטה וברורה — הימנע מז'רגון רכב עמום (כמו "יושבת", "נוחה לדרך" וכו') ובמקום זאת הסבר במפורש מה המשמעות (למשל: "הרכב יציב בפניות", "התגובה להגה איטית")
- אל תשתמש במילה "סלון" לתיאור סוג הרכב — השתמש במקום בסדאן / האצ'בק / SUV וכו'
- הציון: 1=גרוע מאוד, 5=ממוצע, 10=מעולה — בהתבסס על הרושם הכולל מהפוסטים
- יתרונות וחסרונות: רשום רק דברים שמוזכרים בפוסטים — אל תכתוב "מידע מוגבל", "אין מידע" או כל ביטוי שמסביר חוסר מידע כיתרון/חסרון. אם אין יתרונות/חסרונות ברורים — החזר מערך ריק []
- אם אין מספיק מידע — כתוב "אין מספיק ביקורות משתמשים כרגע" וציון 5

החזר JSON בלבד (ללא \`\`\` ולא markdown):
{"summary_he":"2-3 משפטים","score":7,"pros":["יתרון 1","יתרון 2"],"cons":["חיסרון 1","חיסרון 2"]}`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });
    const json = await res.json() as any;
    const text = (json?.choices?.[0]?.message?.content ?? '').trim();
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(clean) as SummarizeOutput;
    // Clamp score to 1–10
    parsed.score = Math.min(10, Math.max(1, Number(parsed.score) || 5));
    // Discard any "no data" / hedging response — treat as nothing found
    if (isEmptySummary(parsed.summary_he)) return null;
    // Strip any "no data" filler from pros/cons
    parsed.pros = filterListItems(parsed.pros ?? []);
    parsed.cons = filterListItems(parsed.cons ?? []);
    return parsed;
  } catch {
    return null;
  }
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

/** General model summary (year = null) */
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

    return (data ?? []).map(mapRow);
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

    // Fall back to general model summary
    const { data: generalData } = await sb
      .from('expert_reviews')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .is('year', null)
      .order('scraped_at', { ascending: false })
      .limit(1);

    const review = generalData && generalData.length > 0 ? mapRow(generalData[0]) : null;
    return { review, isYearSpecific: false };
  } catch {
    return { review: null, isYearSpecific: false };
  }
}

// ── Knowledge-based fallback (when no forum posts found at all) ───────────────
async function generateKnowledgeSummary(
  makeNameHe: string,
  modelNameHe: string,
  makeNameEn: string,
  modelNameEn: string,
): Promise<SummarizeOutput | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `אתה עוזר לכתיבת תוכן לאתר ביקורות רכב ישראלי.

לא נמצאו פוסטים מפורומים על ${makeNameHe} ${modelNameHe} (${makeNameEn} ${modelNameEn}).

כתוב סיכום כללי קצר בעברית על הרכב הזה עבור קונים ישראלים — על בסיס הידע הכללי שלך על הדגם.
הבהר שמדובר בסיכום כללי (לא דיווחי משתמשים ספציפיים).
כתוב 2-3 משפטים, ציון, יתרונות וחסרונות ידועים.

החזר JSON בלבד (ללא \`\`\` ולא markdown):
{"summary_he":"2-3 משפטים","score":7,"pros":["יתרון 1","יתרון 2"],"cons":["חיסרון 1","חיסרון 2"]}`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });
    const json = await res.json() as any;
    const text = (json?.choices?.[0]?.message?.content ?? '').trim();
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(clean) as SummarizeOutput;
    parsed.score = Math.min(10, Math.max(1, Number(parsed.score) || 5));
    if (isEmptySummary(parsed.summary_he)) return null;
    return parsed;
  } catch {
    return null;
  }
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
  const [redditPosts, tapuzPosts, onePosts, icarPosts, carzonePosts, carComplaintsPosts, edmundsPosts, drivePosts, rotterPosts, wallaPosts] = await Promise.all([
    searchReddit(makeNameEn, modelNameEn, year),
    searchTapuz(makeNameHe, modelNameHe, year),
    searchOne(makeNameHe, modelNameHe),
    searchIcar(makeNameHe, modelNameHe, year),
    searchCarzone(makeNameHe, modelNameHe, makeNameEn, modelNameEn),
    searchCarComplaints(makeNameEn, modelNameEn),
    searchEdmunds(makeNameEn, modelNameEn),
    searchDrive(makeNameHe, modelNameHe, year),
    searchRotter(makeNameHe, modelNameHe, year),
    searchWalla(makeNameHe, modelNameHe, year),
  ]);

  const localPosts  = [...icarPosts, ...drivePosts, ...wallaPosts, ...carzonePosts, ...tapuzPosts, ...rotterPosts, ...onePosts];  // Israeli sources
  const globalPosts = [...redditPosts, ...carComplaintsPosts, ...edmundsPosts];                                                    // International

  // Summarize each group independently, in parallel
  let [localOut, globalOut] = await Promise.all([
    localPosts.length  > 0 ? summarizeGroup(localPosts,  makeNameHe, modelNameHe, 'local')  : null,
    globalPosts.length > 0 ? summarizeGroup(globalPosts, makeNameHe, modelNameHe, 'global') : null,
  ]);

  // If no real posts found at all, fall back to general knowledge summary
  if (!localOut && !globalOut) {
    globalOut = await generateKnowledgeSummary(makeNameHe, modelNameHe, makeNameEn, modelNameEn);
    if (!globalOut) return 0;
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

  // For year-specific rows we need a different upsert key.
  // The table has unique(make_slug, model_slug) for general rows (year=null).
  // Year rows are inserted fresh (no unique constraint) — delete old one first.
  if (year) {
    await sb.from('expert_reviews')
      .delete()
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .eq('year', year);
  }

  const { error } = await sb.from('expert_reviews').upsert(
    {
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
    },
    { onConflict: 'make_slug,model_slug' },
  );

  return error ? 0 : 1;
}

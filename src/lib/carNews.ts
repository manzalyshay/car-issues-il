/**
 * Car news scraper + AI rewriter.
 * Fetches RSS feeds from global automotive news sources,
 * rewrites articles in Hebrew using Workers AI, and stores in D1.
 */
import { dbRun, dbAll } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';
import { parseNewsSegment } from './newsSlug';

export interface CarNewsItem {
  id: string;
  source: string;
  original_url: string;
  title_he: string | null;
  body_he: string | null;
  title_en: string | null;
  body_en: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
}

/** RSS source definitions */
const SOURCES = [
  { key: 'motor1',       url: 'https://www.motor1.com/rss/news/all/',    name: 'Motor1' },
  { key: 'caranddriver', url: 'https://www.caranddriver.com/rss/all.xml/', name: 'Car and Driver' },
];

/** Simple SHA-1 hex using Web Crypto (available in Workers) */
async function urlHash(url: string): Promise<string> {
  const enc = new TextEncoder().encode(url);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl: string | null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemBlocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of itemBlocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
        || block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    const title = stripHtml(get('title'));
    const link = get('link') || block.match(/https?:\/\/[^\s<>"]+/)?.[0] || '';
    const description = stripHtml(get('description'));
    const pubDate = get('pubDate');
    // Try enclosure or media:content for image
    const imgM = block.match(/enclosure[^>]+url="([^"]+)"/i)
      || block.match(/media:content[^>]+url="([^"]+)"/i)
      || block.match(/media:thumbnail[^>]+url="([^"]+)"/i);
    const imageUrl = imgM ? imgM[1] : null;

    if (title && link) items.push({ title, link: link.trim(), description, pubDate, imageUrl });
  }
  return items;
}

async function fetchRss(url: string): Promise<RssItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CarIssues/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml);
  } catch {
    return [];
  }
}

/**
 * Fetch the full article body from the original URL.
 * Extracts <p> paragraphs from the main article container.
 * Returns null on failure so callers can fall back to the RSS description.
 */
async function fetchArticleBody(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;

    // Read only the first 200KB to avoid memory issues on long pages
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 200_000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel();
    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => { const n = new Uint8Array(acc.length + c.length); n.set(acc); n.set(c, acc.length); return n; }, new Uint8Array(0))
    );

    return extractArticleText(html);
  } catch {
    return null;
  }
}

/**
 * Extract clean article text from HTML.
 * Tries common article containers, then falls back to all <p> tags.
 */
function extractArticleText(html: string): string | null {
  // Remove script, style, nav, header, footer, aside, figure blocks entirely
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '');

  // Try to isolate the article body using common class/id patterns
  const articlePatterns = [
    /(<article[^>]*>[\s\S]*?<\/article>)/i,
    /(<div[^>]+class="[^"]*(?:article-body|article__body|story-body|post-body|entry-content|article-content|content-body|single-article|article-text)[^"]*"[^>]*>[\s\S]*?<\/div>)/i,
    /(<div[^>]+id="[^"]*(?:article-body|story-body|post-body|article-content)[^"]*"[^>]*>[\s\S]*?<\/div>)/i,
  ];

  let articleHtml = cleaned;
  for (const pat of articlePatterns) {
    const m = cleaned.match(pat);
    if (m) { articleHtml = m[1]; break; }
  }

  // Extract text from <p> tags
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(articleHtml)) !== null) {
    const text = stripHtml(match[1]).replace(/\s+/g, ' ').trim();
    if (text.length > 40) paragraphs.push(text); // skip very short fragments
  }

  if (!paragraphs.length) return null;

  // Return up to ~3000 chars of article body
  let body = '';
  for (const p of paragraphs) {
    if (body.length + p.length > 3000) break;
    body += p + '\n\n';
  }
  return body.trim() || null;
}

function buildHebrewPrompt(titleEn: string, bodyEn: string): string {
  const source = bodyEn.slice(0, 3000);
  return `You are an Israeli automotive journalist writing for carissues.co.il.

Your job: rewrite the source material below as a proper Hebrew news article in your own words.

Rules:
- Every specific claim (numbers, specs, prices, quotes, names, dates) must come from the source — do not invent them.
- You MAY add well-known, undisputed background context about the car model, brand, or technology to fill out the article (e.g. "Toyota is known for reliability", "the model is in its third generation"). Only add context you are 100% certain is accurate.
- Do NOT speculate about Israeli pricing, local availability, or future plans unless the source says so.
- Brand and model names stay as in the source (Latin letters OK).
- Natural Israeli Hebrew, news tone, no marketing phrases.

Length: 2–4 paragraphs, 200–350 words.

Return ONLY a JSON object (no markdown fences):
{"title": "<Hebrew headline>", "body": "<Hebrew article, paragraphs separated by \\n\\n>"}

Source title: ${titleEn}
Source content: ${source}`;
}

function parseHebrewJson(raw: string): { titleHe: string; bodyHe: string } | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed?.title || !parsed?.body) return null;
  return { titleHe: parsed.title.trim(), bodyHe: parsed.body.trim() };
}

async function rewriteWithGemini(titleEn: string, bodyEn: string): Promise<{ titleHe: string; bodyHe: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildHebrewPrompt(titleEn, bodyEn) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!raw) return null;
    return parseHebrewJson(raw);
  } catch {
    return null;
  }
}

async function rewriteWithWorkersAI(titleEn: string, bodyEn: string): Promise<{ titleHe: string; bodyHe: string } | null> {
  try {
    const raw = await runWorkersAI([{ role: 'user', content: buildHebrewPrompt(titleEn, bodyEn) }], { max_tokens: 1200, temperature: 0.2 });
    if (!raw) return null;
    return parseHebrewJson(raw);
  } catch {
    return null;
  }
}

async function rewriteInHebrew(titleEn: string, bodyEn: string): Promise<{ titleHe: string; bodyHe: string } | null> {
  return rewriteWithGemini(titleEn, bodyEn);
}

export async function ensureNewsTable(): Promise<void> {
  await dbRun(`CREATE TABLE IF NOT EXISTS car_news (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    original_url TEXT NOT NULL UNIQUE,
    title_he TEXT,
    body_he TEXT,
    title_en TEXT,
    body_en TEXT,
    image_url TEXT,
    published_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    hidden INTEGER DEFAULT 0
  )`);
  // Index won't fail if already exists (SQLite CREATE INDEX IF NOT EXISTS)
  await dbRun(`CREATE INDEX IF NOT EXISTS car_news_published_at ON car_news(published_at DESC)`).catch(() => {});
  // Add hidden column if table already existed without it
  await dbRun(`ALTER TABLE car_news ADD COLUMN hidden INTEGER DEFAULT 0`).catch(() => {});
}

/**
 * Fetch new articles from all sources, rewrite in Hebrew, save to D1.
 * @param maxPerRun Max articles to process (to control AI cost)
 * @returns Number of new articles saved
 */
export async function refreshCarNews(maxPerRun = 15): Promise<number> {
  await ensureNewsTable();

  // Load existing IDs to skip already-stored articles
  const existing = await dbAll<{ id: string }>('SELECT id FROM car_news');
  const existingIds = new Set(existing.map(r => r.id));

  const toProcess: Array<{ source: string; item: RssItem }> = [];

  for (const source of SOURCES) {
    const items = await fetchRss(source.url);
    for (const item of items) {
      const id = await urlHash(item.link);
      if (!existingIds.has(id)) {
        toProcess.push({ source: source.key, item });
      }
    }
  }

  if (toProcess.length === 0) return 0;

  // Limit per run to control cost
  const batch = toProcess.slice(0, maxPerRun);
  let saved = 0;

  for (const { source, item } of batch) {
    const id = await urlHash(item.link);

    // Try to fetch the full article; fall back to RSS description if it fails
    const fullBody = await fetchArticleBody(item.link);
    const articleBody = fullBody ?? item.description;

    const rewritten = await rewriteInHebrew(item.title, articleBody);

    await dbRun(
      `INSERT OR IGNORE INTO car_news (id, source, original_url, title_he, body_he, title_en, body_en, image_url, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      source,
      item.link,
      rewritten?.titleHe ?? null,
      rewritten?.bodyHe ?? null,
      item.title,
      // Store the full body_en so retranslation also benefits from it
      (articleBody).slice(0, 3000),
      item.imageUrl,
      item.pubDate ? new Date(item.pubDate).toISOString() : null,
    );
    saved++;
  }

  return saved;
}

/**
 * Retry translation for articles that previously failed (title_he IS NULL).
 * @param maxRetry Max articles to retry per call
 */
export async function retranslateUntranslated(maxRetry = 10): Promise<number> {
  const rows = await dbAll<{ id: string; title_en: string | null; body_en: string | null }>(
    `SELECT id, title_en, body_en FROM car_news WHERE (title_he IS NULL OR body_he IS NULL) AND title_en IS NOT NULL AND body_en IS NOT NULL ORDER BY published_at DESC LIMIT ?`,
    maxRetry,
  );
  let fixed = 0;
  for (const row of rows) {
    if (!row.title_en || !row.body_en) continue;
    const result = await rewriteInHebrew(row.title_en, row.body_en);
    if (result) {
      await dbRun(`UPDATE car_news SET title_he=?, body_he=? WHERE id=?`, result.titleHe, result.bodyHe, row.id);
      fixed++;
    }
  }
  return fixed;
}

export async function getLatestNews(limit = 20, offset = 0, locale?: string): Promise<CarNewsItem[]> {
  const conditions = ['(hidden IS NULL OR hidden = 0)'];
  if (locale === 'he') conditions.push('title_he IS NOT NULL AND body_he IS NOT NULL');
  else if (locale === 'en') conditions.push('title_en IS NOT NULL AND body_en IS NOT NULL');
  const where = `WHERE ${conditions.join(' AND ')}`;
  return dbAll<CarNewsItem>(
    `SELECT * FROM car_news ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    limit, offset,
  );
}

export async function getNewsArticle(id: string): Promise<CarNewsItem | null> {
  const rows = await dbAll<CarNewsItem>(`SELECT * FROM car_news WHERE id = ? AND (hidden IS NULL OR hidden = 0) LIMIT 1`, id);
  return rows[0] ?? null;
}

/** Resolve a /news/[id] URL segment (legacy 40-hex hash or `slug-shortid`) to an article. */
export async function getNewsArticleBySegment(segment: string): Promise<CarNewsItem | null> {
  const parsed = parseNewsSegment(segment);
  if (!parsed) return null;
  if ('fullId' in parsed) return getNewsArticle(parsed.fullId);
  // idPrefix is validated hex, so it's safe inside LIKE
  const rows = await dbAll<CarNewsItem>(
    `SELECT * FROM car_news WHERE id LIKE ? AND (hidden IS NULL OR hidden = 0) ORDER BY published_at DESC LIMIT 1`,
    `${parsed.idPrefix}%`,
  );
  return rows[0] ?? null;
}

/**
 * Retranslate articles that have a very short body_he (likely generated by Workers AI).
 * Forces regeneration with Claude/Gemini for proper length and quality.
 */
export async function retranslateShort(maxRetry = 10, minBodyLen = 150): Promise<number> {
  const rows = await dbAll<{ id: string; title_en: string | null; body_en: string | null }>(
    `SELECT id, title_en, body_en FROM car_news WHERE body_he IS NOT NULL AND length(body_he) < ? AND title_en IS NOT NULL AND body_en IS NOT NULL ORDER BY published_at DESC LIMIT ?`,
    String(minBodyLen), String(maxRetry),
  );
  let fixed = 0;
  for (const row of rows) {
    if (!row.title_en || !row.body_en) continue;
    const result = await rewriteInHebrew(row.title_en, row.body_en);
    if (result) {
      await dbRun(`UPDATE car_news SET title_he=?, body_he=? WHERE id=?`, result.titleHe, result.bodyHe, row.id);
      fixed++;
    }
  }
  return fixed;
}

export async function deleteNewsArticle(id: string): Promise<void> {
  await dbRun(`DELETE FROM car_news WHERE id = ?`, id);
}

export async function hideNewsArticle(id: string): Promise<void> {
  await dbRun(`UPDATE car_news SET hidden = 1 WHERE id = ?`, id);
}

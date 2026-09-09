/**
 * Car news scraper + AI rewriter.
 * Fetches RSS feeds from global automotive news sources,
 * rewrites articles in Hebrew using Workers AI, and stores in D1.
 */
import { dbRun, dbAll } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';

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

async function rewriteInHebrew(titleEn: string, bodyEn: string): Promise<{ titleHe: string; bodyHe: string } | null> {
  const prompt = `You are an Israeli automotive journalist writing for carissues.co.il.
Rewrite the following car news article in natural, engaging Hebrew — as if you wrote it originally, not as a translation.
Keep the facts accurate. Use Israeli automotive terminology. Keep it under 200 words.

Return ONLY a JSON object:
{"title": "<Hebrew title>", "body": "<Hebrew article body>"}

Original title: ${titleEn}
Original summary: ${bodyEn.slice(0, 800)}`;

  try {
    const raw = await runWorkersAI([{ role: 'user', content: prompt }], { max_tokens: 600, temperature: 0.4 });
    if (!raw) return null;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed?.title || !parsed?.body) return null;
    return { titleHe: parsed.title.trim(), bodyHe: parsed.body.trim() };
  } catch {
    return null;
  }
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
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Index won't fail if already exists (SQLite CREATE INDEX IF NOT EXISTS)
  await dbRun(`CREATE INDEX IF NOT EXISTS car_news_published_at ON car_news(published_at DESC)`).catch(() => {});
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
    const rewritten = await rewriteInHebrew(item.title, item.description);

    await dbRun(
      `INSERT OR IGNORE INTO car_news (id, source, original_url, title_he, body_he, title_en, body_en, image_url, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      source,
      item.link,
      rewritten?.titleHe ?? null,
      rewritten?.bodyHe ?? null,
      item.title,
      item.description.slice(0, 500),
      item.imageUrl,
      item.pubDate ? new Date(item.pubDate).toISOString() : null,
    );
    saved++;
  }

  return saved;
}

export async function getLatestNews(limit = 20, offset = 0): Promise<CarNewsItem[]> {
  return dbAll<CarNewsItem>(
    `SELECT * FROM car_news ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    limit, offset,
  );
}

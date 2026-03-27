import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  summary: string;
  imageUrl: string;
  source: string;
  sourceLang: 'he' | 'en';
  category: 'test' | 'recall' | 'safety' | 'electric' | 'market' | 'launch' | 'tips' | 'general';
  publishedAt: string;
  savedAt: string;
}

// ── Source definitions ────────────────────────────────────────────────────────

const SOURCES: { url: string; name: string; lang: 'he' | 'en'; filterCars: boolean }[] = [
  // Israeli — general RSS, filter to car content only
  { url: 'https://rss.walla.co.il/feed/22',                   name: 'וואלה! רכב',     lang: 'he', filterCars: true  },
  { url: 'https://www.ynet.co.il/Integration/StoryRss2.xml',   name: 'Ynet רכב',       lang: 'he', filterCars: true  },

  // Global — dedicated car publications, all content is car-related
  { url: 'https://www.caranddriver.com/rss/all.xml/',           name: 'Car and Driver',  lang: 'en', filterCars: false },
  { url: 'https://www.autocar.co.uk/rss',                       name: 'Autocar',         lang: 'en', filterCars: false },
  { url: 'https://www.autoexpress.co.uk/feed/all',              name: 'Auto Express',    lang: 'en', filterCars: false },
  { url: 'https://www.carscoops.com/feed/',                     name: 'Carscoops',       lang: 'en', filterCars: false },
  { url: 'https://www.motor1.com/rss/news/all/',                name: 'Motor1',          lang: 'en', filterCars: false },
  { url: 'https://electrek.co/feed/',                           name: 'Electrek',        lang: 'en', filterCars: false },
  { url: 'https://www.roadandtrack.com/rss/all.xml/',           name: 'Road & Track',    lang: 'en', filterCars: false },
];

// ── Car keyword filter (Hebrew sources only) ──────────────────────────────────

const CAR_KEYWORDS_HE = [
  'רכב', 'מכונית', 'מכוניות', 'אוטו', 'נהיגה', 'נהג', 'מנוע',
  'ריקול', 'קריאה לתיקון', 'חשמלי', 'היברידי', 'גיר',
  'SUV', 'סדאן', 'האצ\'בק', 'קרוסאובר',
  'טסלה', 'טויוטה', 'יונדאי', 'קיה', 'פולקסווגן', 'ב.מ.וו', 'מרצדס',
  'מאזדה', 'הונדה', 'ניסאן', 'רנו', 'פיג\'ו', 'סקודה', 'אאודי',
  'מבחן דרכים', 'מבחן רכב', 'השקה', 'נסיעת מבחן',
  'בטיחות רכב', 'ביטוח רכב', 'רישוי',
  'טעינה', 'עמדת טעינה', 'EV', 'EV ',
  'דלק', 'בנזין', 'דיזל',
];

function isCarRelated(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  return CAR_KEYWORDS_HE.some((kw) => text.includes(kw));
}

// ── Category detection ────────────────────────────────────────────────────────

function detectCategory(text: string): NewsArticle['category'] {
  const t = text.toLowerCase();
  if (t.includes('ריקול') || t.includes('קריאה לתיקון') || t.includes('recall')) return 'recall';
  if (t.includes('בטיחות') || t.includes('תאונה') || t.includes('crash') || t.includes('safety')) return 'safety';
  if (t.includes('חשמלי') || t.includes('ev ') || t.includes('electric') || t.includes('טעינה') || t.includes('charging')) return 'electric';
  if (t.includes('השקה') || t.includes('חדש') || t.includes('launch') || t.includes('reveal') || t.includes('debut') || t.includes('unveiled') || t.includes('new ')) return 'launch';
  if (t.includes('מבחן') || t.includes('נסיעת מבחן') || t.includes('review') || t.includes('test drive') || t.includes('first drive')) return 'test';
  if (t.includes('מחיר') || t.includes('שוק') || t.includes('price') || t.includes('sales') || t.includes('market')) return 'market';
  if (t.includes('טיפ') || t.includes('תחזוקה') || t.includes('tips') || t.includes('maintenance')) return 'tips';
  return 'general';
}

// ── RSS helpers ───────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractImage(item: string): string {
  // Prefer media:content, then media:thumbnail, then enclosure, then first <img>
  let m = item.match(/<media:content[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = item.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = item.match(/<enclosure[^>]+url="([^"]+\.(jpe?g|png|webp)[^"]*)"/i);
  if (m) return m[1];
  m = item.match(/<img[^>]+src="([^"]+)"/i);
  if (m) return m[1];
  // og:image in CDATA description
  m = item.match(/og:image[^"]*"([^"]+)"/i);
  if (m) return m[1];
  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeCarNews(): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  await Promise.all(SOURCES.map(async (source) => {
    try {
      const resp = await fetch(source.url, {
        headers: { 'User-Agent': 'CarIssuesIL/1.0', Accept: 'application/rss+xml, application/xml, */*' },
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) return;
      const xml = await resp.text();

      const itemRe = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;
      while ((match = itemRe.exec(xml)) !== null) {
        const item = match[1];
        const title = stripHtml(extractTag(item, 'title'));
        const url = (extractTag(item, 'link') || item.match(/<link>([^<]+)<\/link>/i)?.[1] || '').trim();
        const description = stripHtml(extractTag(item, 'description') || '');
        const pubDate = extractTag(item, 'pubDate') || '';
        if (!title || !url || url === '#') continue;

        // Filter Hebrew general-news sources to car content only
        if (source.filterCars && !isCarRelated(title, description)) continue;

        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

        articles.push({
          id: `n_${Buffer.from(url).toString('base64').slice(0, 16)}`,
          title,
          url,
          summary: description.slice(0, 400),
          imageUrl: extractImage(item),
          source: source.name,
          sourceLang: source.lang,
          category: detectCategory(`${title} ${description}`),
          publishedAt,
          savedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Source unavailable — skip silently
    }
  }));

  // Deduplicate by URL, sort newest first
  const seen = new Set<string>();
  return articles
    .filter((a) => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

// ── DB cache ──────────────────────────────────────────────────────────────────

export async function getCachedNews(): Promise<NewsArticle[]> {
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from('news_cache')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(200);
    if (!data || data.length === 0) return SEED_NEWS;
    return data.map((r: any) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      summary: r.summary,
      imageUrl: r.image_url,
      source: r.source,
      sourceLang: (r.source_lang ?? 'he') as 'he' | 'en',
      category: r.category,
      publishedAt: r.published_at,
      savedAt: r.scraped_at,
    }));
  } catch {
    return SEED_NEWS;
  }
}

export async function saveNewsCache(articles: NewsArticle[]): Promise<void> {
  if (articles.length === 0) return;
  const sb = getSupabase();
  const rows = articles.map((a) => ({
    title: a.title,
    url: a.url,
    summary: a.summary,
    image_url: a.imageUrl,
    source: a.source,
    source_lang: a.sourceLang,
    category: a.category,
    published_at: a.publishedAt,
    scraped_at: new Date().toISOString(),
  }));
  await sb.from('news_cache').upsert(rows, { onConflict: 'url', ignoreDuplicates: true });
}

// ── Category metadata ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<NewsArticle['category'], string> = {
  test:     'מבחן דרכים',
  launch:   'השקה',
  recall:   'ריקול',
  safety:   'בטיחות',
  electric: 'חשמלי',
  market:   'שוק הרכב',
  tips:     'טיפים',
  general:  'כללי',
};

// ── Seed data (shown only when DB is completely empty) ────────────────────────
export const SEED_NEWS: NewsArticle[] = [
  {
    id: 'seed_n1',
    title: 'יונדאי מוציאה קריאה לתיקון 15,000 רכבי טוקסון בישראל',
    url: '#',
    summary: 'יונדאי ישראל הודיעה על קריאה לתיקון לרכבי טוקסון מדגמי 2019-2021 עקב ליקוי פוטנציאלי בבלמים.',
    imageUrl: '',
    source: 'וואלה! רכב',
    sourceLang: 'he',
    category: 'recall',
    publishedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
  {
    id: 'seed_n2',
    title: 'מבחן דרכים: מאזדה CX-5 2024 — האם שווה המחיר?',
    url: '#',
    summary: 'יצאנו לנסיעת מבחן עם CX-5 2024 המחודשת. ניכרים שיפורים משמעותיים בנוחות ובמערכות הבטיחות.',
    imageUrl: '',
    source: 'Ynet רכב',
    sourceLang: 'he',
    category: 'test',
    publishedAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
];

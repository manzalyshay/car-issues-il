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
  category: 'test' | 'recall' | 'safety' | 'electric' | 'market' | 'tips' | 'general';
  publishedAt: string;
  savedAt: string;
}

// Hebrew keywords for car-related articles
const CAR_KEYWORDS = [
  'רכב', 'רכבים', 'מכונית', 'מכוניות', 'אוטו', 'מנוע', 'גיר', 'גלגלים', 'בטיחות',
  'נסיעה', 'נהיגה', 'נהג', 'תאונה', 'ביטוח', 'רישוי', 'חשמלי', 'היברידי',
  'SUV', 'סדאן', 'טסלה', 'טויוטה', 'יונדאי', 'קיה', 'פולקסווגן', 'BMW', 'מרצדס',
  'מאזדה', 'סובארו', 'ניסאן', 'רנו', 'פיג\'ו', 'קריאה', 'ריקול', 'תזכורת',
  'דלק', 'בנזין', 'דיזל', 'חשמל', 'טעינה', 'עמדת טעינה',
];

function detectCategory(text: string): NewsArticle['category'] {
  const lower = text.toLowerCase();
  if (lower.includes('ריקול') || lower.includes('קריאה') || lower.includes('recall')) return 'recall';
  if (lower.includes('בטיחות') || lower.includes('תאונה') || lower.includes('safety')) return 'safety';
  if (lower.includes('חשמלי') || lower.includes('EV') || lower.includes('טסלה') || lower.includes('טעינה')) return 'electric';
  if (lower.includes('מחיר') || lower.includes('שוק') || lower.includes('מכירות')) return 'market';
  if (lower.includes('טיפ') || lower.includes('תחזוקה') || lower.includes('אחריות')) return 'tips';
  if (lower.includes('מבחן') || lower.includes('נסיעת מבחן')) return 'test';
  return 'general';
}

function isCarRelated(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  return CAR_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractImage(item: string): string {
  let m = item.match(/<media:content[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = item.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = item.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = item.match(/<img[^>]+src="([^"]+)"/i);
  if (m) return m[1];
  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const SOURCES = [
  { url: 'https://www.ynet.co.il/Integration/StoryRss2.xml', name: 'ynet' },
  { url: 'https://rss.walla.co.il/feed/22', name: 'וואלה!' },
  { url: 'https://www.mako.co.il/rss/31.xml', name: 'N12' },
];

export async function scrapeCarNews(): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  for (const source of SOURCES) {
    try {
      const resp = await fetch(source.url, {
        headers: { 'User-Agent': 'CarIssuesIL/1.0', Accept: 'application/rss+xml, application/xml, */*' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) continue;
      const xml = await resp.text();

      const itemRe = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;
      while ((match = itemRe.exec(xml)) !== null) {
        const item = match[1];
        const title = stripHtml(extractTag(item, 'title'));
        const url = (extractTag(item, 'link') || item.match(/<link>([^<]+)<\/link>/i)?.[1] || '').trim();
        const description = stripHtml(extractTag(item, 'description') || '');
        const pubDate = extractTag(item, 'pubDate') || '';
        if (!title || !url) continue;
        if (!isCarRelated(title, description)) continue;

        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

        articles.push({
          id: `n_${Buffer.from(url).toString('base64').slice(0, 16)}`,
          title,
          url,
          summary: description.slice(0, 400),
          imageUrl: extractImage(item),
          source: source.name,
          category: detectCategory(`${title} ${description}`),
          publishedAt,
          savedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Source unavailable — skip silently
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

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
    category: a.category,
    published_at: a.publishedAt,
    scraped_at: new Date().toISOString(),
  }));
  // upsert on url — skip duplicates
  await sb.from('news_cache').upsert(rows, { onConflict: 'url', ignoreDuplicates: true });
}

// ── Seed news ────────────────────────────────────────────────────────────────
export const SEED_NEWS: NewsArticle[] = [
  {
    id: 'seed_n1',
    title: 'יונדאי מוציאה קריאה לתיקון 15,000 רכבי טוקסון בישראל',
    url: '#',
    summary: 'יונדאי ישראל הודיעה על קריאה לתיקון לרכבי טוקסון מדגמי 2019-2021 עקב ליקוי פוטנציאלי בבלמים. בעלי הרכבים יקבלו הודעה ישירה.',
    imageUrl: '',
    source: 'דרייב',
    category: 'recall',
    publishedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
  {
    id: 'seed_n2',
    title: 'מבחן דרכים: מאזדה CX-5 2024 — האם שווה המחיר?',
    url: '#',
    summary: 'יצאנו לנסיעת מבחן עם CX-5 2024 המחודשת. ניכרים שיפורים משמעותיים בנוחות ובמערכות הבטיחות, אך המחיר עלה ב-15% לעומת שנה שעברה.',
    imageUrl: '',
    source: 'automarket',
    category: 'test',
    publishedAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
  {
    id: 'seed_n3',
    title: '10 בעיות נפוצות ברכבים חשמליים בישראל — ומה לעשות',
    url: '#',
    summary: 'עם גידול ברכישת רכבים חשמליים בישראל, יותר ויותר בעלים מדווחים על בעיות ספציפיות. כינסנו את הנפוצות ביותר עם פתרונות.',
    imageUrl: '',
    source: 'Walla! רכב',
    category: 'electric',
    publishedAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
  {
    id: 'seed_n4',
    title: 'מדריך: כיצד לבדוק רכב יד שנייה לפני הרכישה',
    url: '#',
    summary: 'קניית רכב יד שנייה בישראל מצריכה בדיקה מקיפה. הנה הצ\'קליסט המלא: בדיקת קילומטרז\', היסטוריה, בדיקת מוסך ועוד.',
    imageUrl: '',
    source: 'Ynet רכב',
    category: 'tips',
    publishedAt: new Date(Date.now() - 10 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
  {
    id: 'seed_n5',
    title: 'פולקסווגן ישראל: מחיר הGolf GTI עולה ב-8,000 שקל',
    url: '#',
    summary: 'פולקסווגן ישראל עדכנה מחירים לחלק מהדגמים, כאשר Golf GTI קופץ ל-189,000 שקל. הנציגות מסבירה את העלייה בשינויי שע"ח.',
    imageUrl: '',
    source: 'TheMarker רכב',
    category: 'market',
    publishedAt: new Date(Date.now() - 14 * 864e5).toISOString(),
    savedAt: new Date().toISOString(),
  },
];

export const CATEGORY_LABELS: Record<NewsArticle['category'], string> = {
  test: 'מבחן דרכים',
  recall: 'ריקול',
  safety: 'בטיחות',
  electric: 'חשמלי',
  market: 'שוק הרכב',
  tips: 'טיפים',
  general: 'כללי',
};

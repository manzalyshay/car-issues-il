import { dbAll, dbRun } from './db';
import { randomUUID } from 'crypto';

export interface CarVideo {
  id: string;
  make_slug: string;
  model_slug: string;
  youtube_id: string;
  title: string;
  channel: string;
  published_at: string;
  thumbnail_url: string;
  year: number | null;
}

interface YouTubeText { runs?: Array<{ text?: string }>; simpleText?: string; }
interface YouTubeVideoRenderer {
  videoId?: string;
  title?: YouTubeText;
  ownerText?: YouTubeText;
  publishedTimeText?: YouTubeText;
  thumbnail?: { thumbnails?: Array<{ url?: string }> };
}
interface YouTubeSearchItem { videoRenderer?: YouTubeVideoRenderer; }
interface YouTubeSearchResponse {
  contents?: { twoColumnSearchResultsRenderer?: { primaryContents?: { sectionListRenderer?: { contents?: Array<{ itemSectionRenderer?: { contents?: YouTubeSearchItem[] } }> } } } };
}

// Words that indicate a video is NOT a review
const SPAM_TITLE_KEYWORDS = [
  'for sale', 'למכירה', 'buy now', 'price', 'מחיר', 'auction', 'מכרז',
  'crash', 'accident', 'תאונה', 'crash test', 'recall', 'unboxing',
  'how to', 'איך ל', 'diy', 'repair', 'תיקון', 'install', 'התקנה',
  'parking', 'חניה', 'wash', 'שטיפה', 'wrap', 'ציפוי',
  'tow', 'גרירה', 'stolen', 'נגנב', 'prank',
];

// Words that indicate a video IS likely a review
const REVIEW_TITLE_KEYWORDS = [
  'review', 'ביקורת', 'test drive', 'טסט', 'first drive', 'נסיעת מבחן',
  'long term', 'ownership', 'worth it', 'should you buy', 'כדאי לקנות',
  'vs', 'comparison', 'השוואה', 'rating', 'דירוג', 'impressions',
  'driven', 'נסענו', 'experience', 'חוויה', 'honest', 'כנה',
];

function isLikelyReview(title: string): boolean {
  const lower = title.toLowerCase();

  // Reject if contains spam keywords
  if (SPAM_TITLE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))) return false;

  // Boost if title contains review keywords (but don't require — some reviews have plain titles)
  const hasReviewSignal = REVIEW_TITLE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));

  // Reject very short titles (likely clickbait) or extremely long ones
  if (title.length < 10 || title.length > 120) return false;

  return hasReviewSignal || true; // pass through if no explicit spam signal
}

export async function getVideosForCar(makeSlug: string, modelSlug: string): Promise<CarVideo[]> {
  return dbAll<CarVideo>(
    'SELECT * FROM car_videos WHERE make_slug = ? AND model_slug = ? ORDER BY published_at DESC LIMIT 12',
    makeSlug, modelSlug,
  );
}

export async function getVideosForYear(makeSlug: string, modelSlug: string, year: number): Promise<CarVideo[]> {
  // Try year-tagged videos first
  const yearVideos = await dbAll<CarVideo>(
    'SELECT * FROM car_videos WHERE make_slug = ? AND model_slug = ? AND year = ? ORDER BY published_at DESC LIMIT 12',
    makeSlug, modelSlug, year,
  );
  if (yearVideos.length > 0) return yearVideos;

  // Fall back: any video whose title mentions the year
  const all = await getVideosForCar(makeSlug, modelSlug);
  const yearStr = String(year);
  const titled = all.filter(v => v.title.includes(yearStr));
  return titled.length > 0 ? titled : all;
}

/** Search YouTube via the public InnerTube API — no API key required. */
async function youtubeSearch(query: string): Promise<Array<{
  ytId: string; title: string; channel: string;
  publishedAt: string; thumbnail: string;
}>> {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00' } },
        query,
        params: 'EgIQAQ%3D%3D', // filter: videos only
      }),
    });
    if (!res.ok) return [];
    const data = await res.json() as YouTubeSearchResponse;
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ?? [];

    return contents
      .filter((c): c is YouTubeSearchItem & { videoRenderer: YouTubeVideoRenderer } => Boolean(c.videoRenderer))
      .map(({ videoRenderer: v }) => {
        const ytId: string = v.videoId ?? '';
        const title: string = v.title?.runs?.[0]?.text ?? '';
        const channel: string = v.ownerText?.runs?.[0]?.text ?? '';
        const publishedAt: string = v.publishedTimeText?.simpleText ?? '';
        const thumbnail: string =
          v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ?? // largest thumbnail
          `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        return { ytId, title, channel, publishedAt, thumbnail };
      })
      .filter(v => v.ytId && v.title);
  } catch {
    return [];
  }
}

export async function fetchAndStoreVideos(
  makeSlug: string,
  modelSlug: string,
  makeEn: string,
  modelEn: string,
  makeHe: string,
  modelHe: string,
  year?: number,
): Promise<{ inserted: number; skipped: number; error?: string }> {
  const yearSuffix = year ? ` ${year}` : '';
  const queries = year ? [
    `${makeEn} ${modelEn}${yearSuffix} review`,
    `${makeEn} ${modelEn}${yearSuffix} test drive`,
    `${makeHe} ${modelHe}${yearSuffix} ביקורת`,
  ] : [
    `${makeEn} ${modelEn} review`,
    `${makeEn} ${modelEn} test drive`,
    `${makeHe} ${modelHe} ביקורת`,
  ];

  const seen = new Set<string>();
  const videos: Omit<CarVideo, 'id'>[] = [];
  let skipped = 0;

  for (const q of queries) {
    try {
      const results = await youtubeSearch(q);
      for (const { ytId, title, channel, publishedAt, thumbnail } of results) {
        if (!ytId || seen.has(ytId)) continue;
        seen.add(ytId);

        if (!isLikelyReview(title)) { skipped++; continue; }

        videos.push({
          make_slug: makeSlug,
          model_slug: modelSlug,
          youtube_id: ytId,
          title,
          channel,
          published_at: publishedAt,
          thumbnail_url: thumbnail,
          year: year ?? null,
        });
      }
    } catch { /* skip failed query */ }
  }

  if (!videos.length) return { inserted: 0, skipped };

  for (const v of videos) {
    await dbRun(
      `INSERT OR REPLACE INTO car_videos (id, make_slug, model_slug, youtube_id, title, channel, published_at, thumbnail_url, year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(), v.make_slug, v.model_slug, v.youtube_id, v.title, v.channel, v.published_at, v.thumbnail_url, v.year ?? null,
    ).catch(() => {});
  }
  return { inserted: videos.length, skipped };
}

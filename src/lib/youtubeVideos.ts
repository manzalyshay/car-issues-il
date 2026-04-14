import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';

export interface CarVideo {
  id: string;
  make_slug: string;
  model_slug: string;
  youtube_id: string;
  title: string;
  channel: string;
  published_at: string;
  thumbnail_url: string;
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

export const getVideosForCar = unstable_cache(
  async (makeSlug: string, modelSlug: string): Promise<CarVideo[]> => {
    const sb = getServiceClient();
    const { data } = await sb
      .from('car_videos')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .order('published_at', { ascending: false })
      .limit(12);
    return (data ?? []) as CarVideo[];
  },
  ['car-videos'],
  {
    revalidate: 86400, // 24h fallback
    tags: ['car-media'],
  },
);

export async function fetchAndStoreVideos(
  makeSlug: string,
  modelSlug: string,
  makeEn: string,
  modelEn: string,
  makeHe: string,
  modelHe: string,
): Promise<{ inserted: number; skipped: number; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { inserted: 0, skipped: 0, error: 'YOUTUBE_API_KEY missing' };

  // Search with review-specific queries to get better results up front
  const queries = [
    `${makeEn} ${modelEn} review`,
    `${makeEn} ${modelEn} test drive`,
    `${makeHe} ${modelHe} ביקורת`,
  ];

  const seen = new Set<string>();
  const videos: Omit<CarVideo, 'id'>[] = [];
  let skipped = 0;

  for (const q of queries) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('videoDuration', 'medium'); // 4–20 min — filters out clips & full films
    url.searchParams.set('relevanceLanguage', 'iw');
    url.searchParams.set('key', apiKey);

    try {
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!data.items) continue;

      for (const item of data.items) {
        const ytId: string = item.id?.videoId;
        if (!ytId || seen.has(ytId)) continue;
        seen.add(ytId);

        const title: string = item.snippet.title ?? '';
        const channel: string = item.snippet.channelTitle ?? '';

        // Filter: must look like a real review
        if (!isLikelyReview(title)) {
          skipped++;
          continue;
        }

        videos.push({
          make_slug: makeSlug,
          model_slug: modelSlug,
          youtube_id: ytId,
          title,
          channel,
          published_at: item.snippet.publishedAt,
          thumbnail_url:
            item.snippet.thumbnails?.high?.url ??
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url ?? '',
        });
      }
    } catch { /* skip failed query */ }
  }

  if (!videos.length) return { inserted: 0, skipped };

  const sb = getServiceClient();
  const { error } = await sb
    .from('car_videos')
    .upsert(videos, { onConflict: 'youtube_id' });

  if (error) return { inserted: 0, skipped, error: error.message };
  return { inserted: videos.length, skipped };
}

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

export async function getVideosForCar(makeSlug: string, modelSlug: string): Promise<CarVideo[]> {
  const sb = getServiceClient();
  const { data } = await sb
    .from('car_videos')
    .select('*')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .order('published_at', { ascending: false })
    .limit(12);
  return (data ?? []) as CarVideo[];
}

export async function fetchAndStoreVideos(
  makeSlug: string,
  modelSlug: string,
  makeEn: string,
  modelEn: string,
  makeHe: string,
  modelHe: string,
): Promise<{ inserted: number; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { inserted: 0, error: 'YOUTUBE_API_KEY missing' };

  const queries = [
    `${makeEn} ${modelEn} review`,
    `${makeEn} ${modelEn} ביקורת`,
    `${makeHe} ${modelHe} ביקורת`,
  ];

  const seen = new Set<string>();
  const videos: Omit<CarVideo, 'id'>[] = [];

  for (const q of queries) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '8');
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
        videos.push({
          make_slug: makeSlug,
          model_slug: modelSlug,
          youtube_id: ytId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          published_at: item.snippet.publishedAt,
          thumbnail_url:
            item.snippet.thumbnails?.high?.url ??
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url ?? '',
        });
      }
    } catch { /* skip failed query */ }
  }

  if (!videos.length) return { inserted: 0 };

  const sb = getServiceClient();
  // Upsert by youtube_id to avoid duplicates on re-runs
  const { error } = await sb
    .from('car_videos')
    .upsert(videos, { onConflict: 'youtube_id' });

  if (error) return { inserted: 0, error: error.message };
  return { inserted: videos.length };
}

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* ignore */ }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const apiKey = process.env.YOUTUBE_API_KEY;

if (!apiKey) { console.error('YOUTUBE_API_KEY missing'); process.exit(1); }

const SPAM_KEYWORDS = [
  'for sale', 'למכירה', 'buy now', 'auction', 'mxedu', 'crash', 'accident',
  'tow', 'stolen', 'prank', 'wash', 'repair', 'how to', 'diy', 'install', 'wrap',
];

function isLikelyReview(title) {
  const lower = title.toLowerCase();
  if (SPAM_KEYWORDS.some(kw => lower.includes(kw))) return false;
  if (title.length < 10 || title.length > 120) return false;
  return true;
}

async function fetchVideos(makeSlug, modelSlug, makeEn, modelEn, makeHe, modelHe) {
  const queries = [
    `${makeEn} ${modelEn} review`,
    `${makeEn} ${modelEn} test drive`,
    `${makeHe} ${modelHe} ביקורת`,
  ];

  const seen = new Set();
  const videos = [];

  for (const q of queries) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '8');
    url.searchParams.set('videoDuration', 'medium');
    url.searchParams.set('key', apiKey);

    try {
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.error) {
        const code = data.error.code;
        const reason = data.error.errors?.[0]?.reason;
        if (code === 403 && (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded')) {
          console.error('\n⚠️  YouTube quota exceeded — stopping for today. Will resume tomorrow.');
          return null; // signal quota exceeded
        }
        console.warn(`  API error for "${q}": ${data.error.message}`);
        continue;
      }
      for (const item of data.items ?? []) {
        const ytId = item.id?.videoId;
        if (!ytId || seen.has(ytId)) continue;
        seen.add(ytId);
        const title = item.snippet.title ?? '';
        if (!isLikelyReview(title)) continue;
        videos.push({
          make_slug: makeSlug, model_slug: modelSlug,
          youtube_id: ytId, title,
          channel: item.snippet.channelTitle ?? '',
          published_at: item.snippet.publishedAt,
          thumbnail_url: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? '',
        });
      }
    } catch (e) { console.warn(`  fetch error: ${e.message}`); }
  }

  if (!videos.length) return 0;
  const { error } = await sb.from('car_videos').upsert(videos, { onConflict: 'youtube_id' });
  if (error) { console.warn(`  DB error: ${error.message}`); return 0; }
  return videos.length;
}

// Load all cars
const { data: makes } = await sb.from('car_makes').select('slug,name_he,name_en');
const { data: models } = await sb.from('car_models').select('slug,make_slug,name_he,name_en');

// Find which car slugs already have at least one video
const { data: existing } = await sb.from('car_videos').select('make_slug,model_slug');
const hasVideos = new Set((existing ?? []).map(r => `${r.make_slug}/${r.model_slug}`));

const makeMap = Object.fromEntries((makes ?? []).map(m => [m.slug, m]));

// Only process cars with no videos yet
const missing = (models ?? []).filter(m => !hasVideos.has(`${m.make_slug}/${m.slug}`));
console.log(`Cars with videos: ${hasVideos.size} / ${(models ?? []).length}`);
console.log(`Cars still missing videos: ${missing.length}\n`);

if (missing.length === 0) {
  console.log('All cars already have videos. Nothing to do.');
  process.exit(0);
}

let total = 0;
let i = 0;
for (const model of missing) {
  const make = makeMap[model.make_slug];
  if (!make) continue;
  i++;
  process.stdout.write(`[${i}/${missing.length}] ${make.name_en} ${model.name_en}... `);
  const result = await fetchVideos(make.slug, model.slug, make.name_en, model.name_en, make.name_he, model.name_he);
  if (result === null) {
    // quota exceeded — exit cleanly (GitHub Actions won't mark it as failure)
    console.log(`\nStopped after ${i - 1} cars. Total videos inserted this run: ${total}`);
    process.exit(0);
  }
  total += result;
  console.log(`+${result} videos`);
  // Small delay to avoid hitting YouTube quota too fast
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\nDone! Total videos inserted: ${total}`);

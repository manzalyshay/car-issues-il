/**
 * Fetches YouTube videos for models missing videos — no API key needed.
 * Scrapes YouTube search results page (ytInitialData).
 * Writes directly to D1 via wrangler --file.
 *
 * Run: node scripts/fetch-youtube-d1.mjs [--dry-run] [--delay 3000]
 */

import { execSync, execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELAY = parseInt(args[args.indexOf('--delay') + 1] ?? '3000') || 3000;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const SPAM_KW = ['for sale', 'למכירה', 'buy now', 'auction', 'crash', 'accident',
  'tow', 'stolen', 'prank', 'wash', 'repair', 'how to', 'diy', 'install', 'wrap',
  'paint', 'detail', 'clean', 'mod', 'exhaust install', 'brake', 'tire change'];

function isGood(title) {
  if (!title || title.length < 10 || title.length > 150) return false;
  const lower = title.toLowerCase();
  return !SPAM_KW.some(kw => lower.includes(kw));
}

function parseDurationToSeconds(dur) {
  if (!dur) return 0;
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function d1(sql) {
  // Collapse to single line for --command (multiline fails)
  const oneLiner = sql.replace(/\s+/g, ' ').trim();
  const out = execSync(
    `npx wrangler d1 execute car-issues-db --config wrangler.toml --remote --command ${JSON.stringify(oneLiner)} 2>/dev/null`,
    { encoding: 'utf8', cwd: '/workspace/car-issues-il' }
  );
  const match = out.match(/"results"\s*:\s*(\[[\s\S]*?\])\s*,\s*"success"/);
  if (!match) return [];
  try { return JSON.parse(match[1]); } catch { return []; }
}

function d1File(sql) {
  const file = join(tmpdir(), `yt-d1-${Date.now()}.sql`);
  writeFileSync(file, sql);
  try {
    execSync(
      `npx wrangler d1 execute car-issues-db --config wrangler.toml --remote --file ${JSON.stringify(file)} 2>/dev/null`,
      { encoding: 'utf8', cwd: '/workspace/car-issues-il' }
    );
  } finally {
    try { unlinkSync(file); } catch {}
  }
}

async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`; // sp=medium duration filter
  let html;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(15000),
    });
    html = await res.text();
  } catch (e) {
    console.warn(`  fetch error: ${e.message}`);
    return [];
  }

  const m = html.match(/var ytInitialData = ({.+?});<\/script>/s);
  if (!m) return [];

  let data;
  try { data = JSON.parse(m[1]); } catch { return []; }

  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  const results = [];
  for (const section of sections) {
    const items = section?.itemSectionRenderer?.contents ?? [];
    for (const item of items) {
      const vr = item.videoRenderer;
      if (!vr?.videoId) continue;
      const title = vr.title?.runs?.[0]?.text ?? '';
      if (!isGood(title)) continue;
      const dur = parseDurationToSeconds(vr.lengthText?.simpleText ?? '');
      // Filter: must be at least 3 min and no more than 60 min
      if (dur > 0 && (dur < 180 || dur > 3600)) continue;
      results.push({
        youtube_id: vr.videoId,
        title,
        channel: vr.ownerText?.runs?.[0]?.text ?? '',
        published_at: vr.publishedTimeText?.simpleText ?? null,
        thumbnail_url: `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
      });
    }
  }
  return results;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeSql(s) {
  return s.replace(/'/g, "''");
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Fetching models missing YouTube videos from D1...\n');

const allModels = d1(`
  SELECT cm.make_slug, cm.slug as model_slug, cm.name_en, cm.name_he,
         m.name_en as make_name_en
  FROM car_models cm
  JOIN car_makes m ON m.slug = cm.make_slug
`);

const hasVideos = new Set(
  d1('SELECT DISTINCT make_slug || \'/\' || model_slug as key FROM car_videos')
    .map(r => r.key)
);

const missing = allModels.filter(m => !hasVideos.has(`${m.make_slug}/${m.model_slug}`));
console.log(`Models with videos: ${hasVideos.size} / ${allModels.length}`);
console.log(`Models missing videos: ${missing.length}\n`);

if (missing.length === 0) { console.log('Nothing to do.'); process.exit(0); }

if (DRY_RUN) {
  console.log('DRY RUN — would search:');
  missing.forEach((m, i) => console.log(`  ${i + 1}. ${m.make_name_en} ${m.name_en}`));
  process.exit(0);
}

let total = 0;
for (let i = 0; i < missing.length; i++) {
  const { make_slug, model_slug, name_en, make_name_en } = missing[i];
  // Strip redundant make name from model name if present
  const cleanModel = name_en.replace(new RegExp(`^${make_name_en}\\s+`, 'i'), '');
  const queries = [
    `${make_name_en} ${cleanModel} review`,
    `${make_name_en} ${cleanModel} test drive`,
  ];

  process.stdout.write(`[${i + 1}/${missing.length}] ${make_name_en} ${cleanModel}... `);

  const seen = new Set();
  const videos = [];

  for (const q of queries) {
    const results = await searchYouTube(q);
    for (const v of results) {
      if (!seen.has(v.youtube_id)) {
        seen.add(v.youtube_id);
        videos.push(v);
      }
    }
    await sleep(1000);
  }

  if (!videos.length) {
    console.log('0 videos');
  } else {
    // Build INSERT SQL
    const rows = videos.map(v => {
      const id = randomUUID();
      const pub = v.published_at ? `'${escapeSql(v.published_at)}'` : 'NULL';
      return `('${id}','${make_slug}','${model_slug}','${escapeSql(v.youtube_id)}','${escapeSql(v.title)}','${escapeSql(v.channel)}',${pub},'${escapeSql(v.thumbnail_url)}')`;
    }).join(',\n  ');

    const sql = `INSERT OR IGNORE INTO car_videos (id,make_slug,model_slug,youtube_id,title,channel,published_at,thumbnail_url) VALUES\n  ${rows};`;
    d1File(sql);
    total += videos.length;
    console.log(`+${videos.length} videos`);
  }

  if (i < missing.length - 1) await sleep(DELAY);
}

console.log(`\nDone! Total videos inserted: ${total}`);

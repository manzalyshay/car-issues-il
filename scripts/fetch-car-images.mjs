/**
 * Fetches 15-20 quality car images from Wikimedia Commons per car model.
 * Stores results in the `car_images` Supabase table.
 *
 * Usage:
 *   node scripts/fetch-car-images.mjs
 *   node scripts/fetch-car-images.mjs --force   # re-fetch cars that already have images
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
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

const FORCE = process.argv.includes('--force');
const DELAY_MS = 500; // be polite to Wikimedia API
const TARGET_IMAGES = 18;

/** Search Wikimedia Commons for car images, returning up to `limit` results */
async function searchWikimediaImages(makeEn, modelEn, limit = TARGET_IMAGES) {
  const queries = [
    `${makeEn} ${modelEn}`,
    `${makeEn} ${modelEn} car`,
  ];

  const seen = new Set();
  const images = [];

  for (const query of queries) {
    if (images.length >= limit) break;

    // Use Wikimedia Commons search API
    const searchUrl = new URL('https://commons.wikimedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('generator', 'search');
    searchUrl.searchParams.set('gsrnamespace', '6'); // File namespace
    searchUrl.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
    searchUrl.searchParams.set('gsrlimit', String(Math.min(20, limit - images.length + 5)));
    searchUrl.searchParams.set('prop', 'imageinfo');
    searchUrl.searchParams.set('iiprop', 'url|size|extmetadata');
    searchUrl.searchParams.set('iiurlwidth', '800');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    try {
      const res = await fetch(searchUrl.toString(), {
        headers: { 'User-Agent': 'CarIssuesIL/1.0 (carissues.co.il; contact@carissues.co.il)' },
      });
      const data = await res.json();
      const pages = data?.query?.pages ?? {};

      for (const page of Object.values(pages)) {
        if (images.length >= limit) break;

        const info = page.imageinfo?.[0];
        if (!info) continue;

        const url = info.thumburl || info.url;
        const origUrl = info.url;
        if (!url || seen.has(origUrl)) continue;

        // Skip very small images (likely icons/logos)
        if (info.width && info.width < 400) continue;
        if (info.height && info.height < 200) continue;

        // Skip non-photo file types
        const mime = info.extmetadata?.MIMEType?.value ?? '';
        if (mime && !mime.startsWith('image/jpeg') && !mime.startsWith('image/png') && !mime.startsWith('image/webp')) continue;

        // Skip images with "logo", "badge", "icon", "emblem" in the title
        const title = (page.title ?? '').toLowerCase();
        if (/logo|badge|icon|emblem|coat|flag|sign|symbol|map/.test(title)) continue;

        seen.add(origUrl);

        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        const author = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? '';
        const imageTitle = info.extmetadata?.ObjectName?.value ?? page.title?.replace('File:', '') ?? '';

        images.push({
          url: origUrl,
          thumbnail_url: url,
          title: imageTitle,
          author: author.slice(0, 200),
          license: license.slice(0, 100),
          width: info.width ?? null,
          height: info.height ?? null,
        });
      }
    } catch (e) {
      console.warn(`  Wikimedia error for "${query}": ${e.message}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return images;
}

// Load all cars
const { data: makes } = await sb.from('car_makes').select('slug,name_en');
const { data: models } = await sb.from('car_models').select('slug,make_slug,name_en');

if (!makes || !models) {
  console.error('Failed to load cars from DB');
  process.exit(1);
}

// Find which cars already have images (unless --force)
let hasImages = new Set();
if (!FORCE) {
  const { data: existing } = await sb.from('car_images').select('make_slug,model_slug');
  hasImages = new Set((existing ?? []).map(r => `${r.make_slug}/${r.model_slug}`));
}

const makeMap = Object.fromEntries(makes.map(m => [m.slug, m]));

const todo = models.filter(m => FORCE || !hasImages.has(`${m.make_slug}/${m.slug}`));

console.log(`Cars with images: ${hasImages.size} / ${models.length}`);
console.log(`Cars to process: ${todo.length}\n`);

if (todo.length === 0) {
  console.log('All cars already have images. Use --force to re-fetch.');
  process.exit(0);
}

let totalInserted = 0;
let i = 0;

for (const model of todo) {
  const make = makeMap[model.make_slug];
  if (!make) continue;

  i++;
  process.stdout.write(`[${i}/${todo.length}] ${make.name_en} ${model.name_en}... `);

  const images = await searchWikimediaImages(make.name_en, model.name_en);

  if (!images.length) {
    console.log('no images found');
    continue;
  }

  const rows = images.map(img => ({
    make_slug: model.make_slug,
    model_slug: model.slug,
    ...img,
    source: 'wikimedia',
  }));

  const { error } = await sb
    .from('car_images')
    .upsert(rows, { onConflict: 'make_slug,model_slug,url' });

  if (error) {
    console.log(`DB error: ${error.message}`);
  } else {
    totalInserted += rows.length;
    console.log(`+${rows.length} images`);
  }

  await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`\nDone! Total images inserted: ${totalInserted}`);

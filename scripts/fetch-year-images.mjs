/**
 * Fetches year-specific car images from Wikimedia Commons.
 * Searches for "${make} ${model} ${year}" and stores results with year tag.
 *
 * Usage:
 *   node scripts/fetch-year-images.mjs               # all years for all cars
 *   node scripts/fetch-year-images.mjs --force        # re-fetch existing
 *   node scripts/fetch-year-images.mjs toyota corolla # single car
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
const DELAY_MS = 600;
const SINGLE_MAKE = process.argv[2]?.startsWith('--') ? null : process.argv[2];
const SINGLE_MODEL = process.argv[3];

async function searchWikimediaForYear(makeEn, modelEn, year) {
  const yearStr = String(year);
  const queries = [
    `${makeEn} ${modelEn} ${year}`,
    `"${makeEn}" "${modelEn}" ${year}`,
  ];

  const seen = new Set();
  const images = [];

  for (const query of queries) {
    if (images.length >= 5) break;

    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
    url.searchParams.set('gsrlimit', '20');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size|extmetadata');
    url.searchParams.set('iiurlwidth', '800');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'CarIssuesIL/1.0 (carissues.co.il; contact@carissues.co.il)' },
      });
      const data = await res.json();
      const pages = data?.query?.pages ?? {};

      for (const page of Object.values(pages)) {
        if (images.length >= 5) break;

        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (info.width && info.width < 400) continue;
        if (info.height && info.height < 200) continue;

        const mime = info.extmetadata?.MIMEType?.value ?? '';
        if (mime && !mime.startsWith('image/jpeg') && !mime.startsWith('image/png') && !mime.startsWith('image/webp')) continue;

        const title = (page.title ?? '').toLowerCase();
        if (/logo|badge|icon|emblem|coat|flag|sign|symbol|map|interior|engine|diagram/.test(title)) continue;

        // Must mention the year in filename or description text
        // NOTE: We do NOT use DateTimeOriginal (photo taken date) because a photo
        // taken in 2023 may depict an older generation of the model.
        const desc = (info.extmetadata?.ImageDescription?.value ?? '').toLowerCase();

        const mentionsYear = title.includes(yearStr) || desc.includes(yearStr);
        if (!mentionsYear) continue;

        const origUrl = info.url;
        if (seen.has(origUrl)) continue;
        seen.add(origUrl);

        images.push({
          url: origUrl,
          thumbnail_url: info.thumburl ?? origUrl,
          title: info.extmetadata?.ObjectName?.value ?? page.title?.replace('File:', '') ?? '',
          author: (info.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 200),
          license: info.extmetadata?.LicenseShortName?.value ?? '',
          width: info.width ?? null,
          height: info.height ?? null,
        });
      }
    } catch (e) {
      console.warn(`  Wikimedia error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return images;
}

// Load all cars
const { data: makes } = await sb.from('car_makes').select('slug,name_en');
const { data: allModels } = await sb.from('car_models').select('slug,make_slug,name_en,years');

if (!makes || !allModels) {
  console.error('Failed to load cars from DB');
  process.exit(1);
}

const makeMap = Object.fromEntries(makes.map(m => [m.slug, m]));

let models = allModels;
if (SINGLE_MAKE) {
  models = models.filter(m => m.make_slug === SINGLE_MAKE);
  if (SINGLE_MODEL) models = models.filter(m => m.slug === SINGLE_MODEL);
}

// Find which (make, model, year) combos already have images
let existing = new Set();
if (!FORCE) {
  const { data: ex } = await sb
    .from('car_images')
    .select('make_slug,model_slug,year')
    .not('year', 'is', null);
  existing = new Set((ex ?? []).map(r => `${r.make_slug}/${r.model_slug}/${r.year}`));
}

// Build work list: all car×year combos
const todo = [];
for (const model of models) {
  const make = makeMap[model.make_slug];
  if (!make) continue;
  for (const year of (model.years ?? [])) {
    const key = `${model.make_slug}/${model.slug}/${year}`;
    if (!FORCE && existing.has(key)) continue;
    todo.push({ make, model, year });
  }
}

console.log(`Year combos already in DB: ${existing.size}`);
console.log(`Year combos to process: ${todo.length}\n`);

if (todo.length === 0) {
  console.log('All year images already fetched. Use --force to re-fetch.');
  process.exit(0);
}

let totalInserted = 0;
let i = 0;

for (const { make, model, year } of todo) {
  i++;
  process.stdout.write(`[${i}/${todo.length}] ${make.name_en} ${model.name_en} ${year}... `);

  const images = await searchWikimediaForYear(make.name_en, model.name_en, year);

  if (!images.length) {
    console.log('no year-specific images');
    continue;
  }

  const rows = images.map(img => ({
    make_slug: model.make_slug,
    model_slug: model.slug,
    year,
    source: 'wikimedia',
    ...img,
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
}

console.log(`\nDone! Total year images inserted: ${totalInserted}`);

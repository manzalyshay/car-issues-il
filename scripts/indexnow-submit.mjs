/**
 * Submits URLs to IndexNow (Bing, Yandex — Google picks up indirectly).
 * Run after deploying new pages to get them crawled faster.
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs              # submit all trim pages
 *   node scripts/indexnow-submit.mjs trims        # same
 *   node scripts/indexnow-submit.mjs models       # all model pages
 *   node scripts/indexnow-submit.mjs all          # everything
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const KEY  = '8201965612f7fe1c62dfa112a6909f61';
const HOST = 'carissues.co.il';
const BASE = `https://${HOST}`;
const db   = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function toTrimSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function getUrls(mode = 'trims') {
  const urls = [];

  if (mode === 'trims' || mode === 'all') {
    const { data: trims } = await db.from('car_trims').select('make_slug, model_slug, name');
    for (const t of trims ?? []) {
      urls.push(`${BASE}/cars/${t.make_slug}/${t.model_slug}/trim/${toTrimSlug(t.name)}`);
    }
  }

  if (mode === 'models' || mode === 'all') {
    const { data: models } = await db.from('car_models').select('make_slug, slug');
    for (const m of models ?? []) {
      urls.push(`${BASE}/cars/${m.make_slug}/${m.slug}`);
    }
  }

  if (mode === 'all') {
    const { data: makes } = await db.from('car_makes').select('slug');
    for (const m of makes ?? []) urls.push(`${BASE}/cars/${m.slug}`);
    urls.push(BASE, `${BASE}/cars`, `${BASE}/rankings`);
  }

  return [...new Set(urls)]; // dedupe
}

async function submit(urls) {
  // IndexNow allows max 10,000 URLs per request
  const BATCH = 10000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const body = { host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: batch };
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    console.log(`Batch ${Math.floor(i/BATCH)+1}: ${batch.length} URLs → HTTP ${res.status}`);
    if (res.status === 200 || res.status === 202) {
      console.log('  ✅ Accepted');
    } else {
      console.log('  ✗', await res.text());
    }
  }
}

const mode = process.argv[2] ?? 'trims';
console.log(`Fetching URLs (mode: ${mode})...`);
const urls = await getUrls(mode);
console.log(`Submitting ${urls.length} URLs to IndexNow...\n`);
await submit(urls);
console.log('\nDone. Search engines will crawl these URLs shortly.');

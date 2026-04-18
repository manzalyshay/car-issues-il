/**
 * scripts/seed-sources-breakdown.mjs
 *
 * Scrapes (or re-scrapes) all cars that have empty sources_breakdown.
 * Runs general (year=null) rows only — the most important for the model page.
 *
 * Popularity order: most-driven Israeli cars first so the site looks good ASAP.
 *
 * Usage:
 *   node scripts/seed-sources-breakdown.mjs
 *   BASE_URL=https://carissues.co.il node scripts/seed-sources-breakdown.mjs
 *   FORCE=true node scripts/seed-sources-breakdown.mjs    # re-run even if already populated
 *   DELAY_MS=3000 node scripts/seed-sources-breakdown.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}
loadEnv();

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const SECRET   = process.env.SCRAPER_API_KEY ?? '';
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '4000');
const FORCE    = process.env.FORCE === 'true';

if (!SECRET) {
  console.error('SCRAPER_API_KEY env var is required');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Most popular / high-traffic Israeli car models first
const POPULARITY_ORDER = [
  'toyota/corolla', 'toyota/rav4', 'toyota/yaris', 'toyota/chr', 'toyota/camry',
  'toyota/hilux', 'toyota/prius', 'toyota/land-cruiser',
  'hyundai/tucson', 'hyundai/elantra', 'hyundai/kona', 'hyundai/i20', 'hyundai/i30',
  'hyundai/santa-fe', 'hyundai/ioniq-5', 'hyundai/sonata',
  'kia/sportage', 'kia/ceed', 'kia/picanto', 'kia/stonic', 'kia/niro', 'kia/ev6',
  'mazda/cx5', 'mazda/3', 'mazda/cx30', 'mazda/2',
  'volkswagen/golf', 'volkswagen/polo', 'volkswagen/tiguan', 'volkswagen/passat', 'volkswagen/t-roc',
  'skoda/octavia', 'skoda/kodiaq', 'skoda/karoq', 'skoda/superb', 'skoda/fabia',
  'seat/leon', 'seat/ibiza', 'seat/ateca',
  'nissan/qashqai', 'nissan/x-trail', 'nissan/leaf', 'nissan/juke',
  'honda/civic', 'honda/jazz', 'honda/cr-v', 'honda/hr-v',
  'ford/focus', 'ford/kuga', 'ford/puma', 'ford/ranger',
  'bmw/3-series', 'bmw/5-series', 'bmw/x3', 'bmw/x5', 'bmw/1-series', 'bmw/series1',
  'mercedes/c-class', 'mercedes/a-class', 'mercedes/e-class', 'mercedes/glc', 'mercedes/gla',
  'audi/a3', 'audi/a4', 'audi/q5', 'audi/q3',
  'subaru/forester', 'subaru/outback', 'subaru/xv',
  'mitsubishi/outlander', 'mitsubishi/eclipse-cross', 'mitsubishi/asx',
  'renault/clio', 'renault/kadjar', 'renault/captur',
  'peugeot/3008', 'peugeot/2008', 'peugeot/208',
  'citroen/c3', 'citroen/c5-aircross',
  'opel/astra', 'opel/crossland', 'opel/mokka',
  'chevrolet/spark', 'chevrolet/captiva',
  'jeep/compass', 'jeep/renegade', 'jeep/wrangler',
  'tesla/model-3', 'tesla/model-y',
  'volvo/xc60', 'volvo/xc40', 'volvo/v40',
];

// Fetch all general rows to check which need scraping
const { data: existing } = await sb
  .from('expert_reviews')
  .select('make_slug,model_slug,sources_breakdown')
  .is('year', null);

const needsWork = new Set();
for (const row of existing ?? []) {
  const breakdown = row.sources_breakdown;
  const isEmpty = !breakdown || (Array.isArray(breakdown) && breakdown.length === 0);
  if (FORCE || isEmpty) {
    needsWork.add(`${row.make_slug}/${row.model_slug}`);
  }
}

// Build ordered target list — known popular cars first, then any remaining
const targets = [];
const seen = new Set();

for (const key of POPULARITY_ORDER) {
  if (needsWork.has(key)) {
    const [make, model] = key.split('/');
    targets.push({ make, model });
    seen.add(key);
  }
}
// Add any remaining cars not in the popularity list
for (const row of existing ?? []) {
  const key = `${row.make_slug}/${row.model_slug}`;
  if (needsWork.has(key) && !seen.has(key)) {
    targets.push({ make: row.make_slug, model: row.model_slug });
  }
}

if (targets.length === 0) {
  console.log('✅ All cars already have sources_breakdown. Use FORCE=true to re-run.');
  process.exit(0);
}

console.log(`\n🔍 Scraping per-source summaries for ${targets.length} cars\n`);

let done = 0, saved = 0, skipped = 0;

for (const { make, model } of targets) {
  done++;
  const label = `${make}/${model}`;
  process.stdout.write(`[${done}/${targets.length}] ${label.padEnd(38)}`);

  try {
    const res = await fetch(`${BASE_URL}/api/expert-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': SECRET },
      body: JSON.stringify({ makeSlug: make, modelSlug: model }),
      signal: AbortSignal.timeout(55000),
    });

    if (res.ok) {
      const body = await res.json();
      if (body.saved > 0) {
        saved++;
        console.log('✓ saved');
      } else {
        skipped++;
        console.log(`✗ DB error (saved=0)`);
      }
    } else {
      skipped++;
      const txt = await res.text().catch(() => '');
      console.log(`✗ HTTP ${res.status}${txt ? ` — ${txt.slice(0, 80)}` : ''}`);
    }
  } catch (e) {
    skipped++;
    console.log(`✗ ${e.message}`);
  }

  if (done < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`\n✅ Done — ${saved} saved, ${skipped} skipped/no-data\n`);

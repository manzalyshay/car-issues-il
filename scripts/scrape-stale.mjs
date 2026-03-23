/**
 * scripts/scrape-stale.mjs
 *
 * Daily maintenance — scrapes only entries that are missing or older than STALE_DAYS.
 * Covers both general (year=null) and year-specific rows.
 *
 * Usage:
 *   node scripts/scrape-stale.mjs
 *   STALE_DAYS=3 node scripts/scrape-stale.mjs
 *   BASE_URL=https://your-site.vercel.app node scripts/scrape-stale.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CAR_LIST } from './car-list.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch { /* ignore */ }
}
loadEnv();

const BASE_URL   = process.env.BASE_URL   ?? 'http://localhost:3000';
const STALE_DAYS = parseInt(process.env.STALE_DAYS ?? '7');
const DELAY_MS   = parseInt(process.env.DELAY_MS ?? '1500');
const SECRET     = process.env.SCRAPER_API_KEY ?? '';

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const staleDate = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

const { data: existing } = await sb
  .from('expert_reviews')
  .select('make_slug,model_slug,year,scraped_at');

const freshSet = new Set(
  (existing ?? [])
    .filter(r => r.scraped_at > staleDate)
    .map(r => `${r.make_slug}/${r.model_slug}/${r.year ?? 'general'}`)
);

// Build full target list: general + year-specific
const ALL_TARGETS = [];
for (const { make, model, years } of CAR_LIST) {
  ALL_TARGETS.push([make, model, null]);
  for (const year of years) ALL_TARGETS.push([make, model, year]);
}

const targets = ALL_TARGETS.filter(([make, model, year]) => {
  const key = `${make}/${model}/${year ?? 'general'}`;
  return !freshSet.has(key);
});

if (targets.length === 0) {
  console.log('All entries are fresh — nothing to scrape.');
  process.exit(0);
}

console.log(`\nScraping ${targets.length} stale/missing entries (threshold: ${STALE_DAYS} days)\n`);

let done = 0, saved = 0;
const start = Date.now();

for (const [makeSlug, modelSlug, year] of targets) {
  const label = year ? `${makeSlug}/${modelSlug} ${year}` : `${makeSlug}/${modelSlug} (general)`;
  process.stdout.write(`[${done + 1}/${targets.length}] ${label.padEnd(42)}`);
  try {
    const res = await fetch(`${BASE_URL}/api/expert-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': SECRET },
      body: JSON.stringify({ makeSlug, modelSlug, ...(year != null ? { year } : {}) }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.saved > 0) { saved++; process.stdout.write('✓\n'); }
    else process.stdout.write('— (no data)\n');
  } catch (e) {
    process.stdout.write(`✗ ${e.message}\n`);
  }
  done++;
  if (done < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

const elapsed = Math.round((Date.now() - start) / 1000);
console.log(`\nDone in ${elapsed}s — ${saved}/${done} entries saved`);

/**
 * scripts/scrape-all.mjs
 *
 * One-time full scrape of ALL car models — both general (year=null) and year-specific.
 * Run with: node scripts/scrape-all.mjs
 *
 * Usage:
 *   node scripts/scrape-all.mjs                        # local dev server
 *   BASE_URL=https://your-site.vercel.app node scripts/scrape-all.mjs
 *   SKIP_EXISTING=true node scripts/scrape-all.mjs     # skip already-scraped entries
 *   YEARS_ONLY=true node scripts/scrape-all.mjs        # skip generals, only year rows
 *   GENERAL_ONLY=true node scripts/scrape-all.mjs      # skip year rows
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

const BASE_URL      = process.env.BASE_URL      ?? 'http://localhost:3000';
const SKIP          = process.env.SKIP_EXISTING === 'true';
const DELAY_MS      = parseInt(process.env.DELAY_MS ?? '1500');
const SECRET        = process.env.SCRAPER_API_KEY ?? '';
const YEARS_ONLY    = process.env.YEARS_ONLY    === 'true';
const GENERAL_ONLY  = process.env.GENERAL_ONLY  === 'true';

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Build set of already-scraped keys for SKIP_EXISTING
let scraped = new Set();
if (SKIP) {
  const { data } = await sb.from('expert_reviews').select('make_slug,model_slug,year');
  scraped = new Set(
    (data ?? []).map(r => `${r.make_slug}/${r.model_slug}/${r.year ?? 'general'}`)
  );
  console.log(`Skipping ${scraped.size} already-scraped entries`);
}

async function scrapeOne(makeSlug, modelSlug, year) {
  const res = await fetch(`${BASE_URL}/api/expert-reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': SECRET },
    body: JSON.stringify({ makeSlug, modelSlug, ...(year != null ? { year } : {}) }),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok && json.saved > 0;
}

// Build target list: [makeSlug, modelSlug, year|null]
const targets = [];

if (!YEARS_ONLY) {
  for (const { make, model } of CAR_LIST) {
    const key = `${make}/${model}/general`;
    if (!SKIP || !scraped.has(key)) targets.push([make, model, null]);
  }
}

if (!GENERAL_ONLY) {
  for (const { make, model, years } of CAR_LIST) {
    for (const year of years) {
      const key = `${make}/${model}/${year}`;
      if (!SKIP || !scraped.has(key)) targets.push([make, model, year]);
    }
  }
}

const totalGeneral = CAR_LIST.length;
const totalYears   = CAR_LIST.reduce((s, c) => s + c.years.length, 0);
console.log(`\nTargets: ${targets.length} entries`);
console.log(`(${totalGeneral} general + ${totalYears} year-specific = ${totalGeneral + totalYears} total possible)`);
console.log(`Delay: ${DELAY_MS}ms — est. ${Math.round(targets.length * (DELAY_MS + 8000) / 60000)} min\n`);

let done = 0, saved = 0, failed = 0;
const start = Date.now();

for (const [makeSlug, modelSlug, year] of targets) {
  const label = year ? `${makeSlug}/${modelSlug} ${year}` : `${makeSlug}/${modelSlug} (general)`;
  process.stdout.write(`[${done + 1}/${targets.length}] ${label.padEnd(42)}`);
  try {
    const ok = await scrapeOne(makeSlug, modelSlug, year);
    if (ok) { saved++; process.stdout.write('✓\n'); }
    else     { process.stdout.write('— (no data)\n'); }
  } catch (e) {
    failed++;
    process.stdout.write(`✗ ${e.message}\n`);
  }
  done++;
  if (done < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

const elapsed = Math.round((Date.now() - start) / 1000);
console.log(`\nDone in ${elapsed}s — ${saved} saved, ${failed} errors, ${done - saved - failed} no-data`);

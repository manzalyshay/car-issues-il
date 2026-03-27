/**
 * scripts/update-scraper.mjs
 *
 * Chunked update scraper — uses Gemini 2.5 Flash (free tier: 15 RPM, 1M TPM/day).
 * Tracks progress in .scraper-progress.json so it can resume from where it left off.
 * Respects rate limits by waiting between requests.
 *
 * Usage:
 *   node scripts/update-scraper.mjs                    # process next chunk
 *   node scripts/update-scraper.mjs --chunk-size 5     # 5 cars per run
 *   node scripts/update-scraper.mjs --mode years       # update year-specific rows only
 *   node scripts/update-scraper.mjs --mode general     # update general rows only (default)
 *   node scripts/update-scraper.mjs --make toyota      # update only one make
 *   node scripts/update-scraper.mjs --reset            # clear progress and start over
 *   node scripts/update-scraper.mjs --status           # show progress without running
 *
 * Rate limit strategy:
 *   Gemini 2.5 Flash free tier = 15 RPM → 4s delay between scrape calls
 *   Each car needs 2 Gemini calls (local + global summarization)
 *   So effective throughput ≈ 4 cars/minute safely
 *
 * Sources scraped per car:
 *   Israeli: Tapuz, drive.co.il, icar.co.il, One.co.il, auto.co.il, carzone.co.il
 *   Global:  Reddit, Cars.com, AutoExpress, WhatCar, CarExpert AU, CarSales AU
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────────────────────
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

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const CHUNK_SIZE  = parseInt(getArg('--chunk-size') ?? '5');
const MODE        = getArg('--mode') ?? 'general';        // 'general' | 'years' | 'both'
const FILTER_MAKE = getArg('--make') ?? null;
const RESET       = hasFlag('--reset');
const STATUS_ONLY = hasFlag('--status');

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Gemini 2.5 Flash: 15 RPM free → 1 req per 4s to be safe
// scrapeExpertReviews calls summarizeGroup twice (local + global) → 8s per car
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '4000');

// ── Progress file ─────────────────────────────────────────────────────────────
const PROGRESS_FILE = resolve(__dir, '../.scraper-progress.json');

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return {};
  try { return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveProgress(p) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── Car list ──────────────────────────────────────────────────────────────────
import { CAR_LIST } from './car-list.mjs';

// ── Supabase ──────────────────────────────────────────────────────────────────
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function callScrapeApi(makeSlug, modelSlug, year = null) {
  const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
  const SECRET   = process.env.SCRAPER_API_KEY ?? '';
  const body = year
    ? { makeSlug, modelSlug, year }
    : { makeSlug, modelSlug };

  const res = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-scraper-key': SECRET,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000), // 90s timeout — scraping + LLM can be slow
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Status display ────────────────────────────────────────────────────────────
async function showStatus() {
  const progress = loadProgress();

  // Count DB rows
  const { count: generalCount } = await sb
    .from('expert_reviews')
    .select('*', { count: 'exact', head: true })
    .is('year', null);
  const { count: yearCount } = await sb
    .from('expert_reviews')
    .select('*', { count: 'exact', head: true })
    .not('year', 'is', null);

  const totalModels = CAR_LIST.length;
  const totalYearRows = CAR_LIST.reduce((s, c) => s + (c.years?.length ?? 0), 0);

  console.log('\n─── Scraper Status ───────────────────────────────');
  console.log(`DB general rows:     ${generalCount ?? '?'} / ${totalModels} models`);
  console.log(`DB year rows:        ${yearCount ?? '?'} / ${totalYearRows} year-model combos`);
  console.log(`\nProgress file: ${existsSync(PROGRESS_FILE) ? PROGRESS_FILE : '(none yet)'}`);

  if (progress.general) {
    const done = progress.general.completedSlugs?.length ?? 0;
    const failed = progress.general.failedSlugs?.length ?? 0;
    console.log(`\nGeneral mode:`);
    console.log(`  Completed: ${done} models`);
    console.log(`  Failed:    ${failed} models`);
    if (progress.general.lastSlug) console.log(`  Last slug: ${progress.general.lastSlug}`);
  }
  if (progress.years) {
    const done = progress.years.completedKeys?.length ?? 0;
    const failed = progress.years.failedKeys?.length ?? 0;
    console.log(`\nYears mode:`);
    console.log(`  Completed: ${done} year-model rows`);
    console.log(`  Failed:    ${failed} year-model rows`);
    if (progress.years.lastKey) console.log(`  Last key: ${progress.years.lastKey}`);
  }
  console.log('──────────────────────────────────────────────────\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (RESET) {
    saveProgress({});
    console.log('Progress reset.');
    return;
  }

  if (STATUS_ONLY) {
    await showStatus();
    return;
  }

  const progress = loadProgress();

  if (MODE === 'general' || MODE === 'both') {
    await runGeneralMode(progress);
  }
  if (MODE === 'years' || MODE === 'both') {
    await runYearsMode(progress);
  }

  saveProgress(progress);
  console.log('\nProgress saved. Run again to continue.');
  await showStatus();
}

// ── General mode (year=null rows) ─────────────────────────────────────────────
async function runGeneralMode(progress) {
  if (!progress.general) progress.general = { completedSlugs: [], failedSlugs: [], lastSlug: null };
  const p = progress.general;

  // Filter cars
  let cars = CAR_LIST;
  if (FILTER_MAKE) cars = cars.filter(c => c.makeSlug === FILTER_MAKE);

  // Skip already completed
  const completedSet = new Set(p.completedSlugs);
  const todo = cars.filter(c => !completedSet.has(`${c.makeSlug}/${c.modelSlug}`));

  if (todo.length === 0) {
    console.log('General mode: all models already processed!');
    return;
  }

  console.log(`\n═══ General mode: ${todo.length} remaining, processing next ${Math.min(CHUNK_SIZE, todo.length)} ═══\n`);

  let processed = 0;
  for (const car of todo) {
    if (processed >= CHUNK_SIZE) break;

    const key = `${car.makeSlug}/${car.modelSlug}`;
    process.stdout.write(`  [${processed + 1}/${Math.min(CHUNK_SIZE, todo.length)}] ${key} ... `);

    try {
      const result = await callScrapeApi(car.makeSlug, car.modelSlug, null);
      const sources = result?.sources ?? [];
      console.log(`✓ (${sources.length} sources: ${sources.join(', ') || 'none'})`);
      p.completedSlugs.push(key);
      p.lastSlug = key;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (!p.failedSlugs.includes(key)) p.failedSlugs.push(key);
    }

    processed++;

    // Save progress after each car so we can resume on crash
    saveProgress(progress);

    // Rate limit: wait between requests
    if (processed < Math.min(CHUNK_SIZE, todo.length)) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nGeneral chunk done: ${processed} processed, ${todo.length - processed} remaining.`);
}

// ── Years mode (year-specific rows) ──────────────────────────────────────────
async function runYearsMode(progress) {
  if (!progress.years) progress.years = { completedKeys: [], failedKeys: [], lastKey: null };
  const p = progress.years;

  // Build all year-model combos
  let cars = CAR_LIST;
  if (FILTER_MAKE) cars = cars.filter(c => c.makeSlug === FILTER_MAKE);

  const allKeys = [];
  for (const car of cars) {
    for (const year of (car.years ?? [])) {
      allKeys.push({ makeSlug: car.makeSlug, modelSlug: car.modelSlug, year });
    }
  }

  const completedSet = new Set(p.completedKeys);
  const todo = allKeys.filter(k => !completedSet.has(`${k.makeSlug}/${k.modelSlug}/${k.year}`));

  if (todo.length === 0) {
    console.log('Years mode: all year-model combos already processed!');
    return;
  }

  console.log(`\n═══ Years mode: ${todo.length} remaining, processing next ${Math.min(CHUNK_SIZE, todo.length)} ═══\n`);

  let processed = 0;
  for (const { makeSlug, modelSlug, year } of todo) {
    if (processed >= CHUNK_SIZE) break;

    const key = `${makeSlug}/${modelSlug}/${year}`;
    process.stdout.write(`  [${processed + 1}/${Math.min(CHUNK_SIZE, todo.length)}] ${key} ... `);

    try {
      const result = await callScrapeApi(makeSlug, modelSlug, year);
      const sources = result?.sources ?? [];
      console.log(`✓ (${sources.length} sources)`);
      p.completedKeys.push(key);
      p.lastKey = key;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (!p.failedKeys.includes(key)) p.failedKeys.push(key);
    }

    processed++;
    saveProgress(progress);

    if (processed < Math.min(CHUNK_SIZE, todo.length)) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nYears chunk done: ${processed} processed, ${todo.length - processed} remaining.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

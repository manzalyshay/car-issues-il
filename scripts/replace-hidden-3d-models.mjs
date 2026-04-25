/**
 * replace-hidden-3d-models.mjs
 *
 * Two jobs in one, run daily via GitHub Actions:
 *
 *  1. REPLACE hidden models — car_3d_models WHERE hidden = true
 *     Search Sketchfab for a replacement, skip the bad UID that was hidden.
 *
 *  2. FILL missing models — cars that have no row in car_3d_models at all
 *     Search Sketchfab and insert a new row if a good match is found.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SKETCHFAB_TOKEN
 *
 * Usage:
 *   SKETCHFAB_TOKEN=xxx node scripts/replace-hidden-3d-models.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}
loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SKETCHFAB_TOKEN = process.env.SKETCHFAB_TOKEN;
if (!SKETCHFAB_TOKEN) {
  console.error('SKETCHFAB_TOKEN env var is required');
  process.exit(1);
}

// ── Sketchfab search ──────────────────────────────────────────────────────────

async function searchSketchfab(query, excludeUid = null) {
  // No license filter in the URL — cast a wide net and filter client-side.
  // &license=by returns only ~9 results total (too few), missing most car models.
  const url = `https://api.sketchfab.com/v3/models?q=${encodeURIComponent(query)}&count=24&sort_by=-likeCount&type=models`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Token ${SKETCHFAB_TOKEN}`,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Sketchfab API ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).filter(m => {
    if (excludeUid && m.uid === excludeUid) return false;
    // Accept CC-Attribution without NonCommercial OR NoDerivatives restrictions.
    // Also accept models with no license set (public domain / default permissive).
    const lic = m.license?.label ?? '';
    if (lic && lic.includes('NonCommercial')) return false;
    if (lic && lic.includes('NoDerivatives')) return false;
    return true;
  });
}

// Model name must contain the make AND at least one keyword from the model name.
// Alternate make spellings are tried for brands with common short-forms.
const MAKE_ALIASES = {
  'mercedes-benz': ['mercedes', 'benz', 'mercedes-benz'],
  'volkswagen':    ['volkswagen', 'vw'],
  'bmw':           ['bmw'],
  'byd':           ['byd'],
  'mg':            ['mg'],
};

function nameMatchesCar(sketchfabName, makeEn, modelEn) {
  const n = sketchfabName.toLowerCase();
  const makeLower = makeEn.toLowerCase();
  const aliases = MAKE_ALIASES[makeLower] ?? [makeLower];
  const makeMatch = aliases.some(a => n.includes(a));
  if (!makeMatch) return false;
  // Split model name on spaces/hyphens and keep words ≥2 chars
  const modelWords = modelEn.toLowerCase().split(/[\s\-_\.]+/).filter(w => w.length >= 2);
  // Must match at least one model word
  return modelWords.some(w => n.includes(w));
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function findAndInsert(make_slug, model_slug, makeEn, modelEn, excludeUid = null, label = '') {
  process.stdout.write(`  ${label}[${make_slug}/${model_slug}] "${makeEn} ${modelEn}"... `);
  let results;
  try {
    results = await searchSketchfab(`${makeEn} ${modelEn}`, excludeUid);
  } catch (e) {
    console.log(`✗ search error: ${e.message}`);
    return false;
  }

  const matched = results.filter(r => nameMatchesCar(r.name, makeEn, modelEn));
  if (!matched.length) {
    // Debug: show first 5 result names + licenses to diagnose match failures
    const preview = results.slice(0, 5).map(r => `"${r.name}" [${r.license?.label ?? 'no-lic'}]`).join(', ');
    console.log(`✗ no match (${results.length} results: ${preview})`);
    return false;
  }

  const best = matched[0];
  const { error } = await sb.from('car_3d_models').insert({
    make_slug,
    model_slug,
    sketchfab_uid:    best.uid,
    sketchfab_name:   best.name,
    sketchfab_author: best.user?.username ?? best.user?.displayName ?? 'unknown',
    license:          best.license?.label ?? 'CC Attribution',
    hidden:           false,
    hidden_reason:    null,
    reel_url:         null,
    reel_status:      null,
  });

  if (error) { console.log(`✗ DB insert failed: ${error.message}`); return false; }
  console.log(`✓  "${best.name}" by ${best.user?.username ?? 'unknown'}`);
  return true;
}

// ── Load names once ───────────────────────────────────────────────────────────

const [{ data: allMakes }, { data: allCarModels }, { data: all3d }] = await Promise.all([
  sb.from('car_makes').select('slug,name_en'),
  sb.from('car_models').select('make_slug,slug,name_en'),
  sb.from('car_3d_models').select('make_slug,model_slug,sketchfab_uid,hidden,hidden_reason'),
]);

const makeMap  = Object.fromEntries(allMakes.map(m => [m.slug, m.name_en]));
const modelMap = Object.fromEntries(allCarModels.map(m => [`${m.make_slug}/${m.slug}`, m.name_en]));

// ── 1. Replace hidden models ──────────────────────────────────────────────────

const hidden = all3d.filter(r => r.hidden);
console.log(`\n🔄 Replacing ${hidden.length} hidden model(s)…\n`);

let replaced = 0, fillAdded = 0, skipped = 0;

for (const row of hidden) {
  const { make_slug, model_slug, sketchfab_uid: badUid, hidden_reason } = row;
  const makeEn  = makeMap[make_slug];
  const modelEn = modelMap[`${make_slug}/${model_slug}`];
  if (!makeEn || !modelEn) { console.log(`  ⚠ ${make_slug}/${model_slug}: unknown car, skipping`); skipped++; continue; }

  // Delete the hidden row first so insert doesn't conflict
  await sb.from('car_3d_models').delete().eq('make_slug', make_slug).eq('model_slug', model_slug);

  const ok = await findAndInsert(make_slug, model_slug, makeEn, modelEn, badUid,
    `(was hidden: ${hidden_reason ?? 'no reason'}) `);
  ok ? replaced++ : skipped++;
  await delay(1200);
}

// ── 2. Fill cars with no 3D model at all ─────────────────────────────────────

const has3d = new Set(all3d.map(r => `${r.make_slug}/${r.model_slug}`));
const missing = allCarModels.filter(m => !has3d.has(`${m.make_slug}/${m.slug}`));

console.log(`\n🔍 Filling ${missing.length} car(s) with no 3D model…\n`);

for (const car of missing) {
  const makeEn  = makeMap[car.make_slug];
  const modelEn = car.name_en;
  if (!makeEn) { console.log(`  ⚠ ${car.make_slug}: unknown make, skipping`); skipped++; continue; }

  const ok = await findAndInsert(car.make_slug, car.slug, makeEn, modelEn);
  ok ? fillAdded++ : skipped++;
  await delay(1200);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n✅ Done — ${replaced} hidden replaced, ${fillAdded} new filled, ${skipped} skipped\n`);
if (replaced + fillAdded === 0) process.exit(1);

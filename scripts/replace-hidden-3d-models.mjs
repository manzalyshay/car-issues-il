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
  // Use /v3/search?type=models — the /v3/models?q= endpoint ignores the q param
  // and returns generic popular models regardless of search term.
  const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(query)}&count=24&sort_by=-likeCount`;
  const headers = { 'Accept': 'application/json' };
  if (SKETCHFAB_TOKEN) headers['Authorization'] = `Token ${SKETCHFAB_TOKEN}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Sketchfab API ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).filter(m => {
    if (excludeUid && m.uid === excludeUid) return false;
    // Accept CC-Attribution without NonCommercial or NoDerivatives restrictions.
    // Also accept models with no license info (they're still publicly embeddable).
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

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function nameMatchesCar(sketchfabName, makeEn, modelEn) {
  // Normalize accents so "Doblò" matches "Doblo", etc.
  const n = stripAccents(sketchfabName.toLowerCase());
  const makeLower = makeEn.toLowerCase();
  const aliases = MAKE_ALIASES[makeLower] ?? [makeLower];
  const makeMatch = aliases.some(a => n.includes(a));
  if (!makeMatch) return false;
  // Split model name on spaces/hyphens; keep words ≥2 chars OR single-digit numbers (e.g. "3" in "Series 3")
  const rawWords = stripAccents(modelEn.toLowerCase()).split(/[\s\-_\.]+/).filter(w => w.length >= 2 || /^\d$/.test(w));
  // Must match at least one model word
  return rawWords.some(w => {
    if (/^\d+$/.test(w)) return new RegExp(`(?<![\\d])${w}(?![\\d])`).test(n);
    return n.includes(w);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Fallback search queries for models that don't appear under their exact name on Sketchfab
const SEARCH_FALLBACKS = {
  'mercedes/c220d': ['Mercedes-Benz C220', 'Mercedes C-Class W205'],
  'mercedes/c300d': ['Mercedes-Benz C300', 'Mercedes C-Class W206'],
  'mercedes/a220':  ['Mercedes-Benz A220', 'Mercedes A-Class W177'],
  'mercedes/a250':  ['Mercedes-Benz A250', 'Mercedes A-Class W177'],
  'mercedes/a35-amg': ['Mercedes AMG A35', 'Mercedes A35'],
  'mercedes/a45-amg': ['Mercedes AMG A45', 'Mercedes A45'],
  'volkswagen/taigo': ['Volkswagen Taigo', 'VW Taigo'],
  'renault/kadjar':   ['Renault Kadjar'],
  'dacia/spring':     ['Dacia Spring Electric'],
  'chery/arrizo6':    ['Chery Arrizo'],
  'byd/tang':         ['BYD Tang EV'],
  'byd/sealion6':     ['BYD Sealion'],
  'mg/ehs':           ['MG EHS hybrid'],
};

async function findAndInsert(make_slug, model_slug, makeEn, modelEn, excludeUid = null, label = '') {
  process.stdout.write(`  ${label}[${make_slug}/${model_slug}] "${makeEn} ${modelEn}"... `);

  // Build list of search queries to try (primary + fallbacks)
  const primaryQuery = `${makeEn} ${modelEn}`;
  const fallbacks = SEARCH_FALLBACKS[`${make_slug}/${model_slug}`] ?? [];
  const queriesToTry = [primaryQuery, ...fallbacks.filter(q => q !== primaryQuery)];

  let matched = [];
  let lastResultCount = 0;
  for (const query of queriesToTry) {
    let results;
    try {
      results = await searchSketchfab(query, excludeUid);
    } catch (e) {
      console.log(`✗ search error: ${e.message}`);
      return false;
    }
    lastResultCount = results.length;
    matched = results.filter(r => nameMatchesCar(r.name, makeEn, modelEn));
    if (matched.length) break;
    // Also try with relaxed matching: just make name in result
    if (!matched.length && results.length > 0) {
      const makeAliases = MAKE_ALIASES[makeEn.toLowerCase()] ?? [makeEn.toLowerCase()];
      matched = results.filter(r => makeAliases.some(a => r.name.toLowerCase().includes(a)));
      if (matched.length) break;
    }
  }

  if (!matched.length) {
    console.log(`✗ no match after ${queriesToTry.length} queries (last: ${lastResultCount} results)`);
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

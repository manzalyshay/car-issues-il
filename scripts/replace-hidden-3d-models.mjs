/**
 * replace-hidden-3d-models.mjs
 *
 * Finds hidden car_3d_models rows and attempts to replace each one with
 * a better Sketchfab model.  Designed to run daily via GitHub Actions.
 *
 * Strategy per hidden model:
 *   1. Search Sketchfab for "{makeEn} {modelEn}" with CC BY license
 *   2. Filter results: name must contain make + model keywords,
 *      must not be the same UID that was hidden
 *   3. Pick the top result by like count
 *   4. Upsert the new model into car_3d_models (replacing the hidden row)
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

async function searchSketchfab(query, excludeUid) {
  const url = `https://api.sketchfab.com/v3/models?q=${encodeURIComponent(query)}&license=by&count=24&sort_by=-likeCount`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Token ${SKETCHFAB_TOKEN}`,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.error(`  Sketchfab API error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return (data.results ?? []).filter(m => {
    if (m.uid === excludeUid) return false;
    const lic = m.license?.label ?? '';
    // CC BY only — not NonCommercial, not NoDerivatives
    return lic.includes('Attribution') && !lic.includes('NonCommercial') && !lic.includes('NoDerivatives');
  });
}

// Check if a Sketchfab model name plausibly matches the car make + model
function nameMatchesCar(sketchfabName, makeEn, modelEn) {
  const n = sketchfabName.toLowerCase();
  const make = makeEn.toLowerCase();
  // Model keywords: split by space/hyphen, keep words ≥ 2 chars
  const modelWords = modelEn.toLowerCase().split(/[\s\-]+/).filter(w => w.length >= 2);
  if (!n.includes(make)) return false;
  // At least one model keyword must appear
  return modelWords.some(w => n.includes(w));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { data: hiddenModels, error } = await sb
  .from('car_3d_models')
  .select('make_slug, model_slug, sketchfab_uid, hidden_reason')
  .eq('hidden', true);

if (error) { console.error('DB error:', error.message); process.exit(1); }
if (!hiddenModels.length) { console.log('✅ No hidden 3D models to replace.'); process.exit(0); }

console.log(`\n🔍 Attempting to replace ${hiddenModels.length} hidden 3D model(s)\n`);

let replaced = 0, skipped = 0;

for (const row of hiddenModels) {
  const { make_slug, model_slug, sketchfab_uid: hiddenUid, hidden_reason } = row;

  // Get English names
  const [{ data: make }, { data: model }] = await Promise.all([
    sb.from('car_makes').select('name_en').eq('slug', make_slug).single(),
    sb.from('car_models').select('name_en').eq('make_slug', make_slug).eq('slug', model_slug).single(),
  ]);

  if (!make || !model) {
    console.log(`⚠ ${make_slug}/${model_slug}: car not found in DB, skipping`);
    skipped++;
    continue;
  }

  const { name_en: makeEn } = make;
  const { name_en: modelEn } = model;
  const query = `${makeEn} ${modelEn}`;

  process.stdout.write(`[${make_slug}/${model_slug}] Searching "${query}"... `);

  let results;
  try {
    results = await searchSketchfab(query, hiddenUid);
  } catch (e) {
    console.log(`✗ search failed: ${e.message}`);
    skipped++;
    continue;
  }

  // Filter to models whose name actually matches the car
  const matched = results.filter(r => nameMatchesCar(r.name, makeEn, modelEn));

  if (!matched.length) {
    console.log(`✗ no matching CC BY model found (${results.length} results, none matched "${makeEn} ${modelEn}")`);
    skipped++;
    continue;
  }

  const best = matched[0]; // already sorted by likeCount desc
  const newUid    = best.uid;
  const newName   = best.name;
  const newAuthor = best.user?.username ?? best.user?.displayName ?? 'unknown';
  const newLic    = best.license?.label ?? 'CC Attribution';

  // Upsert: replace the hidden row with the new model
  // (delete old + insert new, since UID changed)
  await sb.from('car_3d_models')
    .delete()
    .eq('make_slug', make_slug)
    .eq('model_slug', model_slug);

  const { error: insertErr } = await sb.from('car_3d_models').insert({
    make_slug,
    model_slug,
    sketchfab_uid:    newUid,
    sketchfab_name:   newName,
    sketchfab_author: newAuthor,
    license:          newLic,
    hidden:           false,
    hidden_reason:    null,
    reel_url:         null,
    reel_status:      null,
  });

  if (insertErr) {
    console.log(`✗ DB insert failed: ${insertErr.message}`);
    skipped++;
    continue;
  }

  console.log(`✓ replaced`);
  console.log(`   was:  ${hiddenUid} (reason: ${hidden_reason ?? 'none'})`);
  console.log(`   new:  ${newUid} — "${newName}" by ${newAuthor}`);
  replaced++;

  // Brief pause between Sketchfab API calls
  if (hiddenModels.indexOf(row) < hiddenModels.length - 1) {
    await new Promise(r => setTimeout(r, 1500));
  }
}

console.log(`\n✅ Done — ${replaced} replaced, ${skipped} skipped\n`);
if (replaced === 0) process.exit(1); // signal to GH Actions that nothing changed

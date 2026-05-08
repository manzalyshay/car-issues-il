/**
 * Seeds car_trims table with full feature data + Israeli market prices for all models.
 * Uses Gemini 2.0 Flash to generate accurate Israeli market trim data.
 *
 * Run: node scripts/seed-car-trims-full.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dir, '../.env.local'), 'utf8')
  .split('\n').reduce((acc, line) => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    return acc;
  }, {});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY   = env.GEMINI_API_KEY;
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;

// All valid feature keys (must match TRIM_FEATURES in src/data/cars.ts)
const VALID_FEATURES = [
  'apple_carplay','wireless_carplay','wireless_charging','digital_cluster','hud','premium_audio',
  'aeb','adaptive_cruise','lane_keep','blind_spot','rear_camera','camera_360','parking_sensors','traffic_sign',
  'heated_seats_front','heated_seats_rear','ventilated_seats','electric_seats','memory_seats',
  'sunroof','panoramic_roof','keyless_entry','push_start','ambient_lighting','led_lights','auto_lights','heated_steering',
];

async function fetchAllModels() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_models?select=make_slug,slug,name_en,trims,years&order=make_slug,slug`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Fetch models failed: ${res.status}`);
  return res.json();
}

async function fetchExistingTrimModels() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_trims?select=make_slug,model_slug&limit=2000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) return new Set();
  const rows = await res.json();
  return new Set(rows.map(r => `${r.make_slug}/${r.model_slug}`));
}

async function askGemini(model) {
  const trimNames = (model.trims || []).join(', ') || 'unknown';
  const latestYear = Math.max(...(model.years || [2024]));
  const prompt = `You are an expert on the Israeli car market. Give me detailed trim specs for the ${model.name_en} as sold in Israel in ${latestYear}.

Trims sold in Israel: ${trimNames}

For EACH trim, return a JSON object with:
- name: exact trim name (from the list above)
- sort_order: 0 for base, ascending for higher trims
- engine_type: one of: petrol, hybrid, phev, electric, diesel
- engine_cc: displacement in cc (e.g. 1600, 1998, 2000) — null for electric
- engine_hp: horsepower (integer)
- transmission: one of: manual, automatic, cvt, dct
- drive: one of: fwd, rwd, awd
- seats: one of: fabric, leatherette, leather
- seat_count: integer (default 5, use 7 for 7-seat versions)
- screen_size: infotainment screen size in inches (e.g. 8, 10.25, 12.3) — number
- features: array of applicable feature keys from this list ONLY:
  ${VALID_FEATURES.join(', ')}
- price_ils: Israeli retail price in NIS for ${latestYear} (integer, e.g. 145000). Use your best knowledge of Israeli market prices. Do NOT guess wildly — if unsure, set null.

Rules:
- Include ALL trims listed above
- Higher trims always include all features of lower trims
- Be specific to Israeli market specs (local importers may differ from global)
- Respond ONLY with a JSON array, no markdown, no explanation

Example:
[
  {"name":"Urban","sort_order":0,"engine_type":"petrol","engine_cc":1600,"engine_hp":120,"transmission":"automatic","drive":"fwd","seats":"fabric","seat_count":5,"screen_size":8,"features":["apple_carplay","aeb","lane_keep","rear_camera","parking_sensors","led_lights","push_start"],"price_ils":130000},
  {"name":"Sport","sort_order":1,"engine_type":"petrol","engine_cc":1600,"engine_hp":120,"transmission":"automatic","drive":"fwd","seats":"leatherette","seat_count":5,"screen_size":10,"features":["apple_carplay","wireless_carplay","wireless_charging","aeb","lane_keep","blind_spot","rear_camera","parking_sensors","led_lights","push_start","heated_seats_front","keyless_entry"],"price_ils":150000}
]`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini error: ${res.status} ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    console.error(`  ⚠ JSON parse failed for ${model.make_slug}/${model.slug}`);
    console.error('  Raw:', raw.slice(0, 300));
    return null;
  }
}

async function upsertTrims(makeSlug, modelSlug, trims) {
  let ok = 0;
  for (const trim of trims) {
    // Sanitize features to only valid keys
    const features = (trim.features || []).filter(f => VALID_FEATURES.includes(f));
    const row = {
      make_slug: makeSlug,
      model_slug: modelSlug,
      name: trim.name,
      sort_order: trim.sort_order ?? 0,
      engine_type: trim.engine_type ?? null,
      engine_cc: trim.engine_cc ?? null,
      engine_hp: trim.engine_hp ?? null,
      transmission: trim.transmission ?? null,
      drive: trim.drive ?? null,
      seats: trim.seats ?? null,
      seat_count: trim.seat_count ?? null,
      screen_size: trim.screen_size ?? null,
      features,
      price_ils: trim.price_ils ?? null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/car_trims`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (res.ok || res.status === 204 || res.status === 201) ok++;
    else {
      const t = await res.text();
      console.error(`    ✗ ${trim.name}: ${res.status} ${t.slice(0, 100)}`);
    }
  }
  return ok;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('🚗 Car Trims Full Seeder');
  console.log('========================\n');

  const models = await fetchAllModels();
  console.log(`Found ${models.length} models\n`);

  // Skip models already seeded
  const alreadySeeded = await fetchExistingTrimModels();
  const toSeed = models.filter(m => !alreadySeeded.has(`${m.make_slug}/${m.slug}`));
  const skippedCount = models.length - toSeed.length;

  if (skippedCount > 0) {
    console.log(`Skipping ${skippedCount} already-seeded models\n`);
  }

  let total = 0, failed = 0;

  for (let i = 0; i < toSeed.length; i++) {
    const m = toSeed[i];
    const label = `${m.make_slug}/${m.slug}`;
    process.stdout.write(`[${i + 1}/${toSeed.length}] ${label} (${(m.trims || []).length} trims)... `);

    if (!m.trims || m.trims.length === 0) {
      console.log('⏭ no trims defined');
      continue;
    }

    try {
      const trims = await askGemini(m);
      if (!trims || trims.length === 0) {
        console.log('⚠ empty response');
        failed++;
        continue;
      }

      const inserted = await upsertTrims(m.make_slug, m.slug, trims);
      console.log(`✓ ${inserted}/${trims.length} trims`);
      total += inserted;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 80)}`);
      failed++;
    }

    // 30 RPM free tier = 2s min; use 2.5s to be safe
    await sleep(2500);
  }

  console.log(`\n✅ Done. Inserted/updated: ${total}, Failed models: ${failed}`);
}

run().catch(e => { console.error(e); process.exit(1); });

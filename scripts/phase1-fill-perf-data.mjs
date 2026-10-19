#!/usr/bin/env node
/**
 * Phase 1 — Fill performance data for all car trims.
 *
 * Step A: Seed complete trim data for 8 cars that have ZERO trim rows
 *         (Chevrolet Camaro/Captiva/Colorado/Equinox/Malibu/Tahoe/Trailblazer + Skoda Rapid)
 *
 * Step B: Fill missing acceleration_0_100, top_speed_kmh, torque_nm, fuel_consumption
 *         for all 427 existing make/model/HP groups
 *
 * Data source: Gemini 2.5 Flash — manufacturer spec sheet knowledge
 * Writes to:   Remote Cloudflare D1  (+ local SQLite for dev parity)
 *
 * Usage:
 *   node scripts/phase1-fill-perf-data.mjs           # run both steps
 *   node scripts/phase1-fill-perf-data.mjs --step-a  # only seed missing cars
 *   node scripts/phase1-fill-perf-data.mjs --step-b  # only fill perf columns
 *   node scripts/phase1-fill-perf-data.mjs --dry      # print SQL, don't write
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Database from '/workspace/car-issues-il/node_modules/better-sqlite3/lib/index.js';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

// Load .env.local
try {
  const raw = readFileSync(join(__dir, '../.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* ignore */ }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const DRY     = process.argv.includes('--dry');
const STEP_A  = process.argv.includes('--step-a') || (!process.argv.includes('--step-b'));
const STEP_B  = process.argv.includes('--step-b') || (!process.argv.includes('--step-a'));
const DELAY   = 400; // ms between Gemini calls

const LOCAL_DB_PATH = '/workspace/car-issues-il/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/94d3a3dca7223ebf64b57b6a465db86c2414ed4822522900b8878ff93c47b3f7.sqlite';
const WRANGLER_CWD  = '/workspace/car-issues-il';
const TMP_SQL       = join('/tmp', `phase1-perf-${Date.now()}.sql`);

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in .env.local — aborting');
  process.exit(1);
}

// ── DB helpers ────────────────────────────────────────────────────────────────

const localDb = new Database(LOCAL_DB_PATH);

function localSelect(sql, ...params) {
  return localDb.prepare(sql).all(...params);
}

function runRemote(sql) {
  if (DRY) { console.log('[DRY SQL]', sql.slice(0, 200)); return; }
  writeFileSync(TMP_SQL, sql, 'utf8');
  try {
    execSync(
      `bash -c 'source "$HOME/.nvm/nvm.sh" && nvm use 22 --silent && npx wrangler d1 execute car-issues-db --remote --config wrangler.toml --file "${TMP_SQL}" 2>&1'`,
      { stdio: 'pipe', cwd: WRANGLER_CWD },
    );
  } finally {
    try { unlinkSync(TMP_SQL); } catch { /* ignore */ }
  }
}

function runLocal(sql) {
  if (DRY) return;
  // Execute each statement separately
  const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 5);
  for (const stmt of stmts) {
    try { localDb.prepare(stmt).run(); } catch (e) {
      console.warn('  [local db warn]', e.message.slice(0, 80));
    }
  }
}

function runBoth(sql) {
  runLocal(sql);
  runRemote(sql);
}

function sqEsc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ── Gemini helper ─────────────────────────────────────────────────────────────

async function gemini(prompt, { temperature = 0.1, retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429 && attempt < retries) {
          await sleep(3000 * attempt);
          continue;
        }
        throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return text;
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(2000 * attempt);
    }
  }
  return '';
}

function parseJSON(text) {
  // Strip markdown fences
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find first [ or {
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return null;
  const end = cleaned.lastIndexOf(cleaned[start] === '[' ? ']' : '}');
  if (end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── STEP A: Seed 8 cars with no trims at all ──────────────────────────────────

const SEED_CARS = [
  { make_slug: 'chevrolet', model_slug: 'camaro',     make_en: 'Chevrolet', model_en: 'Camaro',     years: [2015, 2024], market: 'Israel/global' },
  { make_slug: 'chevrolet', model_slug: 'captiva',    make_en: 'Chevrolet', model_en: 'Captiva',    years: [2009, 2020], market: 'Israel (SAIC-GM version)' },
  { make_slug: 'chevrolet', model_slug: 'colorado',   make_en: 'Chevrolet', model_en: 'Colorado',   years: [2015, 2026], market: 'Israel/global' },
  { make_slug: 'chevrolet', model_slug: 'equinox',    make_en: 'Chevrolet', model_en: 'Equinox',    years: [2015, 2026], market: 'Israel/global' },
  { make_slug: 'chevrolet', model_slug: 'malibu',     make_en: 'Chevrolet', model_en: 'Malibu',     years: [2013, 2023], market: 'Israel/global' },
  { make_slug: 'chevrolet', model_slug: 'tahoe',      make_en: 'Chevrolet', model_en: 'Tahoe',      years: [2015, 2026], market: 'Israel/global' },
  { make_slug: 'chevrolet', model_slug: 'trailblazer', make_en: 'Chevrolet', model_en: 'Trailblazer', years: [2020, 2026], market: 'Israel/global' },
  { make_slug: 'skoda',     model_slug: 'rapid',      make_en: 'Skoda',     model_en: 'Rapid',      years: [2013, 2021], market: 'Israel/Europe' },
];

async function stepA() {
  console.log('\n== STEP A: Seed trim data for 8 HP-missing cars ==\n');

  for (const car of SEED_CARS) {
    process.stdout.write(`  ${car.make_en} ${car.model_en} (${car.years[0]}-${car.years[1]}) ... `);

    const prompt = `You are a car specifications database expert. Provide the main engine variants sold for the ${car.make_en} ${car.model_en} in the ${car.market} market (${car.years[0]}-${car.years[1]}).

Return a JSON array. Each object represents ONE distinct engine variant (not every trim name — group variants by engine):

[
  {
    "name": "trim/engine name, e.g. LT 2.5 Turbo",
    "engine_hp": 155,
    "engine_cc": 2500,
    "engine_type": "petrol",       // petrol | diesel | hybrid | electric | phev
    "transmission": "automatic",    // automatic | manual
    "drive": "fwd",                // fwd | rwd | awd | 4wd
    "torque_nm": 250,
    "acceleration_0_100": 9.5,     // seconds, 0-100 km/h (NOT 0-60 mph)
    "top_speed_kmh": 185,
    "fuel_consumption": 8.2,       // WLTP combined L/100km (kWh/100km for EV)
    "seat_count": 5,
    "cargo_liters": null,          // boot/cargo volume litres if known
    "curb_weight_kg": 1450         // kerb weight kg if known
  }
]

Rules:
- Include only engine variants that were actually sold in ${car.market}
- Use 0-100 km/h times (NOT 0-60 mph)
- Use WLTP or official manufacturer combined fuel figures
- acceleration_0_100 and fuel_consumption MUST be numbers, not null (use best known value)
- If a value is genuinely unknown use null, but try hard for all numeric fields
- Return ONLY the JSON array, no explanation`;

    const raw = await gemini(prompt, { temperature: 0.1 });
    const variants = parseJSON(raw);

    if (!Array.isArray(variants) || variants.length === 0) {
      console.log('FAILED — bad response');
      console.log('  Raw:', raw.slice(0, 300));
      await sleep(DELAY);
      continue;
    }

    const rows = variants.map((v, i) => ({
      id: randomUUID(),
      make_slug: car.make_slug,
      model_slug: car.model_slug,
      name: (v.name ?? `Variant ${i + 1}`).toString().slice(0, 80).toUpperCase(),
      model_year: null,
      engine_type: v.engine_type ?? 'petrol',
      engine_cc: v.engine_cc ?? null,
      engine_hp: v.engine_hp ?? null,
      transmission: v.transmission ?? 'automatic',
      drive: v.drive ?? 'fwd',
      seat_count: v.seat_count ?? 5,
      acceleration_0_100: v.acceleration_0_100 ?? null,
      top_speed_kmh: v.top_speed_kmh ?? null,
      torque_nm: v.torque_nm ?? null,
      fuel_consumption: v.fuel_consumption ?? null,
      cargo_liters: v.cargo_liters ?? null,
      curb_weight_kg: v.curb_weight_kg ?? null,
      is_israel: 1,
      sort_order: i,
    }));

    const cols = 'id,make_slug,model_slug,name,model_year,engine_type,engine_cc,engine_hp,transmission,drive,seat_count,acceleration_0_100,top_speed_kmh,torque_nm,fuel_consumption,cargo_liters,curb_weight_kg,is_israel,sort_order';
    const values = rows.map(r =>
      `(${sqEsc(r.id)},${sqEsc(r.make_slug)},${sqEsc(r.model_slug)},${sqEsc(r.name)},NULL,${sqEsc(r.engine_type)},${sqEsc(r.engine_cc)},${sqEsc(r.engine_hp)},${sqEsc(r.transmission)},${sqEsc(r.drive)},${sqEsc(r.seat_count)},${sqEsc(r.acceleration_0_100)},${sqEsc(r.top_speed_kmh)},${sqEsc(r.torque_nm)},${sqEsc(r.fuel_consumption)},${sqEsc(r.cargo_liters)},${sqEsc(r.curb_weight_kg)},1,${sqEsc(r.sort_order)})`
    ).join(',\n');

    const sql = `INSERT OR IGNORE INTO car_trims (${cols}) VALUES\n${values};`;

    try {
      runBoth(sql);
      console.log(`OK — ${rows.length} variants (${rows.map(r => r.engine_hp + 'hp').join(', ')})`);
    } catch (e) {
      console.log('DB ERROR:', e.message.slice(0, 150));
    }

    await sleep(DELAY);
  }
}

// ── STEP B: Fill perf columns for 427 existing make/model/HP groups ───────────

async function stepB() {
  console.log('\n== STEP B: Fill acceleration / torque / top_speed / fuel for all trims ==\n');

  // Get all unique make/model combos that still have gaps
  const models = localSelect(`
    SELECT DISTINCT make_slug, model_slug
    FROM car_trims
    WHERE engine_hp IS NOT NULL
      AND (acceleration_0_100 IS NULL OR top_speed_kmh IS NULL OR torque_nm IS NULL OR fuel_consumption IS NULL)
    ORDER BY make_slug, model_slug
  `);

  console.log(`Found ${models.length} models with at least one trim missing perf data.\n`);

  let totalUpdated = 0;
  let failed = 0;

  for (let idx = 0; idx < models.length; idx++) {
    const { make_slug, model_slug } = models[idx];

    // Get all HP variants for this model that need filling
    const variants = localSelect(`
      SELECT engine_hp, engine_cc, engine_type, transmission,
             COUNT(*) as trim_count,
             GROUP_CONCAT(id) as ids,
             MAX(CASE WHEN acceleration_0_100 IS NULL THEN 1 ELSE 0 END) as needs_accel,
             MAX(CASE WHEN top_speed_kmh IS NULL THEN 1 ELSE 0 END) as needs_speed,
             MAX(CASE WHEN torque_nm IS NULL THEN 1 ELSE 0 END) as needs_torque,
             MAX(CASE WHEN fuel_consumption IS NULL THEN 1 ELSE 0 END) as needs_fuel
      FROM car_trims
      WHERE make_slug = ? AND model_slug = ?
        AND engine_hp IS NOT NULL
        AND (acceleration_0_100 IS NULL OR top_speed_kmh IS NULL OR torque_nm IS NULL OR fuel_consumption IS NULL)
      GROUP BY engine_hp, engine_cc, engine_type, transmission
      ORDER BY engine_hp
    `, make_slug, model_slug);

    if (variants.length === 0) continue;

    const makeEn  = make_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const modelEn = model_slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const variantList = variants.map(v => ({
      hp: v.engine_hp,
      cc: v.engine_cc,
      type: v.engine_type,
      transmission: v.transmission,
    }));

    process.stdout.write(`  [${idx + 1}/${models.length}] ${makeEn} ${modelEn} (${variants.length} variants) ... `);

    const prompt = `You are a precise car specifications database. For the ${makeEn} ${modelEn}, provide exact manufacturer specs for each engine variant listed.

Variants to fill:
${variantList.map(v => `- ${v.hp}hp, ${v.cc ?? '?'}cc, ${v.type}, ${v.transmission}`).join('\n')}

Return a JSON array — one entry per variant, matched by hp value:

[
  {
    "hp": 155,
    "torque_nm": 240,
    "acceleration_0_100": 9.2,
    "top_speed_kmh": 185,
    "fuel_consumption": 7.8,
    "curb_weight_kg": 1380
  }
]

Specification rules:
- acceleration_0_100: seconds from 0 to 100 km/h (NOT 0-60 mph). Use manufacturer claim or well-known measured value.
- top_speed_kmh: km/h. Use manufacturer stated max speed.
- torque_nm: peak torque in Newton-metres.
- fuel_consumption: WLTP combined cycle L/100km. For electric/EV use kWh/100km (same field). For PHEV use CS (charge sustaining) combined.
- curb_weight_kg: kerb weight in kg (driver + fluids, no passengers).
- All values MUST be numbers. Use your best known figure — do NOT return null if you know the approximate spec.
- If a spec is truly unknown for a specific variant, use null.
- Return ONLY the JSON array.`;

    const raw = await gemini(prompt, { temperature: 0.1 });
    const specs = parseJSON(raw);

    if (!Array.isArray(specs) || specs.length === 0) {
      console.log('FAILED');
      if (process.env.DEBUG) console.log('  Raw:', raw.slice(0, 400));
      failed++;
      await sleep(DELAY);
      continue;
    }

    // Build HP → spec map
    const hpMap = {};
    for (const s of specs) {
      if (s.hp != null) hpMap[Number(s.hp)] = s;
    }

    // Generate UPDATE statements grouped by what's needed
    const updates = [];
    for (const v of variants) {
      const spec = hpMap[v.engine_hp];
      if (!spec) continue;

      const ids = v.ids.split(',');
      const sets = [];
      if (v.needs_accel  && spec.acceleration_0_100 != null) sets.push(`acceleration_0_100 = ${Number(spec.acceleration_0_100)}`);
      if (v.needs_speed  && spec.top_speed_kmh      != null) sets.push(`top_speed_kmh = ${Number(spec.top_speed_kmh)}`);
      if (v.needs_torque && spec.torque_nm           != null) sets.push(`torque_nm = ${Number(spec.torque_nm)}`);
      if (v.needs_fuel   && spec.fuel_consumption    != null) sets.push(`fuel_consumption = ${Number(spec.fuel_consumption)}`);
      if (spec.curb_weight_kg != null) sets.push(`curb_weight_kg = ${Number(spec.curb_weight_kg)}`);

      if (sets.length === 0) continue;

      for (const id of ids) {
        updates.push(`UPDATE car_trims SET ${sets.join(', ')} WHERE id = '${id}';`);
      }
    }

    if (updates.length === 0) {
      console.log('no matches in response');
      failed++;
      await sleep(DELAY);
      continue;
    }

    const sql = updates.join('\n');
    try {
      runBoth(sql);
      console.log(`OK — ${updates.length} trims updated`);
      totalUpdated += updates.length;
    } catch (e) {
      console.log('DB ERROR:', e.message.slice(0, 150));
      failed++;
    }

    await sleep(DELAY);
  }

  console.log(`\nStep B done — ${totalUpdated} trims updated, ${failed} models failed`);
}

// ── Summary report ────────────────────────────────────────────────────────────

function printSummary() {
  const total    = localDb.prepare('SELECT COUNT(*) as n FROM car_trims').get().n;
  const withAccel = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE acceleration_0_100 IS NOT NULL').get().n;
  const withFuel  = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE fuel_consumption IS NOT NULL').get().n;
  const withSpeed = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE top_speed_kmh IS NOT NULL').get().n;
  const withTorque = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE torque_nm IS NOT NULL').get().n;
  const withHp    = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE engine_hp IS NOT NULL').get().n;

  console.log('\n== Performance data coverage (local DB) ==');
  console.log(`Total trims: ${total}`);
  console.log(`  engine_hp:          ${withHp}/${total} (${pct(withHp, total)})`);
  console.log(`  acceleration_0_100: ${withAccel}/${total} (${pct(withAccel, total)})`);
  console.log(`  top_speed_kmh:      ${withSpeed}/${total} (${pct(withSpeed, total)})`);
  console.log(`  torque_nm:          ${withTorque}/${total} (${pct(withTorque, total)})`);
  console.log(`  fuel_consumption:   ${withFuel}/${total} (${pct(withFuel, total)})`);
}

function pct(n, d) { return d === 0 ? '0%' : Math.round(n / d * 100) + '%'; }

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('Phase 1 — Performance Data Fill');
console.log(`Mode: ${DRY ? 'DRY RUN' : 'LIVE'} | Step A: ${STEP_A} | Step B: ${STEP_B}`);
console.log('---');

printSummary();

if (STEP_A) await stepA();
if (STEP_B) await stepB();

printSummary();
console.log('\nDone.');

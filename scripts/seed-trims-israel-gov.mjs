/**
 * scripts/seed-trims-israel-gov.mjs
 *
 * Seeds real Israeli car trim data from the Israeli government's open data API
 * into the Supabase `car_trims` table.
 *
 * Usage:
 *   node scripts/seed-trims-israel-gov.mjs
 *   DRY_RUN=1 node scripts/seed-trims-israel-gov.mjs
 *   MAKE=toyota node scripts/seed-trims-israel-gov.mjs   (filter by make)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Env ─────────────────────────────────────────────────────────────────────

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

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.DRY_RUN === '1';
const MAKE_FILTER = process.env.MAKE?.toLowerCase();

if (!SB_URL || !SB_KEY) {
  console.error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOV_API   = 'https://data.gov.il/api/3/action/datastore_search';
const RESOURCE  = '142afde2-6228-49f9-8a29-9b6c3a0cbe40';
const MIN_YEAR  = 2023;
const DELAY_MS  = 500;

// ─── Model map ───────────────────────────────────────────────────────────────

const MODEL_MAP = [
  // Toyota
  { make: 'toyota', model: 'corolla',       q: 'COROLLA',        filterNot: ['CROSS', 'VERSO'] },
  { make: 'toyota', model: 'corolla-cross', q: 'COROLLA CROSS' },
  { make: 'toyota', model: 'yaris',         q: 'YARIS',          filterNot: ['CROSS', 'VERSO'] },
  { make: 'toyota', model: 'yaris-cross',   q: 'YARIS CROSS' },
  { make: 'toyota', model: 'chr',           q: 'C-HR' },
  { make: 'toyota', model: 'camry',         q: 'CAMRY' },
  { make: 'toyota', model: 'prius',         q: 'PRIUS' },
  { make: 'toyota', model: 'bz4x',          q: 'BZ4X' },
  { make: 'toyota', model: 'rav4',          q: 'RAV 4' },
  { make: 'toyota', model: 'hilux',         q: 'HILUX' },
  { make: 'toyota', model: 'land-cruiser',  q: 'LAND CRUISER' },
  // Hyundai
  { make: 'hyundai', model: 'tucson',       q: 'TUCSON' },
  { make: 'hyundai', model: 'kona',         q: 'KONA' },
  { make: 'hyundai', model: 'i20',          q: 'I 20',  minYear: 2019 },
  { make: 'hyundai', model: 'i30',          q: 'I 30',  minYear: 2019 },
  { make: 'hyundai', model: 'santa-fe',     q: 'SANTA FE' },
  { make: 'hyundai', model: 'sonata',       q: 'SONATA' },
  { make: 'hyundai', model: 'ioniq-5',      q: 'IONIQ 5' },
  { make: 'hyundai', model: 'ioniq-6',      q: 'IONIQ 6' },
  { make: 'hyundai', model: 'elantra',      q: 'ELANTRA' },
  { make: 'hyundai', model: 'bayon',        q: 'BAYON' },
  { make: 'hyundai', model: 'venue',        q: 'VENUE' },
  { make: 'hyundai', model: 'staria',       q: 'STARIA' },
  // KIA
  { make: 'kia', model: 'cerato',           q: 'CERATO' },
  { make: 'kia', model: 'picanto',          q: 'PICANTO', minYear: 2017 },
  { make: 'kia', model: 'stonic',           q: 'STONIC' },
  { make: 'kia', model: 'seltos',           q: 'SELTOS' },
  { make: 'kia', model: 'sorento',          q: 'SORENTO', minYear: 2018 },
  { make: 'kia', model: 'carnival',         q: 'CARNIVAL' },
  { make: 'kia', model: 'niro',             q: 'NIRO' },
  { make: 'kia', model: 'ev6',              q: 'EV6' },
  { make: 'kia', model: 'ev9',              q: 'EV9' },
  { make: 'kia', model: 'ceed',             q: 'CEED' },
  { make: 'kia', model: 'sportage',         q: 'SPORTAGE' },
  // Nissan
  { make: 'nissan', model: 'juke',          q: 'JUKE' },
  { make: 'nissan', model: 'x-trail',       q: 'X-TRAIL' },
  { make: 'nissan', model: 'leaf',          q: 'LEAF' },
  { make: 'nissan', model: 'kicks',         q: 'KICKS' },
  // Mazda
  { make: 'mazda', model: 'mazda3',         q: 'MAZDA3' },
  { make: 'mazda', model: 'cx30',           q: 'CX-30' },
  { make: 'mazda', model: 'cx3',            q: 'CX-3',           filterNot: ['CX-30', 'CX-35'] },
  { make: 'mazda', model: 'cx5',            q: 'CX-5' },
  { make: 'mazda', model: 'mazda6',         q: 'MAZDA6' },
  { make: 'mazda', model: 'mx5',            q: 'MX-5' },
  // VW
  { make: 'volkswagen', model: 'polo',      q: 'POLO',           filterNot: ['CROSS'] },
  { make: 'volkswagen', model: 'golf',      q: 'GOLF' },
  { make: 'volkswagen', model: 'tiguan',    q: 'TIGUAN' },
  { make: 'volkswagen', model: 'troc',      q: 'T-ROC' },
  { make: 'volkswagen', model: 'taigo',     q: 'TAIGO' },
  { make: 'volkswagen', model: 'id3',       q: 'ID.3' },
  { make: 'volkswagen', model: 'id4',       q: 'ID.4' },
  // Skoda
  { make: 'skoda', model: 'octavia',        q: 'OCTAVIA', minYear: 2010 },
  { make: 'skoda', model: 'kodiaq',         q: 'KODIAQ' },
  { make: 'skoda', model: 'karoq',          q: 'KAROQ' },
  { make: 'skoda', model: 'kamiq',          q: 'KAMIQ' },
  { make: 'skoda', model: 'fabia',          q: 'FABIA', minYear: 2017 },
  { make: 'skoda', model: 'enyaq',          q: 'ENYAQ' },
  { make: 'skoda', model: 'scala',          q: 'SCALA' },
  // Seat/Cupra
  { make: 'seat',  model: 'arona',          q: 'ARONA' },
  { make: 'seat',  model: 'ibiza',          q: 'IBIZA', minYear: 2013 },
  { make: 'seat',  model: 'leon',           q: 'LEON',           filterNot: ['CUPRA'], minYear: 2013 },
  { make: 'seat',  model: 'ateca',          q: 'ATECA',          filterNot: ['CUPRA'] },
  { make: 'cupra', model: 'formentor',      q: 'FORMENTOR' },
  { make: 'cupra', model: 'born',           q: 'BORN' },
  { make: 'cupra', model: 'ateca',          q: 'CUPRA ATECA' },
  // Audi
  { make: 'audi',  model: 'q3',             q: 'Q3' },
  { make: 'audi',  model: 'q5',             q: 'Q5' },
  // Renault
  { make: 'renault', model: 'clio',         q: 'CLIO' },
  { make: 'renault', model: 'megane',       q: 'MEGANE', minYear: 2020 },
  { make: 'renault', model: 'arkana',       q: 'ARKANA' },
  { make: 'renault', model: 'zoe',          q: 'ZOE' },
  // Dacia
  { make: 'dacia', model: 'duster',         q: 'DUSTER' },
  { make: 'dacia', model: 'sandero',        q: 'SANDERO' },
  { make: 'dacia', model: 'spring',         q: 'SPRING' },
  // Mitsubishi
  { make: 'mitsubishi', model: 'eclipse-cross', q: 'ECLIPSE CROSS' },
  { make: 'mitsubishi', model: 'outlander',     q: 'OUTLANDER' },
  { make: 'mitsubishi', model: 'asx',           q: 'ASX' },
  { make: 'mitsubishi', model: 'colt',          q: 'COLT' },
  // Subaru
  { make: 'subaru', model: 'forester',      q: 'FORESTER' },
  { make: 'subaru', model: 'outback',       q: 'OUTBACK' },
  { make: 'subaru', model: 'xv',            q: 'XV' },
  { make: 'subaru', model: 'impreza',       q: 'IMPREZA' },
  // Suzuki
  { make: 'suzuki', model: 'vitara',        q: 'VITARA' },
  { make: 'suzuki', model: 'scross',        q: 'S-CROSS' },
  { make: 'suzuki', model: 'swift',         q: 'SWIFT' },
  { make: 'suzuki', model: 'jimny',         q: 'JIMNY' },
  // Volvo
  { make: 'volvo', model: 'xc40',           q: 'XC40' },
  { make: 'volvo', model: 'xc60',           q: 'XC60' },
  { make: 'volvo', model: 'xc90',           q: 'XC90' },
  { make: 'volvo', model: 's60',            q: 'S60' },
  { make: 'volvo', model: 'ex30',           q: 'EX30' },
  // Lexus
  { make: 'lexus', model: 'nx',             q: 'NX' },
  { make: 'lexus', model: 'rx',             q: 'RX' },
  { make: 'lexus', model: 'es',             q: 'ES' },
  { make: 'lexus', model: 'is',             q: 'IS' },
  { make: 'lexus', model: 'ux',             q: 'UX' },
  // Jeep
  { make: 'jeep',  model: 'compass',        q: 'JEEP COMPASS' },
  { make: 'jeep',  model: 'avenger',        q: 'AVENGER' },
  { make: 'jeep',  model: 'wrangler',       q: 'WRANGLER' },
  { make: 'jeep',  model: 'renegade',       q: 'RENEGADE' },
  // Honda
  { make: 'honda', model: 'crv',            q: 'CRV 2.0' },
  { make: 'honda', model: 'civic',          q: 'CIVIC' },
  // MG
  { make: 'mg',    model: 'mg-zs',          q: 'MG ZS' },
  { make: 'mg',    model: 'mg4',            q: 'MG4' },
  { make: 'mg',    model: 'hs',             q: 'MG HS' },
  // Peugeot — careful with 208/2008/3008 prefix matching
  { make: 'peugeot', model: '208',          q: '208',            peugeotExact: true },
  { make: 'peugeot', model: '2008',         q: '2008' },
  { make: 'peugeot', model: '3008',         q: '3008' },
  { make: 'peugeot', model: '5008',         q: '5008' },
  // Opel
  { make: 'opel',  model: 'corsa',          q: 'CORSA' },
  { make: 'opel',  model: 'mokka',          q: 'MOKKA' },
  { make: 'opel',  model: 'astra',          q: 'ASTRA' },
  { make: 'opel',  model: 'grandland',      q: 'GRANDLAND' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Map Hebrew fuel type → engine_type */
function mapFuel(delek) {
  if (!delek) return null;
  const d = delek.trim();
  if (d === 'בנזין') return 'petrol';
  if (d === 'דיזל')  return 'diesel';
  if (d === 'חשמל')  return 'electric';
  if (d.startsWith('היברידי')) return 'hybrid';
  if (d === 'גז')    return 'petrol'; // LPG → treat as petrol
  return null;
}

/** Map automatic_ind → transmission */
function mapTransmission(autoInd) {
  return autoInd === 1 || autoInd === '1' ? 'automatic' : 'manual';
}

/** Map Hebrew drive type → drive */
function mapDrive(driveHe) {
  if (!driveHe) return 'fwd';
  if (driveHe.includes('כל הגלגלים')) return 'awd';
  if (driveHe.includes('אחורית'))     return 'rwd';
  return 'fwd';
}

/** Build features array from gov API record */
function mapFeatures(rec) {
  const features = new Set();

  // Always present in Israeli market modern cars
  features.add('push_start');
  features.add('led_lights');
  features.add('apple_carplay');

  const flag = (field) => rec[field] === 1 || rec[field] === '1';

  if (flag('matzlemat_reverse_ind'))                      features.add('rear_camera');
  if (flag('teura_automatit_benesiya_kadima_ind'))        features.add('aeb');
  if (flag('zihuy_holchey_regel_ind'))                    features.add('aeb'); // pedestrian detection → aeb
  if (flag('bakarat_shyut_adaptivit_ind'))                features.add('adaptive_cruise');
  if (flag('zihuy_beshetah_nistar_ind'))                  features.add('blind_spot');
  if (flag('bakarat_stiya_menativ_ind'))                  features.add('lane_keep');
  if (flag('nitur_merhak_milfanim_ind'))                  features.add('parking_sensors');
  if (flag('shlita_automatit_beorot_gvohim_ind'))         features.add('auto_lights');
  if (flag('zihuy_tamrurey_tnua_ind'))                    features.add('traffic_sign');
  if (flag('halon_bagg_ind'))                             features.add('sunroof');
  // tire pressure monitoring: not a separate feature key, skip

  return [...features].sort();
}

/**
 * Fetch records from the Israeli government open data API.
 * Returns raw records array.
 */
async function fetchGovRecords(q, attempt = 0) {
  const url = new URL(GOV_API);
  url.searchParams.set('resource_id', RESOURCE);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '500');

  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    return data.result?.records ?? [];
  } catch (err) {
    if (attempt === 0) {
      await sleep(1000);
      return fetchGovRecords(q, 1);
    }
    throw err;
  }
}

/**
 * Check whether a record's kinuy_mishari matches the model entry.
 * Handles peugeotExact flag, filterNot, and general substring matching.
 */
function recordMatchesModel(rec, entry) {
  const commercial = (rec.kinuy_mishari ?? '').toUpperCase().trim();
  const q = entry.q.toUpperCase();

  // Peugeot 208 exact match: must start with "208 " or equal "208"
  if (entry.peugeotExact) {
    if (commercial !== q && !commercial.startsWith(q + ' ')) return false;
  } else {
    if (!commercial.includes(q)) return false;
  }

  // Apply filterNot
  if (entry.filterNot) {
    for (const notTerm of entry.filterNot) {
      if (commercial.includes(notTerm.toUpperCase())) return false;
    }
  }

  return true;
}

/**
 * Process raw gov API records for a model entry.
 * Returns array of trim rows ready to INSERT.
 */
function processRecords(records, entry) {
  // 1. Filter to this model's records (year >= MIN_YEAR, matching commercial name)
  const minYear = entry.minYear ?? MIN_YEAR;
  const filtered = records.filter(rec => {
    const year = parseInt(rec.shnat_yitzur, 10);
    if (isNaN(year) || year < minYear) return false;

    const trim = (rec.ramat_gimur ?? '').trim();
    if (!trim) return false;

    return recordMatchesModel(rec, entry);
  });

  // 2. Deduplicate by ramat_gimur: keep latest year per trim name
  const byTrim = new Map();
  for (const rec of filtered) {
    const trimName = rec.ramat_gimur.trim().toUpperCase();
    const year = parseInt(rec.shnat_yitzur, 10);
    const existing = byTrim.get(trimName);
    if (!existing || year > parseInt(existing.shnat_yitzur, 10)) {
      byTrim.set(trimName, rec);
    }
  }

  if (byTrim.size === 0) return [];

  // 2b. Only keep trims from the latest year found across this model
  const latestYear = Math.max(...[...byTrim.values()].map(r => parseInt(r.shnat_yitzur, 10)));
  const yearThreshold = Math.max(latestYear - 1, MIN_YEAR); // allow latest year ± 1
  for (const [k, rec] of byTrim) {
    if (parseInt(rec.shnat_yitzur, 10) < yearThreshold) byTrim.delete(k);
  }

  if (byTrim.size === 0) return [];

  // 3. Map each unique trim to a DB row
  const rows = [];
  for (const [, rec] of byTrim) {
    const hp = parseInt(rec.koah_sus, 10) || null;
    const cc = parseInt(rec.nefah_manoa, 10) || null;
    const seats = parseInt(rec.mispar_moshavim, 10) || 5;
    const fuel = mapFuel(rec.delek_nm);

    rows.push({
      make_slug:    entry.make,
      model_slug:   entry.model,
      name:         rec.ramat_gimur.trim(),
      sort_order:   0, // will be set after sorting
      engine_type:  fuel,
      engine_cc:    cc || null,
      engine_hp:    hp || null,
      transmission: mapTransmission(rec.automatic_ind),
      drive:        mapDrive(rec.technologiat_hanaa_nm),
      seat_count:   seats,
      features:     mapFeatures(rec),
      price_ils:    null,
    });
  }

  // 4. Sort by HP ascending; nulls last
  rows.sort((a, b) => {
    if (a.engine_hp === null && b.engine_hp === null) return 0;
    if (a.engine_hp === null) return 1;
    if (b.engine_hp === null) return -1;
    return a.engine_hp - b.engine_hp;
  });

  // 5. Assign sort_order
  rows.forEach((row, i) => { row.sort_order = i; });

  return rows;
}

// ─── Supabase REST helpers ────────────────────────────────────────────────────

async function deleteTrimsByModel(makeSlug, modelSlug) {
  const res = await fetch(
    `${SB_URL}/rest/v1/car_trims?make_slug=eq.${encodeURIComponent(makeSlug)}&model_slug=eq.${encodeURIComponent(modelSlug)}`,
    {
      method: 'DELETE',
      headers: {
        apikey:          SB_KEY,
        Authorization:   `Bearer ${SB_KEY}`,
        'Content-Type':  'application/json',
        Prefer:          'return=minimal',
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DELETE failed (${res.status}): ${body}`);
  }
}

async function insertTrim(row) {
  const res = await fetch(
    `${SB_URL}/rest/v1/car_trims`,
    {
      method: 'POST',
      headers: {
        apikey:          SB_KEY,
        Authorization:   `Bearer ${SB_KEY}`,
        'Content-Type':  'application/json',
        Prefer:          'return=minimal',
      },
      body: JSON.stringify(row),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`INSERT failed (${res.status}): ${body}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const models = MAKE_FILTER
    ? MODEL_MAP.filter(m => m.make === MAKE_FILTER)
    : MODEL_MAP;

  if (DRY_RUN) console.log('[DRY RUN] No writes will be performed.\n');

  let successCount = 0;
  let warnCount    = 0;
  let errorCount   = 0;

  for (const entry of models) {
    const label = `${entry.make}/${entry.model}`;
    try {
      // Fetch from gov API
      const records = await fetchGovRecords(entry.q);

      // Process into trim rows
      const trims = processRecords(records, entry);

      if (trims.length === 0) {
        console.warn(`⚠ ${label}: 0 valid trims found — skipping (data not deleted)`);
        warnCount++;
        await sleep(DELAY_MS);
        continue;
      }

      if (DRY_RUN) {
        console.log(`[DRY] ${label}: ${trims.length} trims`);
        for (const t of trims) {
          console.log(`      [${t.sort_order}] "${t.name}" hp=${t.engine_hp} fuel=${t.engine_type} tx=${t.transmission} drive=${t.drive}`);
          console.log(`           features: ${t.features.join(', ')}`);
        }
        await sleep(DELAY_MS);
        successCount++;
        continue;
      }

      // Delete existing trims for this make/model
      await deleteTrimsByModel(entry.make, entry.model);

      // Insert new trims one by one
      for (const row of trims) {
        await insertTrim(row);
      }

      console.log(`✓ ${label}: ${trims.length} trims`);
      successCount++;
    } catch (err) {
      console.error(`✗ ${label}: ${err.message}`);
      errorCount++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`Done. ${successCount} OK, ${warnCount} skipped, ${errorCount} errors.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

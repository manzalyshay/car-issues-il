#!/usr/bin/env node
/**
 * scrape-perf-data.mjs
 *
 * Scrapes real performance specs from auto-data.net for all car trims in the DB.
 * 4-level hierarchy:  brand page → model page → generation page → trim spec page
 *
 * Workflow:
 *   1. Load make/model/HP groups from local SQLite
 *   2. Fetch brand pages  → build slug→modelID map  (cached)
 *   3. Fetch model pages  → build modelID→genIDs    (cached, recent gens only)
 *   4. Fetch gen pages    → build HP→trimURL         (cached)
 *   5. Fetch trim pages   → extract specs
 *   6. UPDATE local SQLite + remote Cloudflare D1
 *
 * Usage:
 *   node scripts/scrape-perf-data.mjs               # full run
 *   node scripts/scrape-perf-data.mjs --dry          # print updates, no DB writes
 *   node scripts/scrape-perf-data.mjs --discover-only # stop after building URL map
 *   node scripts/scrape-perf-data.mjs --make=toyota  # single make
 *   node scripts/scrape-perf-data.mjs --no-cache     # ignore cached discovery data
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from '/workspace/car-issues-il/node_modules/better-sqlite3/lib/index.js';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── CLI flags ────────────────────────────────────────────────────────────────
const DRY           = process.argv.includes('--dry');
const DISCOVER_ONLY = process.argv.includes('--discover-only');
const NO_CACHE      = process.argv.includes('--no-cache');
const MAKE_FILTER   = (process.argv.find(a => a.startsWith('--make=')) ?? '').replace('--make=', '') || null;

const DELAY        = 1200;  // ms between HTTP requests (be polite)
const CACHE_DIR    = join(__dir, '../.cache/perf-scrape');
const LOCAL_DB     = '/workspace/car-issues-il/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/94d3a3dca7223ebf64b57b6a465db86c2414ed4822522900b8878ff93c47b3f7.sqlite';
const WRANGLER_CWD = '/workspace/car-issues-il';
const BASE         = 'https://www.auto-data.net';

// ── Helpers ──────────────────────────────────────────────────────────────────
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

function cacheRead(key) {
  if (NO_CACHE) return null;
  const p = join(CACHE_DIR, key + '.json');
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}
function cacheWrite(key, data) {
  writeFileSync(join(CACHE_DIR, key + '.json'), JSON.stringify(data, null, 2));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(path) {
  const url = path.startsWith('http') ? path : BASE + path;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// ── auto-data.net brand → model ID map ──────────────────────────────────────
// brand IDs from auto-data.net home page
const BRAND_IDS = {
  'alfa-romeo':  11,
  'audi':        41,
  'bmw':         86,
  'byd':         116,
  'chevrolet':   156,
  'cupra':       256,
  'dacia':       181,
  'fiat':        67,
  'ford':        72,
  'honda':       127,
  'hyundai':     147,
  'jeep':        8,
  'kia':         23,
  'land-rover':  48,
  'lexus':       58,
  'mazda':       118,
  'mercedes':    138,  // mercedes-benz on site
  'mg':          153,
  'mitsubishi':  173,
  'nissan':      4,
  'opel':        19,
  'peugeot':     49,
  'porsche':     64,
  'renault':     99,
  'seat':        144,
  'skoda':       154,
  'subaru':      189,
  'suzuki':      194,
  'tesla':       197,
  'toyota':      40,
  'volkswagen':  80,
  'volvo':       85,
  // BYD sub-brands / Chinese brands
  'chery':       null,  // will try searching
  'geely':       null,  // will try searching
};

// DB model slug → auto-data.net search name  (only overrides from default)
const MODEL_NAME_OVERRIDES = {
  // BMW
  'series1': '1-series',
  'series3': '3-series',
  'series5': '5-series',
  'ix3':     'ix3',
  // Mercedes — all go through mercedes-benz on site
  'a180': 'a 180',
  'a200': 'a 200',
  'a220': 'a 220',
  'a250': 'a 250',
  'a35-amg': 'a 35 amg',
  'a45-amg': 'a 45 amg',
  'b-class': 'b-class',
  'c-class': 'c-class',
  'c180': 'c 180',
  'c200': 'c 200',
  'c220d': 'c 220 d',
  'c300': 'c 300',
  'c300d': 'c 300 d',
  'c43-amg': 'c 43 amg',
  'c63-amg': 'c 63 amg',
  'cla':  'cla',
  'e-class': 'e-class',
  'eqb': 'eqb',
  'eqc': 'eqc',
  'gla': 'gla',
  'glb': 'glb',
  'glc': 'glc',
  // Toyota
  'chr': 'c-hr',
  'bz4x': 'bz4x',
  'corolla-cross': 'corolla cross',
  'yaris-cross': 'yaris cross',
  'land-cruiser': 'land cruiser',
  // Mazda
  'cx3':    'cx-3',
  'cx5':    'cx-5',
  'cx30':   'cx-30',
  'mazda3': '3',
  'mazda6': '6',
  'mx5':    'mx-5',
  // VW
  'troc': 't-roc',
  'id3':  'id.3',
  'id4':  'id.4',
  // Skoda
  'enyaq': 'enyaq iv',
  // Honda
  'crv': 'cr-v',
  'hrv': 'hr-v',
  // MG
  'mg-zs': 'zs',
  'mg4': 'mg4',
  'mg5': 'mg5',
  'ehs': 'ehs',
  // Land Rover
  'range-rover-evoque': 'range rover evoque',
  'range-rover-sport':  'range rover sport',
  'range-rover-velar':  'range rover velar',
  'range-rover':        'range rover',
  'discovery-sport':    'discovery sport',
  // Hyundai
  'ioniq-5': 'ioniq 5',
  'ioniq-6': 'ioniq 6',
  'santa-fe': 'santa fe',
  // Kia
  'ev6': 'ev6',
  'ev9': 'ev9',
  // Jeep
  'grand-cherokee': 'grand cherokee',
  'renegade': 'renegade',
  // Mitsubishi
  'eclipse-cross': 'eclipse cross',
  'pajero-sport': 'pajero sport',
  'space-star': 'space star',
  // Alfa Romeo
  'giulietta': 'giulietta',
  // Subaru
  'xv': 'xv',
  // Ford
  'puma': 'puma',
  'kuga': 'kuga',
  'ranger': 'ranger',
  // Nissan
  'x-trail': 'x-trail',
  'navara': 'navara',
  'qashqai': 'qashqai',
};

function modelSearchName(modelSlug) {
  return (MODEL_NAME_OVERRIDES[modelSlug] ?? modelSlug).toLowerCase();
}

// ── DB ───────────────────────────────────────────────────────────────────────
const localDb = new Database(LOCAL_DB);

function dbAll(sql, ...p) { return localDb.prepare(sql).all(...p); }
function dbRun(sql, ...p) { return localDb.prepare(sql).run(...p); }

function loadTrimGroups(makeFilter) {
  const where = makeFilter ? `AND make_slug = '${makeFilter}'` : '';
  return dbAll(`
    SELECT make_slug, model_slug, engine_hp, engine_type, engine_cc, transmission,
           GROUP_CONCAT(id) as ids
    FROM car_trims
    WHERE engine_hp IS NOT NULL ${where}
    GROUP BY make_slug, model_slug, engine_hp, engine_type, engine_cc, transmission
    ORDER BY make_slug, model_slug, engine_hp
  `);
}

// ── Parse helpers ────────────────────────────────────────────────────────────

/** Extract all <a href="/en/..."> links matching pattern from HTML */
function extractLinks(html, pattern) {
  const re = /href="(\/en\/[^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    if (pattern.test(m[1])) out.push(m[1]);
  }
  return [...new Set(out)];
}

/** Find model link on brand page matching search name */
function findModelLink(html, makeSlug, modelSearchStr) {
  // Links look like: /en/toyota-yaris-model-490
  const makeForUrl = makeSlug === 'mercedes' ? 'mercedes-benz' : makeSlug;
  const links = extractLinks(html, /model-\d+$/);

  // Normalize: remove make prefix from link text area
  const searchNorm = modelSearchStr.replace(/[-\s]+/g, '').toLowerCase();

  // Score each link by how well it matches
  const scored = links.map(href => {
    // href like /en/toyota-yaris-model-490
    const slug = href
      .replace(`/en/${makeForUrl}-`, '')
      .replace(/-model-\d+$/, '')
      .replace(/[-\s]+/g, '').toLowerCase();

    // Exact match
    if (slug === searchNorm) return { href, score: 100 };
    // Starts with search
    if (slug.startsWith(searchNorm)) return { href, score: 80 };
    // Search starts with slug (model is prefix of our search)
    if (searchNorm.startsWith(slug)) return { href, score: 60 };
    // Contains
    if (slug.includes(searchNorm) || searchNorm.includes(slug)) return { href, score: 40 };
    return { href, score: 0 };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  return scored[0]?.href ?? null;
}

/** Extract generation links from model page, filter to recent (>= minYear) */
function extractGenerations(html, minYear = 2010) {
  const links = extractLinks(html, /generation-\d+$/);

  // Each gen link appears near a year in the page text; extract year from link text context
  // Simpler: parse years from generation link slugs (they often contain the year)
  // Link: /en/toyota-yaris-xp210-generation-7519
  // We can also scan for text like "2020" near each link in the HTML

  const result = [];
  for (const href of links) {
    // Try to extract start year from href slug parts
    const yearMatch = href.match(/[-_](\d{4})[-_]?generation/);
    const startYear = yearMatch ? parseInt(yearMatch[1]) : null;
    result.push({ href, startYear });
  }

  // If we have years, filter; otherwise keep all
  const withYears = result.filter(g => g.startYear !== null);
  const withoutYears = result.filter(g => g.startYear === null);

  if (withYears.length > 0) {
    const filtered = withYears.filter(g => g.startYear >= minYear);
    // If nothing recent, still include the latest few
    return (filtered.length > 0 ? filtered : withYears.slice(-3))
      .concat(withoutYears.slice(0, 2));
  }

  return result.slice(0, 5); // Take first 5 if no year info
}

/** Extract trim links from generation page, keyed by HP */
function extractTrimsByHp(html) {
  // Links: /en/toyota-yaris-xp210-1.5-91hp-hybrid-e-cvt-38958
  const re = /href="(\/en\/[^"]*-(\d+)hp[^"]*-(\d+))"/g;
  const byHp = {};
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const hp = parseInt(m[2]);
    if (!byHp[hp]) byHp[hp] = [];
    byHp[hp].push(href);
  }
  return byHp;
}

/**
 * Parse a numeric spec value from auto-data.net trim page HTML.
 * Tries ALL occurrences of labelPattern in the HTML (to skip false matches like
 * "torque ratio" before the actual "Torque" spec row), returns the first hit.
 */
function parseSpec(html, labelPattern, valuePattern) {
  const re = new RegExp(labelPattern.source, 'gi');
  let m;
  while ((m = re.exec(html)) !== null) {
    const win = html.slice(m.index, m.index + 350).replace(/<[^>]+>/g, ' ');
    const vm = win.match(valuePattern);
    if (vm) {
      const val = parseFloat(vm[1].replace(/,/g, ''));
      if (!isNaN(val)) return val;
    }
  }
  return null;
}

function parseSpecFromPage(html) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  return {
    // "Acceleration 0 - 100 km/h" → "5.5 sec"
    acceleration_0_100: parseSpec(clean,
      /Acceleration\s+0\s*[-–]\s*100\s*km\/h/i,
      /([\d.]+)\s*sec/i
    ),
    // "Maximum speed" → "229 km/h"
    top_speed_kmh: parseSpec(clean,
      /Maximum speed/i,
      /\b(\d{3,4})\s*km\/h/i          // 3-4 digits: 100–9999 km/h
    ),
    // "Torque" or "Electric motor Torque" → "360 Nm"
    // (avoid "torque ratio 3.6 kg/Nm" — handled by \b(\d{2,4})\s*Nm requiring 2+ digits)
    torque_nm: (
      parseSpec(clean,
        /Electric motor\s+Torque/i,
        /\b(\d{2,4})\s*Nm\b/i
      ) ??
      parseSpec(clean,
        /\bTorque\b/i,
        /\b(\d{2,4})\s*Nm\b/i
      )
    ),
    // Petrol/diesel: "Combined fuel consumption (WLTP)" → "8.2 l/100 km"
    // EV: "Average Energy consumption (WLTP)" → "13.6 kWh/100 km"
    fuel_consumption: (
      parseSpec(clean,
        /Combined fuel consumption\s*\(WLTP\)/i,
        /([\d.]+)\s*l\/100\s*km/i
      ) ??
      parseSpec(clean,
        /fuel consumption[^<]{0,80}ombined/i,
        /([\d.]+)\s*l\/100\s*km/i
      ) ??
      parseSpec(clean,
        /Average Energy consumption\s*\(WLTP\)/i,
        /([\d.]+)\s*kWh\/100\s*km/i
      ) ??
      parseSpec(clean,
        /Electric energy consumption[^<]{0,120}ombined/is,
        /([\d.]+)\s*kWh\/100\s*km/i
      )
    ),
    // "Kerb Weight" → "1280 kg"
    curb_weight_kg: parseSpec(clean,
      /[Kk]erb\s*[Ww]eight|[Cc]urb\s*[Ww]eight/,
      /\b(\d{3,5})\s*kg/i              // 3-5 digits: 500–99999 kg
    ),
  };
}

// ── Remote D1 write ──────────────────────────────────────────────────────────
const TMP_SQL = '/tmp/perf-scrape-updates.sql';

function flushToRemote(statements) {
  if (DRY || statements.length === 0) return;
  writeFileSync(TMP_SQL, statements.join('\n'));
  try {
    execSync(
      `bash -c 'source "$HOME/.nvm/nvm.sh" && nvm use 22 --silent && npx wrangler d1 execute car-issues-db --remote --config wrangler.toml --file "${TMP_SQL}" 2>&1'`,
      { stdio: 'pipe', cwd: WRANGLER_CWD }
    );
  } catch (e) {
    console.warn('  [remote flush warn]', e.message?.slice(0, 120));
  }
}

// ── Step 1: Build model ID map (brand page → model links) ───────────────────
async function discoverModelIds(makes) {
  const cached = cacheRead('model-id-map');
  if (cached) {
    console.log(`  (using cached model-id map with ${Object.keys(cached).length} entries)`);
    return cached;
  }

  const map = {}; // "make/model" → "/en/brand-model-model-ID"

  for (const make of makes) {
    const brandId = BRAND_IDS[make];
    if (!brandId) {
      console.log(`  [${make}] no brand ID — skipping discovery`);
      continue;
    }

    const makeForUrl = make === 'mercedes' ? 'mercedes-benz' : make;
    const brandUrl = `/en/${makeForUrl}-brand-${brandId}`;
    process.stdout.write(`  Fetching brand page ${make} ... `);

    let html;
    try {
      html = await get(brandUrl);
      console.log('OK');
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
      await sleep(DELAY);
      continue;
    }

    // Find models for this make from our DB
    const modelsForMake = dbAll(
      `SELECT DISTINCT model_slug FROM car_trims WHERE make_slug = ? ORDER BY model_slug`,
      make
    ).map(r => r.model_slug);

    for (const modelSlug of modelsForMake) {
      const searchStr = modelSearchName(modelSlug);
      const link = findModelLink(html, make, searchStr);
      if (link) {
        map[`${make}/${modelSlug}`] = link;
      } else {
        console.log(`    [${make}/${modelSlug}] no match for "${searchStr}"`);
      }
    }

    await sleep(DELAY);
  }

  cacheWrite('model-id-map', map);
  return map;
}

// ── Step 2: Build gen links per model ────────────────────────────────────────
async function discoverGenerations(modelIdMap) {
  const cached = cacheRead('gen-map');
  if (cached) {
    console.log(`  (using cached gen map with ${Object.keys(cached).length} entries)`);
    return cached;
  }

  const genMap = {}; // "make/model" → [{ href, startYear }]

  for (const [key, modelHref] of Object.entries(modelIdMap)) {
    process.stdout.write(`  Gens ${key} ... `);
    let html;
    try {
      html = await get(modelHref);
    } catch (e) {
      console.log(`FAIL: ${e.message}`);
      await sleep(DELAY);
      continue;
    }
    const gens = extractGenerations(html, 2010);
    genMap[key] = gens;
    console.log(`${gens.length} generations`);
    await sleep(DELAY);
  }

  cacheWrite('gen-map', genMap);
  return genMap;
}

// ── Step 3: Build HP→trimURL per generation ──────────────────────────────────
async function discoverTrimUrls(genMap, neededHps) {
  const cached = cacheRead('trim-url-map');
  if (cached) {
    console.log(`  (using cached trim-url map with ${Object.keys(cached).length} entries)`);
    return cached;
  }

  // trimUrlMap: "make/model/hp" → [href, ...]
  const trimUrlMap = {};

  for (const [modelKey, gens] of Object.entries(genMap)) {
    const hps = neededHps[modelKey];
    if (!hps || hps.length === 0) continue;

    for (const gen of gens) {
      process.stdout.write(`  Trims ${modelKey} gen ${gen.startYear ?? '?'} ... `);
      let html;
      try {
        html = await get(gen.href);
      } catch (e) {
        console.log(`FAIL: ${e.message}`);
        await sleep(DELAY);
        continue;
      }

      const byHp = extractTrimsByHp(html);
      let added = 0;

      for (const hp of hps) {
        // Exact match first; then ±5 HP tolerance
        const candidates = byHp[hp] ??
          Object.entries(byHp)
            .filter(([k]) => Math.abs(parseInt(k) - hp) <= 5)
            .flatMap(([, v]) => v);

        if (candidates.length > 0) {
          const mapKey = `${modelKey}/${hp}`;
          if (!trimUrlMap[mapKey]) trimUrlMap[mapKey] = [];
          trimUrlMap[mapKey].push(...candidates);
          added++;
        }
      }

      console.log(`${Object.keys(byHp).length} HP variants, matched ${added}/${hps.length}`);
      await sleep(DELAY);
    }
  }

  cacheWrite('trim-url-map', trimUrlMap);
  return trimUrlMap;
}

// ── Step 4: Scrape specs from trim pages ─────────────────────────────────────
async function scrapeAndUpdate(trimGroups, trimUrlMap) {
  const pendingRemote = [];
  let updated = 0;
  let skipped = 0;

  for (const group of trimGroups) {
    const { make_slug, model_slug, engine_hp, engine_type } = group;
    const ids = group.ids.split(',');
    const mapKey = `${make_slug}/${model_slug}/${engine_hp}`;

    const trimUrls = trimUrlMap[mapKey];
    if (!trimUrls || trimUrls.length === 0) {
      skipped++;
      continue;
    }

    // Try trim URLs until we get usable specs; pick first with real acceleration data
    let bestSpec = null;

    for (const url of trimUrls.slice(0, 3)) {
      process.stdout.write(`  Spec ${make_slug}/${model_slug} ${engine_hp}hp ... `);
      let html;
      try {
        html = await get(url);
      } catch (e) {
        console.log(`FAIL: ${e.message}`);
        await sleep(DELAY);
        continue;
      }

      const spec = parseSpecFromPage(html);
      await sleep(DELAY);

      if (!bestSpec ||
          (spec.acceleration_0_100 !== null && bestSpec.acceleration_0_100 === null)) {
        bestSpec = spec;
      }
      if (bestSpec.acceleration_0_100 !== null) break; // good enough
    }

    if (!bestSpec) { skipped++; continue; }

    // Build SET clause (only non-null scraped values)
    const sets = [];
    if (bestSpec.acceleration_0_100 != null) sets.push(`acceleration_0_100 = ${bestSpec.acceleration_0_100}`);
    if (bestSpec.top_speed_kmh != null)      sets.push(`top_speed_kmh = ${bestSpec.top_speed_kmh}`);
    if (bestSpec.torque_nm != null)          sets.push(`torque_nm = ${bestSpec.torque_nm}`);
    if (bestSpec.fuel_consumption != null)   sets.push(`fuel_consumption = ${bestSpec.fuel_consumption}`);
    if (bestSpec.curb_weight_kg != null)     sets.push(`curb_weight_kg = ${bestSpec.curb_weight_kg}`);

    if (sets.length === 0) { skipped++; continue; }

    const setClause = sets.join(', ');
    const sql = ids.map(id =>
      `UPDATE car_trims SET ${setClause} WHERE id = '${id}';`
    ).join('\n');

    console.log(`OK — a=${bestSpec.acceleration_0_100} s=${bestSpec.top_speed_kmh} t=${bestSpec.torque_nm} f=${bestSpec.fuel_consumption} w=${bestSpec.curb_weight_kg}`);

    if (!DRY) {
      // Apply locally
      for (const stmt of sql.split('\n').filter(s => s.length > 5)) {
        try { localDb.prepare(stmt).run(); } catch { /* ignore */ }
      }
      pendingRemote.push(sql);
      updated++;

      // Flush to remote in batches of 50
      if (pendingRemote.length >= 50) {
        flushToRemote(pendingRemote.flatMap(s => s.split('\n').filter(x => x.length > 5)));
        pendingRemote.length = 0;
      }
    } else {
      console.log(`  [DRY] would update ${ids.length} trims`);
      updated++;
    }
  }

  // Final flush
  if (pendingRemote.length > 0) {
    flushToRemote(pendingRemote.flatMap(s => s.split('\n').filter(x => x.length > 5)));
  }

  return { updated, skipped };
}

// ── Summary ──────────────────────────────────────────────────────────────────
function printCoverage() {
  const total = localDb.prepare('SELECT COUNT(*) as n FROM car_trims').get().n;
  const wa = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE acceleration_0_100 IS NOT NULL').get().n;
  const ws = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE top_speed_kmh IS NOT NULL').get().n;
  const wt = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE torque_nm IS NOT NULL').get().n;
  const wf = localDb.prepare('SELECT COUNT(*) as n FROM car_trims WHERE fuel_consumption IS NOT NULL').get().n;
  console.log(`\nDB Coverage (${total} trims):`);
  console.log(`  acceleration: ${wa}/${total} (${Math.round(wa/total*100)}%)`);
  console.log(`  top_speed:    ${ws}/${total} (${Math.round(ws/total*100)}%)`);
  console.log(`  torque:       ${wt}/${total} (${Math.round(wt/total*100)}%)`);
  console.log(`  fuel:         ${wf}/${total} (${Math.round(wf/total*100)}%)`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('=== Performance Data Scraper (auto-data.net) ===');
console.log(`Mode: ${DRY ? 'DRY RUN' : 'LIVE'} | make filter: ${MAKE_FILTER ?? 'all'} | cache: ${NO_CACHE ? 'off' : 'on'}`);
printCoverage();

const trimGroups = loadTrimGroups(MAKE_FILTER);
const makes = [...new Set(trimGroups.map(g => g.make_slug))];

// neededHps: "make/model" → [hp, ...]
const neededHps = {};
for (const g of trimGroups) {
  const key = `${g.make_slug}/${g.model_slug}`;
  if (!neededHps[key]) neededHps[key] = [];
  if (!neededHps[key].includes(g.engine_hp)) neededHps[key].push(g.engine_hp);
}

console.log(`\nModels: ${Object.keys(neededHps).length} | Makes: ${makes.length}`);

console.log('\n--- Step 1: Discover model IDs ---');
const modelIdMap = await discoverModelIds(makes);
console.log(`Model ID map: ${Object.keys(modelIdMap).length} entries`);

if (DISCOVER_ONLY) {
  console.log('\nModel ID map:');
  for (const [k, v] of Object.entries(modelIdMap)) console.log(`  ${k} → ${v}`);
  process.exit(0);
}

console.log('\n--- Step 2: Discover generation links ---');
const genMap = await discoverGenerations(modelIdMap);

console.log('\n--- Step 3: Discover trim URLs ---');
const trimUrlMap = await discoverTrimUrls(genMap, neededHps);
const totalTrimUrls = Object.values(trimUrlMap).reduce((s, v) => s + v.length, 0);
console.log(`Trim URL map: ${Object.keys(trimUrlMap).length} HP groups, ${totalTrimUrls} URLs`);

console.log('\n--- Step 4: Scrape specs & update DB ---');
const { updated, skipped } = await scrapeAndUpdate(trimGroups, trimUrlMap);

printCoverage();
console.log(`\nDone. Updated: ${updated} groups, Skipped (no URL): ${skipped}`);

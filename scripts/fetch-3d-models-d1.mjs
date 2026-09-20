/**
 * Fetches Sketchfab 3D models for cars missing them — no API token needed.
 * Writes directly to D1 via wrangler.
 *
 * Run: node scripts/fetch-3d-models-d1.mjs [--dry-run] [--delay 2000]
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELAY = parseInt(args[args.indexOf('--delay') + 1] ?? '2000') || 2000;
const CWD = '/workspace/car-issues-il';

function d1(sql) {
  const oneLiner = sql.replace(/\s+/g, ' ').trim();
  const out = execSync(
    `npx wrangler d1 execute car-issues-db --config wrangler.toml --remote --command ${JSON.stringify(oneLiner)} 2>/dev/null`,
    { encoding: 'utf8', cwd: CWD }
  );
  const match = out.match(/"results"\s*:\s*(\[[\s\S]*?\])\s*,\s*"success"/);
  if (!match) return [];
  try { return JSON.parse(match[1]); } catch { return []; }
}

function d1File(sql) {
  const file = join(tmpdir(), `3d-d1-${Date.now()}.sql`);
  writeFileSync(file, sql);
  try {
    execSync(
      `npx wrangler d1 execute car-issues-db --config wrangler.toml --remote --file ${JSON.stringify(file)} 2>/dev/null`,
      { encoding: 'utf8', cwd: CWD }
    );
  } finally {
    try { unlinkSync(file); } catch {}
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escapeSql(s) { return String(s ?? '').replace(/'/g, "''"); }

function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const MAKE_ALIASES = {
  'mercedes': ['mercedes', 'benz', 'mercedes-benz'],
  'volkswagen': ['volkswagen', 'vw'],
  'bmw': ['bmw'],
};

function nameMatchesCar(sketchfabName, makeEn, modelEn) {
  const n = stripAccents(sketchfabName.toLowerCase());
  const makeLower = makeEn.toLowerCase();
  const aliases = MAKE_ALIASES[makeLower] ?? [makeLower];
  if (!aliases.some(a => n.includes(a))) return false;

  // Strip make name from model for keyword matching
  const cleanModel = modelEn.replace(new RegExp(`^${makeEn}\\s+`, 'i'), '');
  const words = stripAccents(cleanModel.toLowerCase())
    .split(/[\s\-_\.]+/)
    .filter(w => w.length >= 2 || /^\d+$/.test(w));

  return words.some(w => {
    if (/^\d+$/.test(w)) return new RegExp(`(?<![\\d])${w}(?![\\d])`).test(n);
    return n.includes(w);
  });
}

async function searchSketchfab(query) {
  const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(query)}&count=20&sort_by=-likeCount`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Sketchfab ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

async function findModel(makeSlug, modelSlug, makeEn, modelEn) {
  const cleanModel = modelEn.replace(new RegExp(`^${makeEn}\\s+`, 'i'), '');
  const queries = [`${makeEn} ${cleanModel}`, `${makeEn} ${cleanModel} 3D model`];

  for (const query of queries) {
    let results;
    try { results = await searchSketchfab(query); }
    catch (e) { console.warn(`  search error: ${e.message}`); return null; }

    // Filter NC/ND licenses
    const licensed = results.filter(r => {
      const lic = r.license?.label ?? '';
      return !lic.includes('NonCommercial') && !lic.includes('NoDerivatives');
    });

    const matched = licensed.filter(r => nameMatchesCar(r.name, makeEn, cleanModel));
    if (matched.length) return matched[0];

    // Relaxed: make name in result
    const makeAliases = MAKE_ALIASES[makeEn.toLowerCase()] ?? [makeEn.toLowerCase()];
    const relaxed = licensed.filter(r =>
      makeAliases.some(a => r.name.toLowerCase().includes(a))
    );
    if (relaxed.length) return relaxed[0];

    await sleep(500);
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Fetching models missing 3D models from D1...\n');

const allModels = d1(`
  SELECT cm.make_slug, cm.slug as model_slug, cm.name_en, m.name_en as make_name_en
  FROM car_models cm
  JOIN car_makes m ON m.slug = cm.make_slug
`);

const has3d = new Set(
  d1('SELECT make_slug || \'/\' || model_slug as key FROM car_3d_models WHERE hidden IS NOT 1')
    .map(r => r.key)
);

const missing = allModels.filter(m => !has3d.has(`${m.make_slug}/${m.model_slug}`));
console.log(`Models with 3D: ${has3d.size} / ${allModels.length}`);
console.log(`Models missing 3D: ${missing.length}\n`);

if (missing.length === 0) { console.log('Nothing to do.'); process.exit(0); }

if (DRY_RUN) {
  console.log('DRY RUN — would search:');
  missing.forEach((m, i) => console.log(`  ${i + 1}. ${m.make_name_en} ${m.name_en}`));
  process.exit(0);
}

let found = 0, notFound = 0;

for (let i = 0; i < missing.length; i++) {
  const { make_slug, model_slug, name_en, make_name_en } = missing[i];
  const cleanModel = name_en.replace(new RegExp(`^${make_name_en}\\s+`, 'i'), '');
  process.stdout.write(`[${i + 1}/${missing.length}] ${make_name_en} ${cleanModel}... `);

  const model = await findModel(make_slug, model_slug, make_name_en, name_en);

  if (!model) {
    console.log('✗ not found');
    notFound++;
  } else {
    const id = randomUUID();
    const uid = escapeSql(model.uid);
    const sname = escapeSql(model.name);
    const author = escapeSql(model.user?.username ?? model.user?.displayName ?? 'unknown');
    const license = escapeSql(model.license?.label ?? 'CC Attribution');
    const sql = `INSERT OR IGNORE INTO car_3d_models (id, make_slug, model_slug, sketchfab_uid, sketchfab_name, sketchfab_author, license, hidden) VALUES ('${id}','${make_slug}','${model_slug}','${uid}','${sname}','${author}','${license}',0);`;
    d1File(sql);
    console.log(`✓ "${model.name}"`);
    found++;
  }

  if (i < missing.length - 1) await sleep(DELAY);
}

console.log(`\nDone! Found: ${found}  Not found: ${notFound}  Total: ${missing.length}`);

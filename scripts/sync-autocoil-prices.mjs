/**
 * scripts/sync-autocoil-prices.mjs
 *
 * Sets car_trims.price_ils from auto.co.il's current Israeli list prices, and records
 * where each price came from (price_source = 'auto.co.il', price_checked_at = today).
 *
 * auto.co.il model pages (https://www.auto.co.il/cars/<make>/<model>/) list the versions
 * on sale now in the #sel-car-version-btn dropdown; the same version ids carry
 * data-price="<ILS>" in the page's version comboboxes. Older model years have no list
 * price there (only cars on sale have one), so only current versions are priced.
 *
 * It only UPDATEs existing rows, never inserts trims:
 *   1. Rows linked to auto.co.il (auto_co_il_id = a current version id) get that price.
 *   2. Other rows (hand-entered trims) get a price when their name matches exactly one
 *      current version's trim name (the last comma part, e.g. "..., Active" = "ACTIVE").
 *      Several current versions with that trim name and different prices = skipped.
 * Rows with no match keep their old price and get no price_source, so verified prices
 * can be told apart from the old estimates.
 *
 * Usage:
 *   node scripts/sync-autocoil-prices.mjs              # dry run: writes the report + SQL only
 *   node scripts/sync-autocoil-prices.mjs --apply      # also runs the SQL on remote D1
 *   node scripts/sync-autocoil-prices.mjs --model toyota/corolla-cross
 * Needs CLOUDFLARE_API_TOKEN for wrangler (remote D1). Run migrations/0019 first.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, '.price-sync');
const APPLY = process.argv.includes('--apply');
const ONLY = (() => { const i = process.argv.indexOf('--model'); return i > 0 ? process.argv[i + 1] : null; })();
const TODAY = new Date().toISOString().slice(0, 10);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const MIN_PLAUSIBLE = 20000;

// Our slug → auto.co.il path, where they differ (from scripts/seed-trims-autocoil.ts)
const SLUG_OVERRIDES = {
  'mazda/cx3': 'mazda/cx-3', 'mazda/cx5': 'mazda/cx-5', 'mazda/cx30': 'mazda/cx-30',
  'mazda/mazda3': 'mazda/3', 'mazda/mazda6': 'mazda/6',
  'bmw/series1': 'bmw/1-series', 'bmw/series3': 'bmw/3-series', 'bmw/series5': 'bmw/5-series',
  'toyota/chr': 'toyota/c-hr', 'volkswagen/troc': 'volkswagen/t-roc',
  'mercedes/a-class': 'mercedes-benz/a-class', 'mercedes/b-class': 'mercedes-benz/b-class',
  'mercedes/c-class': 'mercedes-benz/c-class', 'mercedes/cla': 'mercedes-benz/cla-class',
  'mercedes/e-class': 'mercedes-benz/e-class', 'mercedes/eqb': 'mercedes-benz/eqb',
  'mercedes/eqc': 'mercedes-benz/eqc', 'mercedes/gla': 'mercedes-benz/gla-class',
  'mercedes/glb': 'mercedes-benz/glb', 'mercedes/glc': 'mercedes-benz/glc-class',
  'byd/atto3': 'byd/atto-3', 'byd/sealion7': 'byd/sealion-7',
  'honda/crv': 'honda/cr-v', 'honda/hrv': 'honda/hr-v', 'mg/mg-zs': 'mg/zs', 'skoda/enyaq': 'skoda/enyaq-iv',
};

function d1(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'car-issues-db', '--remote', '--json', '--command', sql],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
}

const decode = s => s.replace(/&#x27;/g, "'").replace(/&#x2B;/gi, '+').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const norm = s => String(s).toLowerCase().replace(/platinium/g, 'platinum').replace(/[^a-z0-9\u0590-\u05ff]+/g, '');
const DRIVE = /^(4x4|4x2|awd|rwd|fwd|\d+x\d+)$/i;
function trimToken(versionName) {
  const parts = decode(versionName).split(',').map(p => p.trim()).filter(Boolean);
  while (parts.length > 1 && DRIVE.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1] || '';
}

/** Current versions on an auto.co.il model page: [{id, name, price, year}] */
async function currentVersions(path) {
  const res = await fetch(`https://www.auto.co.il/cars/${path}/`, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9' } });
  if (!res.ok) return { status: res.status, versions: [] };
  const html = await res.text();
  const sel = html.match(/<select[^>]*id="sel-car-version-btn"[^>]*>([\s\S]*?)<\/select>/);
  if (!sel) return { status: 'no-version-list', versions: [] };
  const prices = new Map([...html.matchAll(/<option value="(\d+)"[^>]*?data-price="(\d*)"/g)].map(m => [m[1], Number(m[2]) || null]));
  const years = new Map([...html.matchAll(new RegExp(`/cars/${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\d{4})/(\\d+)/`, 'g'))].map(m => [m[2], Number(m[1])]));
  const versions = [...sel[1].matchAll(/<option value="(\d+)"[^>]*>([^<]*)/g)].map(([, id, name]) => ({
    id, name: decode(name).trim(), price: prices.get(id) ?? null, year: years.get(id) ?? null,
  }));
  return { status: 200, versions };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const rows = d1(`SELECT id, make_slug, model_slug, name, model_year, price_ils, auto_co_il_id FROM car_trims WHERE is_israel = 1`);
  const byModel = new Map();
  for (const r of rows) {
    const k = `${r.make_slug}/${r.model_slug}`;
    if (ONLY && k !== ONLY) continue;
    (byModel.get(k) || byModel.set(k, []).get(k)).push(r);
  }
  console.log(`${byModel.size} models, ${rows.length} trims`);

  const updates = [], report = [];
  let n = 0;
  for (const [key, trims] of byModel) {
    n++;
    const path = SLUG_OVERRIDES[key] || key;
    let page;
    try { page = await currentVersions(path); } catch (e) { page = { status: 'fetch-error', versions: [] }; }
    const priced = page.versions.filter(v => v.price && v.price >= MIN_PLAUSIBLE);
    const m = { model: key, autoPath: path, page: page.status, currentVersions: page.versions.length, pricedVersions: priced.length, trims: [] };
    const byId = new Map(priced.map(v => [v.id, v]));
    const byToken = new Map();
    for (const v of priced) { const t = norm(trimToken(v.name)); (byToken.get(t) || byToken.set(t, []).get(t)).push(v); }

    for (const t of trims) {
      let v = null, how = null, note = '';
      if (t.auto_co_il_id && byId.has(String(t.auto_co_il_id))) { v = byId.get(String(t.auto_co_il_id)); how = 'version-id'; }
      else if (!t.auto_co_il_id) {
        const cands = byToken.get(norm(t.name)) || [];
        const distinct = [...new Set(cands.map(c => c.price))];
        if (cands.length && distinct.length === 1) { v = cands[0]; how = 'trim-name'; }
        else if (cands.length) note = `ambiguous: ${cands.map(c => `${c.name} ₪${c.price}`).join(' | ')}`;
      }
      m.trims.push({ id: t.id, name: t.name, year: t.model_year, oldPrice: t.price_ils, newPrice: v ? v.price : null, match: how, version: v ? `${v.id} ${v.name}` : null, note });
      if (v) updates.push(`UPDATE car_trims SET price_ils = ${q(v.price)}, price_source = 'auto.co.il', price_checked_at = ${q(TODAY)} WHERE id = ${q(t.id)};`);
    }
    report.push(m);
    process.stdout.write(`\r${n}/${byModel.size} ${key.padEnd(40)} versions ${page.versions.length} priced ${priced.length}   `);
    await sleep(700); // be polite to auto.co.il
  }
  console.log();

  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 1));
  writeFileSync(resolve(OUT, 'updates.sql'), updates.join('\n') + '\n');
  const all = report.flatMap(r => r.trims);
  const sum = {
    models: report.length,
    modelsWithPrices: report.filter(r => r.pricedVersions).length,
    trims: all.length,
    updated: all.filter(t => t.newPrice).length,
    byVersionId: all.filter(t => t.match === 'version-id').length,
    byTrimName: all.filter(t => t.match === 'trim-name').length,
    ambiguous: all.filter(t => t.note.startsWith('ambiguous')).length,
    estimatesLeft: all.filter(t => !t.newPrice && t.oldPrice).length,
  };
  console.log(sum);
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(sum, null, 1));

  if (APPLY && updates.length) {
    console.log(`Applying ${updates.length} updates to remote D1…`);
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'car-issues-db', '--remote', '--file', resolve(OUT, 'updates.sql')], { cwd: ROOT, stdio: 'inherit' });
  } else if (!APPLY) console.log('Dry run: nothing written. Re-run with --apply to update D1.');
}

main().catch(e => { console.error(e); process.exit(1); });

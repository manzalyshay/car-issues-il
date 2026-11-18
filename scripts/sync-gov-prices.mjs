/**
 * scripts/sync-gov-prices.mjs
 *
 * Sets car_trims.price_ils from the Ministry of Transport's official importer price list
 * (data.gov.il "יבואנים ומחירוני רכב חדש", updated daily from what importers report),
 * and records price_source = 'gov-importer' + price_checked_at.
 *
 * The price list has no trim names, only model codes, so it is joined to the Ministry's
 * WLTP model list (which has ramat_gimur = trim name) on (tozeret_cd, degem_cd,
 * shnat_yitzur). Our hand-entered trims were built from that same WLTP list
 * (scripts/seed-trims-israel-gov.mjs), so trim names match exactly.
 *
 * Per model it uses the newest model year that has prices. One trim can have several
 * model codes (engine/body variants) with different prices; the trim gets the lowest
 * ("from" price) and the report lists the range.
 *
 * The list has obvious entry errors (Land Cruiser "1958" at ₪40,000), so a trim price below
 * 0.8x or above 1.6x the model's median trim price is rejected as an outlier.
 *
 * Only UPDATEs rows without an auto.co.il link (auto_co_il_id empty); never inserts.
 * Rows already priced by scripts/sync-autocoil-prices.mjs (price_source = 'auto.co.il') are
 * skipped: auto.co.il's price is for the exact current version, so it wins.
 *
 * Usage:
 *   node scripts/sync-gov-prices.mjs            # dry run: report + SQL in .price-sync/
 *   node scripts/sync-gov-prices.mjs --apply    # also runs the SQL on remote D1
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODEL_MAP, recordMatchesModel } from './lib/gov-model-map.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, '.price-sync');
const APPLY = process.argv.includes('--apply');
const TODAY = new Date().toISOString().slice(0, 10);
const API = 'https://data.gov.il/api/3/action/datastore_search';
const PRICES = '39f455bf-6db0-4926-859d-017f34eacbcb'; // יבואנים ומחירוני רכב חדש
const WLTP = '142afde2-6228-49f9-8a29-9b6c3a0cbe40';   // תוצרים ודגמים של כלי רכב WLTP
const YEARS = (() => { const y = new Date().getFullYear(); return [y - 1, y, y + 1]; })();
const MIN_PLAUSIBLE = 20000;

async function fetchAll(resource, year) {
  const out = [];
  for (let offset = 0; ; offset += 5000) {
    const url = `${API}?resource_id=${resource}&limit=5000&offset=${offset}&filters=${encodeURIComponent(JSON.stringify({ shnat_yitzur: year }))}`;
    let d;
    for (let attempt = 0; ; attempt++) {
      try { d = (await (await fetch(url)).json()).result; break; }
      catch (e) { if (attempt >= 2) throw e; await new Promise(r => setTimeout(r, 2000)); }
    }
    out.push(...d.records);
    if (offset + 5000 >= d.total) return out;
  }
}

function d1(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'car-issues-db', '--remote', '--json', '--command', sql],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
}
const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const key = r => `${r.tozeret_cd}|${r.degem_cd}|${r.shnat_yitzur}`;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const prices = new Map(), wltp = [];
  for (const y of YEARS) {
    const [p, w] = await Promise.all([fetchAll(PRICES, y), fetchAll(WLTP, y)]);
    for (const r of p) if (r.mehir >= MIN_PLAUSIBLE) (prices.get(key(r)) || prices.set(key(r), []).get(key(r))).push(r.mehir);
    wltp.push(...w);
    console.log(`${y}: ${p.length} prices, ${w.length} WLTP models`);
  }

  const rows = d1(`SELECT id, make_slug, model_slug, name, price_ils, auto_co_il_id FROM car_trims WHERE is_israel = 1 AND (auto_co_il_id IS NULL OR auto_co_il_id = '') AND COALESCE(price_source, '') <> 'auto.co.il'`);
  const ours = new Map();
  for (const r of rows) { const k = `${r.make_slug}/${r.model_slug}`; (ours.get(k) || ours.set(k, []).get(k)).push(r); }

  const updates = [], report = [];
  for (const entry of MODEL_MAP) {
    const k = `${entry.make}/${entry.model}`;
    // WLTP rows of this model that have a price, grouped by year
    const priced = wltp.filter(r => (r.ramat_gimur || '').trim() && recordMatchesModel(r, entry) && prices.has(key(r)));
    const year = priced.length ? Math.max(...priced.map(r => r.shnat_yitzur)) : null;
    const byTrim = new Map();
    for (const r of priced.filter(r => r.shnat_yitzur === year)) {
      const t = r.ramat_gimur.trim().toUpperCase();
      (byTrim.get(t) || byTrim.set(t, []).get(t)).push(...prices.get(key(r)));
    }
    const mins = [...byTrim.values()].map(ps => Math.min(...ps)).sort((a, b) => a - b);
    const median = mins.length ? mins[Math.floor(mins.length / 2)] : null;
    const m = { model: k, year, median, govTrims: Object.fromEntries([...byTrim].map(([t, ps]) => [t, [Math.min(...ps), Math.max(...ps)]])), trims: [] };
    for (const t of ours.get(k) || []) {
      const ps = byTrim.get(t.name.trim().toUpperCase());
      let price = ps ? Math.min(...ps) : null, note = '';
      if (price && (price < 0.8 * median || price > 1.6 * median)) { note = `outlier: ₪${price} vs model median ₪${median}`; price = null; }
      m.trims.push({ id: t.id, name: t.name, oldPrice: t.price_ils, newPrice: price, range: price && Math.max(...ps) !== price ? [price, Math.max(...ps)] : null, note });
      if (price) updates.push(`UPDATE car_trims SET price_ils = ${price}, price_source = 'gov-importer', price_checked_at = ${q(TODAY)} WHERE id = ${q(t.id)};`);
    }
    report.push(m);
  }

  writeFileSync(resolve(OUT, 'gov-report.json'), JSON.stringify(report, null, 1));
  writeFileSync(resolve(OUT, 'gov-updates.sql'), updates.join('\n') + '\n');
  const all = report.flatMap(r => r.trims);
  const sum = {
    mappedModels: report.length, modelsWithPrices: report.filter(r => r.year).length,
    ourTrims: all.length, updated: all.filter(t => t.newPrice).length,
    withRange: all.filter(t => t.range).length, outliers: all.filter(t => t.note).length, estimatesLeft: all.filter(t => !t.newPrice && t.oldPrice).length,
    unmappedModels: [...ours.keys()].filter(k => !MODEL_MAP.some(e => `${e.make}/${e.model}` === k)).length,
  };
  console.log(sum);
  writeFileSync(resolve(OUT, 'gov-summary.json'), JSON.stringify(sum, null, 1));
  if (APPLY && updates.length) {
    console.log(`Applying ${updates.length} updates to remote D1…`);
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'car-issues-db', '--remote', '--file', resolve(OUT, 'gov-updates.sql')], { cwd: ROOT, stdio: 'inherit' });
  } else if (!APPLY) console.log('Dry run: nothing written. Re-run with --apply to update D1.');
}

main().catch(e => { console.error(e); process.exit(1); });

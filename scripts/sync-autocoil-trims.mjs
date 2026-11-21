/**
 * scripts/sync-autocoil-trims.mjs
 *
 * Rebuilds a model's Israeli trims (car_trims, is_israel = 1) from auto.co.il, one row per
 * version per model year, the way auto.co.il and carzone.co.il present them: every year's
 * versions with their real powertrain (hybrid / plug-in / electric ...), specs and equipment.
 *
 * Crawl per model: the model page (current year's versions, with list prices in
 * data-price) -> each year page /cars/<make>/<model>/<year>/ -> each version page, whose
 * spec table gives engine, hp, torque, 0-100, top speed, gearbox, consumption, weight,
 * boot, seats and the equipment list.
 *
 * Rows written (same shape as the existing auto.co.il rows):
 *   id = <make>-<model>-<year>-<versionId> (an existing row linked to the version keeps its id),
 *   name = auto.co.il's version name, auto_co_il_id = version id, model_year,
 *   engine_type / drive as keys, transmission as "DCT 6 הילוכים",
 *   fuel_consumption in L/100km (electric: kWh/100km), torque in Nm,
 *   features = the version's Hebrew equipment table as an object (ticked items = "כן"),
 *   which src/lib/autoCoilFeatures.ts maps to feature keys when read.
 * Price: only the current year's versions with a list price on the model page get
 * price_ils + price_source = 'auto.co.il' (older years have only used-car pricing).
 *
 * --replace-manual also deletes the model's hand-entered rows (no auto_co_il_id), which
 * otherwise sit next to the dated rows as an undated "current" list. Only done for models
 * where the crawl found the current year's versions.
 *
 * Every run writes .trim-sync/rollback.sql: for each changed model, all its Israeli rows as
 * they were before (DELETE + INSERT), so a bad run can be undone with
 *   npx wrangler d1 execute car-issues-db --remote --file .trim-sync/rollback.sql
 *
 * Usage:
 *   node scripts/sync-autocoil-trims.mjs --model kia/niro                 # dry run
 *   node scripts/sync-autocoil-trims.mjs --model kia/niro --replace-manual --apply
 *   node scripts/sync-autocoil-trims.mjs --all                            # dry run, every model
 * Only the model years listed in car_models.years are crawled. --concurrency N (default 3).
 * Needs CLOUDFLARE_API_TOKEN for wrangler (remote D1).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTOCOIL_SLUGS } from './lib/autocoil-slugs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, '.trim-sync');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REPLACE_MANUAL = args.includes('--replace-manual');
const ALL = args.includes('--all');
const ONLY = args.filter((a, i) => args[i - 1] === '--model');
const TODAY = new Date().toISOString().slice(0, 10);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const MIN_PLAUSIBLE = 20000;
const DELAY_MS = 600; // be polite to auto.co.il: per worker, between requests
const CONCURRENCY = Number(args[args.indexOf('--concurrency') + 1]) || 3; // models crawled at once

// Our slug -> auto.co.il path, where they differ
const SLUG_OVERRIDES = AUTOCOIL_SLUGS;

function d1(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'car-issues-db', '--remote', '--json', '--command', sql],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results;
}

const decode = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const text = h => decode(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const normName = s => decode(s).replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9' } });
      if (res.status === 404) return null;
      if (res.ok) return await res.text();
    } catch { /* retry */ }
    await sleep(2000 * (attempt + 1));
  }
  return null;
}

/** <select id="sel-car-version-btn"> options: [{id, name}] */
function versionOptions(html) {
  const sel = html.match(/<select[^>]*id="sel-car-version-btn"[^>]*>([\s\S]*?)<\/select>/);
  if (!sel) return [];
  return [...sel[1].matchAll(/<option value="(\d+)"[^>]*>([^<]*)/g)].map(([, id, name]) => ({ id, name: normName(name) }));
}

/** Spec table rows of a version page: Map(title -> {mark: 'V'|'X'|'', value}) */
function specTable(html) {
  const out = new Map();
  for (const li of html.match(/<li class="vehicle-table__item[\s\S]*?<\/li>/g) || []) {
    const t = li.match(/table-item__title">([\s\S]*?)<\/div>/);
    if (!t) continue;
    const title = text(t[1]);
    const v = li.match(/table-item__value">([\s\S]*)<\/div>\s*<\/div>\s*<\/li>/);
    const raw = v ? v[1] : '';
    const mark = /green_check/.test(raw) ? 'V' : /red_cross/.test(raw) ? 'X' : '';
    if (!out.has(title)) out.set(title, { mark, value: text(raw) });
  }
  return out;
}

const num = s => { const m = String(s ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };

function parseVersion(html) {
  const t = specTable(html);
  if (!t.size) return null;
  // Spec titles carry their unit: "הספק מירבי (כ"ס)", "מומנט מירבי (קג"מ)"
  const find = re => { for (const [k, v] of t) if (re.test(k)) return { title: k, ...v }; return null; };
  const val = re => find(re)?.value || null;

  const engineRaw = val(/^סוג מנוע/) || '';
  const engine = /פלאג|plug/i.test(engineRaw) ? 'phev'
    : /חשמלי/.test(engineRaw) && !/בנזין|דיזל|היברידי/.test(engineRaw) ? 'electric'
    : /היברידי|הייבריד/.test(engineRaw) ? 'hybrid'
    : /דיזל/.test(engineRaw) ? 'diesel'
    : engineRaw ? 'petrol' : null;
  const driveRaw = val(/^הנעה$/) || '';
  const drive = /קדמית/.test(driveRaw) ? 'fwd' : /אחורית/.test(driveRaw) ? 'rwd' : /כפולה|4X4|4x4|AWD|קבועה/i.test(driveRaw) ? 'awd' : null;
  const gearbox = val(/^תיבת הילוכים/) || '';
  const gears = num(val(/^מספר הילוכים/));
  const gearKind = /כפולת מצמד|רובוטית/.test(gearbox) ? 'DCT' : /רציפה|CVT/i.test(gearbox) ? 'CVT'
    : /ידנית/.test(gearbox) ? 'ידני' : gearbox ? 'אוטומטי' : null;
  const transmission = gearKind ? (gears && gears > 1 ? `${gearKind} ${gears} הילוכים` : gearKind) : null;

  const torque = find(/^מומנט מירבי/);
  let torqueNm = num(torque?.value);
  if (torqueNm != null && /קג"מ/.test(torque.title)) torqueNm = Math.round(torqueNm * 9.807);

  // Fuel: km/L -> L/100km. Electric: Wh/km -> kWh/100km (what the site stores for EVs).
  const toL100 = kmpl => kmpl && kmpl > 0 ? Math.round((100 / kmpl) * 10) / 10 : null;
  let fuel = null, fuelReal = null;
  if (engine === 'electric') {
    const whkm = num(val(/^צריכת חשמל/));
    fuel = whkm ? Math.round(whkm) / 10 : null;
  } else {
    fuel = toL100(num(val(/^צריכת דלק - ממוצעת|^צריכת דלק ממוצעת/)));
    fuelReal = toL100(num(val(/^צריכת דלק בפועל/)));
  }

  // Equipment: everything from the safety section on, minus pure spec rows.
  const SPEC = /^(מבחן ריסוק|בלמים|מספר כריות|מתלה|בלם |סוג תגבור|חלונות חשמל|חישוקים קלים|נגן DVD|מחשב דרך|מסך מולטימדיה|האם חיבור תלת)/;
  const equipment = {};
  let inEquip = false;
  for (const [k, v] of t) {
    if (/^מבחן ריסוק אירופאי|^בלמים$/.test(k)) inEquip = true;
    if (!inEquip || SPEC.test(k)) continue;
    if (v.mark === 'X') continue;
    if (v.value) equipment[k] = v.value;
    else if (v.mark === 'V') equipment[k] = 'כן';
  }
  // Rows the existing auto.co.il data also keeps, for summaries/prompts
  for (const k of ['קבוצת רישוי', 'מרכב']) { const v = val(new RegExp(`^${k}`)); if (v) equipment[k] = v; }
  if (engineRaw) equipment['סוג מנוע'] = engineRaw;
  if (driveRaw) equipment['הנעה'] = driveRaw;
  if (gearbox) equipment['תיבת הילוכים'] = gearbox;
  if (gears) equipment['מספר הילוכים'] = String(gears);
  const range = val(/^טווח נסיעה חשמלי/);
  if (range) equipment['טווח נסיעה חשמלי WLTP (ק"מ)'] = range;
  const battery = val(/^קיבולת סוללה/);
  if (battery && engine !== 'hybrid' && engine !== 'petrol') equipment['קיבולת סוללה (קוט"ש)'] = battery;

  const priceM = html.match(/מחיר-\s*₪\s*<\/[^>]+>\s*<[^>]+>\s*([\d,]+)/) || html.match(/מחיר-₪\s*([\d,]+)/);
  return {
    engine_type: engine,
    engine_cc: engine === 'electric' ? null : num(val(/^נפח מנוע/)),
    engine_hp: num(val(/^הספק מירבי/)),
    transmission,
    drive,
    seat_count: num(val(/^מקומות ישיבה/)),
    acceleration_0_100: (a => a != null && a >= 2 && a <= 25 ? a : null)(num(val(/^0 ל-100/))), // drop typos like 40.3
    top_speed_kmh: num(val(/^מהירות מירבית/)),
    torque_nm: torqueNm,
    fuel_consumption: fuel,
    fuel_consumption_real: fuelReal,
    cargo_liters: num(val(/^נפח תא מטען(?! קיפול)/)),
    curb_weight_kg: num(val(/^משקל/)),
    monthly_price: num(val(/^החזר חודשי/)),
    page_price: priceM ? num(priceM[1]) : null,
    features: equipment,
  };
}

/** All versions of a model on auto.co.il: [{id, name, year, url, price}] */
async function crawlModel(path, allowedYears = null) {
  const wanted = y => !allowedYears || !allowedYears.size || allowedYears.has(y);
  const base = `https://www.auto.co.il/cars/${path}/`;
  const home = await get(base);
  if (!home) return { status: 'no-page', versions: [] };
  const current = versionOptions(home);
  const prices = new Map([...home.matchAll(/<option value="(\d+)"[^>]*?data-price="(\d*)"/g)].map(m => [m[1], Number(m[2]) || null]));
  const yearRe = new RegExp(`/cars/${esc(path)}/(\\d{4})/(?=["'])`, 'g');
  const linkRe = new RegExp(`/cars/${esc(path)}/(\\d{4})/([a-z0-9-]+)/(?=["'])`, 'g');
  const years = [...new Set([...home.matchAll(yearRe)].map(m => Number(m[1])))].sort();

  const links = new Map(); // url -> {year, slug, options}
  const addLinks = (html, options) => {
    for (const [, y, slug] of html.matchAll(linkRe)) {
      const url = `https://www.auto.co.il/cars/${path}/${y}/${slug}/`;
      if (!links.has(url)) links.set(url, { year: Number(y), slug, options });
    }
  };
  addLinks(home, current);
  // Only the model years the site covers (car_models.years): auto.co.il can go back 15 years
  for (const y of years.filter(wanted)) {
    await sleep(DELAY_MS);
    const html = await get(`${base}${y}/`);
    if (html) addLinks(html, versionOptions(html));
  }

  const versions = [];
  const seen = new Set();
  for (const [url, { year, slug, options }] of links) {
    if (!wanted(year) && options !== current) continue;
    await sleep(DELAY_MS);
    const html = await get(url);
    if (!html) continue;
    const spec = parseVersion(html);
    if (!spec) continue;
    // Version id: numeric slug (older years), else match the page's version name to the
    // model page's dropdown (current year pages use slugs like "fl-ex").
    const titleM = html.match(/<title>([^<]*)<\/title>/);
    const pageName = titleM ? normName(titleM[1]).replace(/\s+יד שניה.*$/, '').replace(/\s*\|.*$/, '') : '';
    let id = /^\d+$/.test(slug) ? slug : null;
    let name = id ? options.find(o => o.id === id)?.name : null;
    if (!id) {
      // Longest match: "(מתיחת פנים) HEV, ..., EX" also ends with the plain "HEV, ..., EX"
      const opt = options.filter(o => pageName.endsWith(o.name)).sort((a, b) => b.name.length - a.name.length)[0];
      if (opt) { id = opt.id; name = opt.name; }
    }
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (!name) name = pageName.replace(new RegExp(`^.*?\\b${year}\\s+`), '').trim();
    const listed = current.some(o => o.id === id) ? prices.get(id) : null;
    versions.push({ id, name, year, url, price: listed && listed >= MIN_PLAUSIBLE ? listed : null, ...spec });
  }
  return { status: 200, versions, currentYear: Math.max(0, ...versions.filter(v => current.some(o => o.id === v.id)).map(v => v.year)) || null };
}

const COLS = ['id', 'make_slug', 'model_slug', 'name', 'model_year', 'engine_type', 'engine_cc', 'engine_hp', 'transmission', 'drive',
  'seats', 'seat_count', 'screen_size', 'features', 'price_ils', 'is_israel', 'sort_order', 'acceleration_0_100', 'top_speed_kmh',
  'torque_nm', 'fuel_consumption', 'cargo_liters', 'curb_weight_kg', 'auto_co_il_id', 'fuel_consumption_real', 'monthly_price',
  'drive_type', 'weight_kg', 'price_source', 'price_checked_at'];
const insertSql = row => `INSERT INTO car_trims (${COLS.join(', ')}) VALUES (${COLS.map(c => q(row[c])).join(', ')});`;

async function main() {
  if (!ALL && !ONLY.length) { console.error('Pass --model <make/model> (repeatable) or --all'); process.exit(1); }
  mkdirSync(OUT, { recursive: true });
  const where = ALL ? '' : ` AND (${ONLY.map(k => `(make_slug = ${q(k.split('/')[0])} AND model_slug = ${q(k.split('/')[1])})`).join(' OR ')})`;
  const existing = d1(`SELECT * FROM car_trims WHERE is_israel = 1${where}`);
  const modelRows = d1('SELECT make_slug, slug, years FROM car_models ORDER BY make_slug, slug');
  const yearsOf = new Map(modelRows.map(m => {
    let ys = []; try { ys = JSON.parse(m.years || '[]'); } catch { /* none */ }
    return [`${m.make_slug}/${m.slug}`, new Set(ys.map(Number))];
  }));
  const models = ALL ? modelRows.map(m => `${m.make_slug}/${m.slug}`) : ONLY;
  const byModel = new Map(models.map(k => [k, []]));
  for (const r of existing) byModel.get(`${r.make_slug}/${r.model_slug}`)?.push(r);

  const results = new Map(); // key -> {m, modelSql, rollbackSql}, assembled in model order at the end
  let n = 0;
  const processModel = async (key, rows) => {
    const [make, model] = key.split('/');
    const path = SLUG_OVERRIDES[key] || key;
    const crawl = await crawlModel(path, yearsOf.get(key)).catch(e => ({ status: `error: ${e.message}`, versions: [] }));
    n++;
    const m = { model: key, autoPath: path, page: crawl.status, versions: crawl.versions.length, currentYear: crawl.currentYear ?? null,
      years: {}, inserted: 0, updated: 0, deletedManual: 0, keptManual: 0 };
    process.stdout.write(`\r${n}/${byModel.size} ${key.padEnd(36)} versions ${crawl.versions.length}      `);
    if (!crawl.versions.length) { m.keptManual = rows.filter(r => !r.auto_co_il_id).length; results.set(key, { m, modelSql: [], rollbackSql: [] }); return; }

    const linked = new Map(rows.filter(r => r.auto_co_il_id).map(r => [String(r.auto_co_il_id), r]));
    const modelSql = [];
    // sort_order per year: priced versions by price, then the rest in auto.co.il's order
    const byYear = new Map();
    for (const v of crawl.versions) (byYear.get(v.year) || byYear.set(v.year, []).get(v.year)).push(v);
    for (const [year, vs] of byYear) {
      vs.sort((a, b) => (a.price == null) - (b.price == null) || (a.price ?? 0) - (b.price ?? 0));
      m.years[year] = vs.map(v => `${v.name}${v.price ? ` ₪${v.price}` : ''} [${v.engine_type ?? '?'} ${v.engine_hp ?? '?'}hp]`);
      vs.forEach((v, i) => {
        const old = linked.get(v.id);
        const row = {
          id: old?.id ?? `${make}-${model}-${year}-${v.id}`, make_slug: make, model_slug: model, name: v.name, model_year: year,
          engine_type: v.engine_type, engine_cc: v.engine_cc, engine_hp: v.engine_hp, transmission: v.transmission, drive: v.drive,
          seats: null, seat_count: v.seat_count, screen_size: null, features: JSON.stringify(v.features),
          price_ils: v.price ?? null, is_israel: 1, sort_order: i, acceleration_0_100: v.acceleration_0_100,
          top_speed_kmh: v.top_speed_kmh, torque_nm: v.torque_nm, fuel_consumption: v.fuel_consumption,
          cargo_liters: v.cargo_liters, curb_weight_kg: v.curb_weight_kg, auto_co_il_id: v.id,
          fuel_consumption_real: v.fuel_consumption_real, monthly_price: v.monthly_price, drive_type: null, weight_kg: null,
          price_source: v.price ? 'auto.co.il' : null, price_checked_at: v.price ? TODAY : null,
        };
        if (old) { modelSql.push(`DELETE FROM car_trims WHERE id = ${q(old.id)};`); m.updated++; } else m.inserted++;
        modelSql.push(insertSql(row));
      });
    }
    const manual = rows.filter(r => !r.auto_co_il_id);
    if (REPLACE_MANUAL && crawl.currentYear && manual.length) {
      modelSql.push(`DELETE FROM car_trims WHERE make_slug = ${q(make)} AND model_slug = ${q(model)} AND is_israel = 1 AND (auto_co_il_id IS NULL OR auto_co_il_id = '');`);
      m.deletedManual = manual.length;
      m.manualDeleted = manual.map(r => `${r.name}${r.price_source ? ` ₪${r.price_ils} (${r.price_source})` : ''}`);
    } else m.keptManual = manual.length;
    // Linked rows auto.co.il no longer lists stay as they are.

    results.set(key, { m, modelSql: [`-- ${key}`, ...modelSql], rollbackSql: [`-- ${key}`,
      `DELETE FROM car_trims WHERE make_slug = ${q(make)} AND model_slug = ${q(model)} AND is_israel = 1;`, ...rows.map(r => insertSql(r))] });
    // Partial report as it goes, so a long --all run can be checked (and isn't lost if stopped)
    if (results.size % 10 === 0) writeFileSync(resolve(OUT, 'report.partial.json'), JSON.stringify([...results.values()].map(r => r.m), null, 1));
  };
  const queue = [...byModel];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) { const [key, rows] = queue.shift(); await processModel(key, rows); }
  }));
  console.log();
  const ordered = [...byModel.keys()].map(k => results.get(k)).filter(Boolean);
  const report = ordered.map(r => r.m);
  const sql = ordered.flatMap(r => r.modelSql);
  const rollback = ordered.flatMap(r => r.rollbackSql);

  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 1));
  writeFileSync(resolve(OUT, 'sync.sql'), sql.join('\n') + '\n');
  writeFileSync(resolve(OUT, 'rollback.sql'), rollback.join('\n') + '\n');
  const sum = {
    models: report.length,
    modelsFound: report.filter(r => r.versions).length,
    versions: report.reduce((s, r) => s + r.versions, 0),
    inserted: report.reduce((s, r) => s + r.inserted, 0),
    updated: report.reduce((s, r) => s + r.updated, 0),
    deletedManual: report.reduce((s, r) => s + r.deletedManual, 0),
    keptManual: report.reduce((s, r) => s + r.keptManual, 0),
    notFound: report.filter(r => !r.versions).map(r => `${r.model} (${r.page})`),
  };
  console.log(JSON.stringify(sum, null, 1));
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(sum, null, 1));
  if (APPLY && sql.length) {
    console.log('Applying to remote D1… (undo: .trim-sync/rollback.sql)');
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'car-issues-db', '--remote', '--yes', '--file', resolve(OUT, 'sync.sql')], { cwd: ROOT, stdio: 'inherit' });
  } else if (!APPLY) console.log('Dry run: nothing written. Files in .trim-sync/. Re-run with --apply to update D1.');
}

main().catch(e => { console.error(e); process.exit(1); });

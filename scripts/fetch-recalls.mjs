/**
 * Fetches and caches NHTSA recalls for all models that have 0 cached recalls.
 * Calls the production API which handles NHTSA fetch + translation + D1 insert.
 *
 * Run: node scripts/fetch-recalls.mjs [--dry-run] [--delay 4000]
 *   --dry-run   print what would be fetched without calling the API
 *   --delay N   ms between requests (default: 4000)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELAY = parseInt(args[args.indexOf('--delay') + 1] ?? '4000') || 4000;
const BASE_URL = 'https://carissues.net';

function d1(sql) {
  const out = execSync(
    `npx wrangler d1 execute car-issues-db --config wrangler.toml --remote --command ${JSON.stringify(sql)} 2>/dev/null`,
    { encoding: 'utf8', cwd: '/workspace/car-issues-il' }
  );
  const match = out.match(/"results"\s*:\s*(\[[\s\S]*?\])\s*,\s*"success"/);
  if (!match) return [];
  try { return JSON.parse(match[1]); } catch { return []; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Load audit report ────────────────────────────────────────────────────────
let auditReport;
try {
  auditReport = JSON.parse(readFileSync('/workspace/car-issues-il/scripts/audit-report.json', 'utf8'));
} catch {
  console.error('Run audit-pages.mjs --json first to generate audit-report.json');
  process.exit(1);
}

const missing = auditReport.filter(r => r.recalls === 0);
console.log(`Found ${missing.length} models with no cached recalls.\n`);

// ── Fetch make English names + model years from D1 ───────────────────────────
console.log('Fetching make names and model years from D1...');
const makeRows = d1('SELECT slug, name_en FROM car_makes');
const makeNameMap = Object.fromEntries(makeRows.map(r => [r.slug, r.name_en]));

const modelRows = d1('SELECT make_slug, slug as model_slug, years, name_en FROM car_models');
const modelMap = {};
for (const r of modelRows) {
  modelMap[`${r.make_slug}/${r.model_slug}`] = {
    years: typeof r.years === 'string' ? JSON.parse(r.years) : (r.years ?? []),
    nameEn: r.name_en,
  };
}

// ── Build work list ──────────────────────────────────────────────────────────
const workList = missing.map(r => {
  const key = `${r.make}/${r.model}`;
  const makeName = makeNameMap[r.make] ?? r.make;
  const modelData = modelMap[key];
  const modelName = modelData?.nameEn ?? r.nameEn;
  const years = modelData?.years ?? [];
  return { make: r.make, model: r.model, makeName, modelName, years };
}).filter(r => r.years.length > 0);

console.log(`\nWork list: ${workList.length} models\n`);
if (DRY_RUN) {
  console.log('DRY RUN — would fetch:');
  workList.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.makeName} ${r.modelName} — years: ${r.years.join(',')}`);
  });
  process.exit(0);
}

// ── Fetch recalls for each model ─────────────────────────────────────────────
let ok = 0, failed = 0;

for (let i = 0; i < workList.length; i++) {
  const { make, model, makeName, modelName, years } = workList[i];
  const yearsParam = years.join(',');
  const url = `${BASE_URL}/api/recalls?make=${encodeURIComponent(makeName)}&model=${encodeURIComponent(modelName)}&years=${encodeURIComponent(yearsParam)}`;

  process.stdout.write(`[${i + 1}/${workList.length}] ${makeName} ${modelName} (${years.length} years)... `);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.log(`❌ HTTP ${res.status} ${text.slice(0, 80)}`);
      failed++;
    } else {
      const data = await res.json().catch(() => ({}));
      const count = data.recalls?.length ?? data.count ?? '?';
      console.log(`✅ ${count} recalls`);
      ok++;
    }
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed++;
  }

  if (i < workList.length - 1) await sleep(DELAY);
}

console.log(`\n── Done ──────────────────────────────────────────────────────`);
console.log(`✅ Success: ${ok}  ❌ Failed: ${failed}  Total: ${workList.length}`);
console.log(`\nRe-run audit-pages.mjs --json to see updated scores.`);

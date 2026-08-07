/**
 * Car page quality audit.
 * Queries D1 directly and scores every make/model on:
 *   - 3D model (Sketchfab)
 *   - Images
 *   - Expert reviews (count + translation completeness)
 *   - User reviews
 *   - Recalls cached
 *
 * Run: node scripts/audit-pages.mjs [--top N] [--json]
 *   --top N   show only the N worst models (default: 30)
 *   --json    dump full JSON report to audit-report.json
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const args = process.argv.slice(2);
const TOP_N = parseInt(args[args.indexOf('--top') + 1] ?? '30') || 30;
const DUMP_JSON = args.includes('--json');

function d1(sql) {
  const out = execSync(
    `npx wrangler d1 execute car-issues-db --config wrangler.toml --remote --command ${JSON.stringify(sql)} 2>/dev/null`,
    { encoding: 'utf8', cwd: '/workspace/car-issues-il' }
  );
  const match = out.match(/"results"\s*:\s*(\[[\s\S]*?\])\s*,\s*"success"/);
  if (!match) return [];
  try { return JSON.parse(match[1]); } catch { return []; }
}

console.log('Fetching data from D1...\n');

// ── Fetch all tables in parallel-ish (sequential to avoid rate limits) ──────

console.log('  car_models...');
const models = d1('SELECT cm.make_slug, cm.slug as model_slug, cm.name_he, cm.name_en, cm.years FROM car_models cm');

console.log('  car_3d_models...');
const models3d = d1('SELECT make_slug, model_slug, sketchfab_uid FROM car_3d_models WHERE hidden IS NOT 1');
const set3d = new Set(models3d.map(r => `${r.make_slug}/${r.model_slug}`));

console.log('  car_images...');
const images = d1('SELECT make_slug, model_slug, COUNT(*) as cnt FROM car_images GROUP BY make_slug, model_slug');
const imageMap = Object.fromEntries(images.map(r => [`${r.make_slug}/${r.model_slug}`, r.cnt]));

// Fetch model name→slug map early (needed for recall matching below)
const modelRows = d1('SELECT make_slug, slug as model_slug, years, name_en FROM car_models');

console.log('  expert_reviews...');
const expertRaw = d1('SELECT make_slug, model_slug, year, CASE WHEN summary_en IS NOT NULL AND length(summary_en) > 20 THEN 1 ELSE 0 END as has_summary_en, CASE WHEN local_summary_en IS NOT NULL AND length(local_summary_en) > 20 THEN 1 ELSE 0 END as has_local_en, CASE WHEN global_summary_en IS NOT NULL AND length(global_summary_en) > 20 THEN 1 ELSE 0 END as has_global_en, CASE WHEN pros_en IS NOT NULL AND length(pros_en) > 5 THEN 1 ELSE 0 END as has_pros_en, CASE WHEN cons_en IS NOT NULL AND length(cons_en) > 5 THEN 1 ELSE 0 END as has_cons_en, CASE WHEN summary_he IS NOT NULL AND length(summary_he) > 20 THEN 1 ELSE 0 END as has_summary_he FROM expert_reviews');

const expertMap = {};
for (const r of expertRaw) {
  const key = `${r.make_slug}/${r.model_slug}`;
  if (!expertMap[key]) expertMap[key] = { total: 0, summaryEn: 0, localEn: 0, globalEn: 0, prosEn: 0, consEn: 0, summaryHe: 0, years: [] };
  expertMap[key].total++;
  expertMap[key].summaryEn  += r.has_summary_en;
  expertMap[key].localEn    += r.has_local_en;
  expertMap[key].globalEn   += r.has_global_en;
  expertMap[key].prosEn     += r.has_pros_en;
  expertMap[key].consEn     += r.has_cons_en;
  expertMap[key].summaryHe  += r.has_summary_he;
  if (r.year) expertMap[key].years.push(r.year);
}

console.log('  reviews (user)...');
const userReviews = d1('SELECT make_slug, model_slug, COUNT(*) as cnt FROM reviews GROUP BY make_slug, model_slug');
const userMap = Object.fromEntries(userReviews.map(r => [`${r.make_slug}/${r.model_slug}`, r.cnt]));

console.log('  recalls_cache...');
const recalls = d1('SELECT make, model, COUNT(*) as cnt FROM recalls_cache GROUP BY make, model');
// recalls_cache uses lowercased English names (e.g. "model 3"), not slugs ("model-3")
// Build a map keyed by make_slug/model_slug by joining through car_models.name_en
const recallsByName = {};
for (const r of recalls) recallsByName[`${r.make}/${r.model}`] = r.cnt;

// Build name→slug map for models
const modelNameMap = {};
for (const r of modelRows) {
  const nameKey = `${r.make_slug}/${r.name_en.toLowerCase()}`;
  modelNameMap[nameKey] = `${r.make_slug}/${r.model_slug}`;
}

// Build recallMap keyed by make_slug/model_slug
const recallMap = {};
for (const [nameKey, cnt] of Object.entries(recallsByName)) {
  const slugKey = modelNameMap[nameKey];
  if (slugKey) recallMap[slugKey] = (recallMap[slugKey] ?? 0) + cnt;
}

console.log('\nScoring models...\n');

// ── Score each model ─────────────────────────────────────────────────────────
// Points lost (negative) = issues. Score 0 = perfect.

const WEIGHTS = {
  no3d:             -4,
  noImages:         -3,
  fewImages:        -1,  // < 3 images
  noExpertReview:   -5,
  expertPartial:    -2,  // has expert reviews but missing EN translations
  expertMissingPros:-1,
  expertMissingCons:-1,
  noUserReviews:    -1,
  noRecalls:        -1,
};

const report = [];

for (const m of models) {
  const key = `${m.make_slug}/${m.model_slug}`;
  const expert = expertMap[key];
  const imgCount = imageMap[key] ?? 0;
  const userCount = userMap[key] ?? 0;
  const recallCount = recallMap[key] ?? 0;
  const has3d = set3d.has(key);

  let score = 0;
  const issues = [];
  const fixes = [];

  // 3D model
  if (!has3d) {
    score += WEIGHTS.no3d;
    issues.push('No 3D model');
    fixes.push('Add Sketchfab model (search sketchfab.com for ' + m.name_en + ')');
  }

  // Images
  if (imgCount === 0) {
    score += WEIGHTS.noImages;
    issues.push('No images');
    fixes.push('Add car images to car_images table');
  } else if (imgCount < 3) {
    score += WEIGHTS.fewImages;
    issues.push(`Only ${imgCount} image${imgCount > 1 ? 's' : ''}`);
    fixes.push('Add more images (aim for 3+)');
  }

  // Expert reviews
  if (!expert || expert.total === 0) {
    score += WEIGHTS.noExpertReview;
    issues.push('No expert reviews');
    fixes.push('Scrape expert reviews for this model');
  } else {
    const missingEnCount = expert.total - Math.max(expert.summaryEn, expert.localEn, expert.globalEn);
    if (missingEnCount > 0) {
      score += WEIGHTS.expertPartial;
      issues.push(`${missingEnCount}/${expert.total} expert reviews missing EN summary`);
      fixes.push('Re-run AI translation for expert reviews');
    }
    if (expert.prosEn < expert.total) {
      score += WEIGHTS.expertMissingPros;
      issues.push(`${expert.total - expert.prosEn}/${expert.total} expert reviews missing EN pros`);
      fixes.push('Re-translate pros_en for expert reviews');
    }
    if (expert.consEn < expert.total) {
      score += WEIGHTS.expertMissingCons;
      issues.push(`${expert.total - expert.consEn}/${expert.total} expert reviews missing EN cons`);
      fixes.push('Re-translate cons_en for expert reviews');
    }
  }

  // User reviews
  if (userCount === 0) {
    score += WEIGHTS.noUserReviews;
    issues.push('No user reviews');
    fixes.push('Promote this page to attract reviews');
  }

  // Recalls
  if (recallCount === 0) {
    score += WEIGHTS.noRecalls;
    issues.push('No recalls cached');
    fixes.push('Trigger recalls fetch: GET /api/recalls?make=' + encodeURIComponent(m.name_en) + '&model=' + encodeURIComponent(m.name_en));
  }

  report.push({
    make: m.make_slug,
    model: m.model_slug,
    nameEn: m.name_en,
    nameHe: m.name_he,
    score,
    has3d,
    images: imgCount,
    expertReviews: expert?.total ?? 0,
    expertEnComplete: expert ? Math.round((Math.max(expert.summaryEn, expert.localEn, expert.globalEn) / expert.total) * 100) : 0,
    userReviews: userCount,
    recalls: recallCount,
    issues,
    fixes,
  });
}

report.sort((a, b) => a.score - b.score);

// ── Print ranked table ───────────────────────────────────────────────────────

const worst = report.slice(0, TOP_N);
const GRADE = s => s >= 0 ? '✅ A' : s >= -2 ? '🟡 B' : s >= -5 ? '🟠 C' : s >= -8 ? '🔴 D' : '❌ F';

console.log(`${'#'.padEnd(3)} ${'Make/Model'.padEnd(30)} ${'Score'.padEnd(6)} ${'Grade'.padEnd(6)} ${'3D'.padEnd(4)} ${'Imgs'.padEnd(5)} ${'Expert'.padEnd(8)} ${'Users'.padEnd(6)} ${'Recalls'.padEnd(8)} Issues`);
console.log('─'.repeat(130));

worst.forEach((r, i) => {
  const name = `${r.make}/${r.model}`.padEnd(30);
  const score = String(r.score).padEnd(6);
  const grade = GRADE(r.score).padEnd(6);
  const d3 = (r.has3d ? '✓' : '✗').padEnd(4);
  const imgs = String(r.images).padEnd(5);
  const exp = `${r.expertReviews}(${r.expertEnComplete}%)`.padEnd(8);
  const usr = String(r.userReviews).padEnd(6);
  const rec = String(r.recalls).padEnd(8);
  const issueStr = r.issues.join(' | ');
  console.log(`${String(i + 1).padEnd(3)} ${name} ${score} ${grade} ${d3} ${imgs} ${exp} ${usr} ${rec} ${issueStr}`);
});

// ── Summary stats ────────────────────────────────────────────────────────────
const total = report.length;
const graded = { A: 0, B: 0, C: 0, D: 0, F: 0 };
for (const r of report) {
  if (r.score >= 0)  graded.A++;
  else if (r.score >= -2) graded.B++;
  else if (r.score >= -5) graded.C++;
  else if (r.score >= -8) graded.D++;
  else graded.F++;
}

console.log('\n── Summary ─────────────────────────────────────────────────────');
console.log(`Total models: ${total}`);
console.log(`✅ A (score ≥ 0):   ${graded.A} (${pct(graded.A, total)}%)`);
console.log(`🟡 B (score -1–-2): ${graded.B} (${pct(graded.B, total)}%)`);
console.log(`🟠 C (score -3–-5): ${graded.C} (${pct(graded.C, total)}%)`);
console.log(`🔴 D (score -6–-8): ${graded.D} (${pct(graded.D, total)}%)`);
console.log(`❌ F (score < -8):  ${graded.F} (${pct(graded.F, total)}%)`);

console.log('\n── Most common issues ──────────────────────────────────────────');
const issueCounts = {};
for (const r of report) for (const iss of r.issues) {
  const k = iss.replace(/\d+/g, 'N');
  issueCounts[k] = (issueCounts[k] ?? 0) + 1;
}
Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  console.log(`  ${String(v).padStart(4)}x  ${k}`);
});

if (DUMP_JSON) {
  const outFile = '/workspace/car-issues-il/scripts/audit-report.json';
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to scripts/audit-report.json`);
}

function pct(n, t) { return t ? Math.round(n / t * 100) : 0; }

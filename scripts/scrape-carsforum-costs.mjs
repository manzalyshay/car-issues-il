/**
 * Scrapes carsforum.co.il for repair cost mentions per car model.
 * Uses Playwright to bypass WAF. Searches for repair-related topics
 * and extracts ₪ prices + car model context.
 *
 * Usage:
 *   node scripts/scrape-carsforum-costs.mjs
 *   node scripts/scrape-carsforum-costs.mjs --dry-run   (print without inserting)
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

// Repair types to search for + their repair_key mapping
// Note: shorter queries (2-3 words) work better with carsforum search
const REPAIR_SEARCHES = [
  { query: 'ממיר קטליטי', repair_key: 'catalytic_converter', repair_name_he: 'ממיר קטליטי' },
  { query: 'החלפת בלמים', repair_key: 'brake_pads_front', repair_name_he: 'בלמים קדמיים' },
  { query: 'רצועת תזמון', repair_key: 'timing_belt', repair_name_he: 'החלפת רצועת תזמון' },
  { query: 'טיפול שמן', repair_key: 'service_10k', repair_name_he: 'טיפול 10,000 ק"מ' },
  { query: 'גיר אוטומטי תיקון', repair_key: 'gearbox_auto', repair_name_he: 'תיקון גיר אוטומטי' },
  { query: 'החלפת מצבר', repair_key: 'battery', repair_name_he: 'החלפת מצבר' },
];

// Model name → slug mapping for common Israeli cars
const MODEL_MAP = {
  'קורולה': { make_slug: 'toyota', model_slug: 'corolla' },
  'קורולה קרוס': { make_slug: 'toyota', model_slug: 'corolla-cross' },
  'יאריס קרוס': { make_slug: 'toyota', model_slug: 'yaris-cross' },
  'יאריס': { make_slug: 'toyota', model_slug: 'yaris' },
  'rav4': { make_slug: 'toyota', model_slug: 'rav4' },
  'RAV4': { make_slug: 'toyota', model_slug: 'rav4' },
  'קשקאי': { make_slug: 'nissan', model_slug: 'qashqai' },
  'ג\'וק': { make_slug: 'nissan', model_slug: 'juke' },
  'מיקרא': { make_slug: 'nissan', model_slug: 'micra' },
  'טוסון': { make_slug: 'hyundai', model_slug: 'tucson' },
  'i30': { make_slug: 'hyundai', model_slug: 'i30' },
  'i35': { make_slug: 'hyundai', model_slug: 'i35' },
  'קונה': { make_slug: 'hyundai', model_slug: 'kona' },
  'ספורטאג\'': { make_slug: 'kia', model_slug: 'sportage' },
  'ניירו': { make_slug: 'kia', model_slug: 'niro' },
  'פיקנטו': { make_slug: 'kia', model_slug: 'picanto' },
  'פולו': { make_slug: 'volkswagen', model_slug: 'polo' },
  'גולף': { make_slug: 'volkswagen', model_slug: 'golf' },
  'טיגואן': { make_slug: 'volkswagen', model_slug: 'tiguan' },
  'סוויפט': { make_slug: 'suzuki', model_slug: 'swift' },
  'ויטרה': { make_slug: 'suzuki', model_slug: 'vitara' },
  'מאזדה 3': { make_slug: 'mazda', model_slug: 'mazda3' },
  'מאזדה 6': { make_slug: 'mazda', model_slug: 'mazda6' },
  'cx5': { make_slug: 'mazda', model_slug: 'cx5' },
  'CX-5': { make_slug: 'mazda', model_slug: 'cx5' },
  'קודיאק': { make_slug: 'skoda', model_slug: 'kodiaq' },
  'אוקטביה': { make_slug: 'skoda', model_slug: 'octavia' },
  'פורד פוקוס': { make_slug: 'ford', model_slug: 'focus' },
  'פוקוס': { make_slug: 'ford', model_slug: 'focus' },
  'קייגה': { make_slug: 'ford', model_slug: 'kuga' },
  'סיוויק': { make_slug: 'honda', model_slug: 'civic' },
  'סיוויק': { make_slug: 'honda', model_slug: 'civic' },
  'HR-V': { make_slug: 'honda', model_slug: 'hrv' },
  'קורסה': { make_slug: 'opel', model_slug: 'corsa' },
  'אסטרה': { make_slug: 'opel', model_slug: 'astra' },
  'C4': { make_slug: 'citroen', model_slug: 'c4' },
};

// Extract prices (₪ amounts between 100-200,000) from Hebrew text
function extractPrices(text) {
  const prices = [];
  // Match patterns like: ₪1,500 | 1500 ש"ח | 1,500 שח | 1500 שקל
  const patterns = [
    /₪\s*([0-9,]+)/g,
    /([0-9,]+)\s*ש[""']ח/g,
    /([0-9,]+)\s*שח\b/g,
    /([0-9,]+)\s*שקל/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const val = parseInt(match[1].replace(/,/g, ''));
      if (val >= 100 && val <= 200000) prices.push(val);
    }
  }
  return [...new Set(prices)];
}

// Try to identify which car model is mentioned in text
function identifyModel(text) {
  for (const [name, model] of Object.entries(MODEL_MAP)) {
    if (text.includes(name)) return model;
  }
  return null;
}

// Wait for Cloudflare challenge to pass (up to 20s)
async function waitForCloudflare(page) {
  for (let i = 0; i < 20; i++) {
    const title = await page.title();
    if (!title.includes('Just a moment') && !title.includes('Checking your') && !title.includes('רק רגע')) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

async function fetchThread(browser, link, repairKey, repairNameHe) {
  const results = [];
  // Fresh context per thread — this is the pattern that reliably bypasses CF
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
  });
  const p = await ctx.newPage();
  try {
    await p.goto(link, { waitUntil: 'load', timeout: 30000 });
    const passed = await waitForCloudflare(p);
    if (!passed) { console.log(`  CF blocked: ${link.slice(-60)}`); return results; }

    const title = await p.title();
    const posts = await p.$$eval(
      '.cPost_contentWrap, [data-role="commentContent"], .ipsType_normal, .post-body',
      (els) => els.map(el => el.textContent?.trim() ?? '').filter(t => t.length > 20)
    );

    console.log(`  ${posts.length} posts | ${title.slice(0, 60)}`);

    for (const postText of posts) {
      const prices = extractPrices(postText);
      if (prices.length === 0) continue;
      const model = identifyModel(postText);
      for (const price of prices) {
        results.push({
          make_slug: model?.make_slug ?? null,
          model_slug: model?.model_slug ?? null,
          repair_key: repairKey,
          repair_name_he: repairNameHe,
          cost_ils: price,
          workshop_type: null,
          notes: `מקור: carsforum.co.il — ${link.slice(0, 100)}`,
        });
      }
    }
  } catch (err) {
    console.log(`  Error: ${err.message?.slice(0, 80)}`);
  } finally {
    await ctx.close();
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
import { execSync } from 'child_process';
let executablePath;
try {
  executablePath = execSync('find /home/vscode/.cache/ms-playwright -name "chrome" 2>/dev/null | grep -v headless | head -1', { encoding: 'utf8' }).trim() || undefined;
} catch { executablePath = undefined; }
console.log('Launching browser' + (executablePath ? ` (${executablePath})` : '') + '...');
const browser = await chromium.launch({
  headless: true,
  executablePath: executablePath || undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const allResults = [];

for (const { query, repair_key, repair_name_he } of REPAIR_SEARCHES) {
  console.log(`\nSearching: "${query}"`);
  // Fresh context per search so CF state is clean
  const searchCtx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'he-IL',
  });
  const searchPage = await searchCtx.newPage();
  try {
    const searchUrl = `https://carsforum.co.il/search/?q=${encodeURIComponent(query)}`;
    await searchPage.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
    const ok = await waitForCloudflare(searchPage);
    if (!ok) { console.log('  CF blocked search'); await searchCtx.close(); continue; }

    const links = await searchPage.$$eval(
      'a[href*="/topic/"]',
      (anchors) => [...new Set(
        anchors
          .map(a => a.href)
          .filter(h => h && /carsforum\.co\.il\/topic\/\d+/.test(h))
          .map(h => h.split('?')[0].split('#')[0])
      )].slice(0, 4)
    );

    console.log(`  Found ${links.length} carsforum links`);
    await searchCtx.close();

    for (const link of links) {
      const res = await fetchThread(browser, link, repair_key, repair_name_he);
      allResults.push(...res);
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    console.log(`  Search error: ${err.message?.slice(0, 80)}`);
    await searchCtx.close().catch(() => {});
  }
  await new Promise(r => setTimeout(r, 2000));
}

await browser.close();

// Deduplicate by key (same repair+cost+model can appear from duplicate search result links)
const seen = new Set();
const valid = allResults.filter(r => {
  if (r.cost_ils < 100 || r.cost_ils > 150000) return false;
  const key = `${r.repair_key}|${r.cost_ils}|${r.make_slug}|${r.model_slug}|${r.notes}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
console.log(`\n=== Results: ${valid.length} price mentions found ===`);
valid.forEach(r => console.log(`  ${r.repair_name_he} | ₪${r.cost_ils} | ${r.make_slug ?? '?'}/${r.model_slug ?? '?'}`));

if (DRY_RUN) {
  console.log('\nDry run — not inserting to DB.');
  process.exit(0);
}

// Insert model-specific results as user_repair_costs (community data layer)
let inserted = 0;
for (const r of valid) {
  if (!r.make_slug || !r.model_slug) continue; // skip non-model-specific
  const { error } = await db.from('user_repair_costs').insert({
    make_slug: r.make_slug,
    model_slug: r.model_slug,
    repair_key: r.repair_key,
    repair_name_he: r.repair_name_he,
    cost_ils: r.cost_ils,
    workshop_type: r.workshop_type,
    notes: r.notes,
  });
  if (!error) inserted++;
}

console.log(`\nInserted ${inserted} model-specific repair costs from carsforum.`);
console.log(`Non-model-specific (general market data): ${valid.filter(r => !r.make_slug).length} entries (not inserted).`);

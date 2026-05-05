/**
 * Fetches SEO data from Google Search Console.
 * Run: node scripts/gsc-report.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(readFileSync(resolve(__dir, 'gsc-oauth-client.json'), 'utf8')).installed;
const tokenData = JSON.parse(readFileSync(resolve(__dir, 'gsc-token.json'), 'utf8'));

const SITE = 'sc-domain:carissues.co.il';

async function getAccessToken() {
  // Refresh if needed
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to refresh token: ' + JSON.stringify(data));
  // Save updated token
  writeFileSync(resolve(__dir, 'gsc-token.json'), JSON.stringify({ ...tokenData, ...data }, null, 2));
  return data.access_token;
}

async function query(token, body) {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  return res.json();
}

async function run() {
  console.log('🔑 Refreshing token...');
  const token = await getAccessToken();

  // ── 1. Overall performance last 28 days ──────────────────────────────────────
  console.log('\n📊 Overall performance (last 28 days)...');
  const overall = await query(token, {
    startDate: daysAgo(28), endDate: daysAgo(1),
    dimensions: [], rowLimit: 1,
  });
  if (overall.error) { console.error('Error:', overall.error.message); process.exit(1); }
  const tot = overall.rows?.[0] ?? {};
  console.log(`   Clicks: ${tot.clicks ?? 0}  Impressions: ${tot.impressions ?? 0}  CTR: ${pct(tot.ctr)}  Avg position: ${pos(tot.position)}`);

  // ── 2. Top pages by clicks ───────────────────────────────────────────────────
  console.log('\n📄 Top 20 pages by clicks (last 28 days)...');
  const pages = await query(token, {
    startDate: daysAgo(28), endDate: daysAgo(1),
    dimensions: ['page'], rowLimit: 20,
    orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
  });
  printTable(pages.rows ?? [], r => ({
    page: r.keys[0].replace('https://carissues.co.il', ''),
    clicks: r.clicks, impressions: r.impressions, ctr: pct(r.ctr), position: pos(r.position),
  }));

  // ── 3. Top queries ───────────────────────────────────────────────────────────
  console.log('\n🔍 Top 30 queries by clicks (last 28 days)...');
  const queries = await query(token, {
    startDate: daysAgo(28), endDate: daysAgo(1),
    dimensions: ['query'], rowLimit: 30,
    orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
  });
  printTable(queries.rows ?? [], r => ({
    query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: pct(r.ctr), position: pos(r.position),
  }));

  // ── 4. Pages with high impressions but low CTR (SEO opportunities) ───────────
  console.log('\n🎯 SEO opportunities — high impressions, low CTR (last 28 days)...');
  const allPages = await query(token, {
    startDate: daysAgo(28), endDate: daysAgo(1),
    dimensions: ['page'], rowLimit: 500,
  });
  const opportunities = (allPages.rows ?? [])
    .filter(r => r.impressions > 100 && r.ctr < 0.03)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
  printTable(opportunities, r => ({
    page: r.keys[0].replace('https://carissues.co.il', ''),
    impressions: r.impressions, clicks: r.clicks, ctr: pct(r.ctr), position: pos(r.position),
  }));

  // ── 5. Pages ranked 4–20 (low-hanging fruit to push to top 3) ───────────────
  console.log('\n🍋 Low-hanging fruit — ranked 4–20 (last 28 days)...');
  const ranked = (allPages.rows ?? [])
    .filter(r => r.position >= 4 && r.position <= 20 && r.impressions > 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
  printTable(ranked, r => ({
    page: r.keys[0].replace('https://carissues.co.il', ''),
    position: pos(r.position), impressions: r.impressions, clicks: r.clicks, ctr: pct(r.ctr),
  }));

  // ── 6. Crawl errors / index coverage ────────────────────────────────────────
  console.log('\n📋 Fetching index coverage (last 7 days vs prev 7 days)...');
  const recent   = await query(token, { startDate: daysAgo(7),  endDate: daysAgo(1),  dimensions: ['page'], rowLimit: 1 });
  const previous = await query(token, { startDate: daysAgo(14), endDate: daysAgo(8),  dimensions: ['page'], rowLimit: 1 });
  console.log(`   Last 7 days: ${recent.rows?.length ?? 0} pages with impressions`);
  console.log(`   Prev 7 days: ${previous.rows?.length ?? 0} pages with impressions`);

  console.log('\n✅ Done!\n');
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function pct(v) { return v != null ? (v * 100).toFixed(1) + '%' : '-'; }
function pos(v) { return v != null ? v.toFixed(1) : '-'; }
function printTable(rows, mapper) {
  if (!rows.length) { console.log('   (no data)'); return; }
  const mapped = rows.map(mapper);
  const keys = Object.keys(mapped[0]);
  const widths = keys.map(k => Math.max(k.length, ...mapped.map(r => String(r[k]).length)));
  const line = keys.map((k, i) => k.padEnd(widths[i])).join('  ');
  console.log('   ' + line);
  console.log('   ' + widths.map(w => '-'.repeat(w)).join('  '));
  for (const row of mapped) {
    console.log('   ' + keys.map((k, i) => String(row[k]).padEnd(widths[i])).join('  '));
  }
}

run().catch(e => { console.error(e); process.exit(1); });

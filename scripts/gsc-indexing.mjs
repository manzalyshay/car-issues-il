/**
 * Checks which sitemap URLs are not indexed in Google Search Console.
 * Run: node scripts/gsc-indexing.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(readFileSync(resolve(__dir, 'gsc-oauth-client.json'), 'utf8')).installed;
const tokenData = JSON.parse(readFileSync(resolve(__dir, 'gsc-token.json'), 'utf8'));

async function getAccessToken() {
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
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  writeFileSync(resolve(__dir, 'gsc-token.json'), JSON.stringify({ ...tokenData, ...data }, null, 2));
  return data.access_token;
}

async function inspectUrl(token, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: 'sc-domain:carissues.co.il' }),
  });
  return res.json();
}

async function run() {
  console.log('🔑 Refreshing token...');
  const token = await getAccessToken();

  // Fetch the live sitemap
  console.log('📋 Fetching sitemap...');
  const sitemapRes = await fetch('https://carissues.co.il/sitemap.xml');
  const sitemapText = await sitemapRes.text();
  const urls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log(`   Found ${urls.length} URLs in sitemap\n`);

  // Sample: check model pages + year pages + compare pages
  // Full inspection of all URLs would take too long (API rate limits)
  // Priority: model pages first, then top year pages
  const modelPages = urls.filter(u => u.match(/\/cars\/[^/]+\/[^/]+$/) && !u.includes('/compare'));
  const yearPages = urls.filter(u => u.match(/\/cars\/[^/]+\/[^/]+\/\d{4}$/));
  const comparePages = urls.filter(u => u.includes('/compare/')).slice(0, 20);
  const staticPages = urls.filter(u => !u.includes('/cars/'));

  const toCheck = [
    ...staticPages,
    ...modelPages.slice(0, 30),
    ...yearPages.slice(0, 30),
    ...comparePages,
  ];

  console.log(`🔍 Inspecting ${toCheck.length} URLs (rate-limited to 1/sec)...\n`);

  const results = { indexed: [], notIndexed: [], errors: [] };

  for (const url of toCheck) {
    await new Promise(r => setTimeout(r, 1100)); // 1 req/sec rate limit
    try {
      const data = await inspectUrl(token, url);
      const result = data.inspectionResult;
      if (!result) { results.errors.push({ url, reason: 'No result' }); continue; }

      const verdict = result.indexStatusResult?.verdict;
      const coverageState = result.indexStatusResult?.coverageState;
      const crawledAs = result.indexStatusResult?.crawledAs;
      const robotsTxtState = result.indexStatusResult?.robotsTxtState;
      const indexingState = result.indexStatusResult?.indexingState;

      const path = url.replace('https://carissues.co.il', '') || '/';

      if (verdict === 'PASS') {
        results.indexed.push({ url: path });
        process.stdout.write('✅');
      } else {
        results.notIndexed.push({ url: path, verdict, coverageState, crawledAs, robotsTxtState, indexingState });
        process.stdout.write('❌');
      }
    } catch (e) {
      results.errors.push({ url, reason: String(e) });
      process.stdout.write('⚠️');
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log(`✅ Indexed: ${results.indexed.length}/${toCheck.length}`);
  console.log(`❌ Not indexed: ${results.notIndexed.length}`);
  console.log(`⚠️  Errors: ${results.errors.length}`);

  if (results.notIndexed.length > 0) {
    console.log('\n❌ NOT INDEXED:\n');
    const grouped = {};
    for (const r of results.notIndexed) {
      const key = r.coverageState ?? r.verdict ?? 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r.url);
    }
    for (const [reason, pages] of Object.entries(grouped)) {
      console.log(`  [${reason}] — ${pages.length} pages`);
      for (const p of pages) console.log(`    ${p}`);
    }
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  ERRORS:\n');
    for (const e of results.errors) console.log(`  ${e.url}: ${e.reason}`);
  }

  // Save full results
  const outFile = resolve(__dir, 'gsc-indexing-report.json');
  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to scripts/gsc-indexing-report.json\n`);
}

run().catch(e => { console.error(e); process.exit(1); });

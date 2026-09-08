/**
 * Submits sitemap URLs to IndexNow (Bing, Yandex — Google also picks these up
 * indirectly). Run after deploying changes that affect many pages, or after
 * fixing an indexing bug, to nudge a faster recrawl.
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs            # co.il, all sitemap URLs
 *   node scripts/indexnow-submit.mjs net         # carissues.net
 *   node scripts/indexnow-submit.mjs co.il 500   # cap at 500 URLs
 */
const KEY = '8201965612f7fe1c62dfa112a6909f61';
const DOMAIN = process.argv[2] === 'net' ? 'carissues.net' : 'carissues.co.il';
const CAP = process.argv[3] ? parseInt(process.argv[3], 10) : Infinity;
const BASE = `https://${DOMAIN}`;

async function getSitemapUrls() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  const text = await res.text();
  return [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
}

async function submit(urls) {
  const BATCH = 10000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const body = { host: DOMAIN, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: batch };
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    console.log(`Batch ${Math.floor(i / BATCH) + 1}: ${batch.length} URLs -> HTTP ${res.status}`);
    if (res.status === 200 || res.status === 202) {
      console.log('  Accepted');
    } else {
      console.log('  Failed:', await res.text());
    }
  }
}

console.log(`Fetching sitemap for ${DOMAIN}...`);
let urls = await getSitemapUrls();
console.log(`Found ${urls.length} URLs in sitemap`);
if (urls.length > CAP) urls = urls.slice(0, CAP);
console.log(`Submitting ${urls.length} URLs to IndexNow...\n`);
await submit(urls);
console.log('\nDone.');

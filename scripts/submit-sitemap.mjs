#!/usr/bin/env node
// Ping Google + Bing to reindex sitemaps for both sites.
// Usage: node scripts/submit-sitemap.mjs

const sitemaps = [
  'https://carissues.co.il/sitemap.xml',
  'https://carissues.net/sitemap.xml',
];

async function ping(url) {
  // Google Sitemap ping (deprecated in 2023 but still works)
  const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(googlePing, { method: 'GET' });
    console.log(`Google ping ${url}: ${res.status}`);
  } catch (e) {
    console.error(`Google ping ${url}: FAILED`, e.message);
  }
}

for (const s of sitemaps) {
  await ping(s);
}

console.log('\nDone. Note: Google Sitemap pings are deprecated; submit via Google Search Console UI or GSC API for best results.');
console.log('GSC: https://search.google.com/search-console/sitemaps');

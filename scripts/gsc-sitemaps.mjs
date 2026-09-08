/**
 * Checks and resubmits sitemaps via the Search Console API for both properties.
 * Run: node scripts/gsc-sitemaps.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const creds = JSON.parse(readFileSync(resolve(__dir, 'gsc-oauth-client.json'), 'utf8')).installed;
const tokenData = JSON.parse(readFileSync(resolve(__dir, 'gsc-token.json'), 'utf8'));

const SITES = ['carissues.co.il', 'carissues.net'];

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

async function run() {
  const token = await getAccessToken();

  for (const domain of SITES) {
    const site = `sc-domain:${domain}`;
    const sitemapUrl = `https://${domain}/sitemap.xml`;
    console.log(`\n=== ${domain} ===`);

    // List current sitemap status
    const listRes = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const list = await listRes.json();
    for (const sm of list.sitemap ?? []) {
      console.log(`  ${sm.path}`);
      console.log(`    lastSubmitted: ${sm.lastSubmitted ?? '-'}  lastDownloaded: ${sm.lastDownloaded ?? '-'}  isPending: ${sm.isPending}  errors: ${sm.errors ?? 0}  warnings: ${sm.warnings ?? 0}`);
      for (const c of sm.contents ?? []) {
        console.log(`    type=${c.type} submitted=${c.submitted} indexed=${c.indexed ?? '-'}`);
      }
    }
    if (!list.sitemap?.length) console.log('  (no sitemaps registered)');

    // Resubmit to force a re-crawl
    const putRes = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${token}` } },
    );
    console.log(`  Resubmit ${sitemapUrl}: HTTP ${putRes.status}`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });

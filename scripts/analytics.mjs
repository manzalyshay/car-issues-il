#!/usr/bin/env node
// Usage: node scripts/analytics.mjs [days]
// Example: node scripts/analytics.mjs 7

import { GoogleAuth } from 'google-auth-library';

const DAYS = process.argv[2] ?? '30';
const PROPERTY = '543980467';
const KEY_FILE = new URL('../../../carissuesil-5264fe9517fb.json', import.meta.url).pathname;

const auth = new GoogleAuth({ keyFile: KEY_FILE, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
const token = await auth.getAccessToken();

async function report(body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateRanges: [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }], ...body }),
  });
  return res.json();
}

const [overview, pages, sources, daily] = await Promise.all([
  report({ metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }] }),
  report({ dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 }),
  report({ dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
  report({ dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
]);

const m = overview.rows[0].metricValues;
console.log(`\n=== Last ${DAYS} days ===`);
console.log(`Users: ${m[0].value}  |  Sessions: ${m[1].value}  |  Views: ${m[2].value}`);
console.log(`Bounce: ${(parseFloat(m[3].value)*100).toFixed(1)}%  |  Avg session: ${Math.round(m[4].value/60)}:${String(Math.round(m[4].value%60)).padStart(2,'0')} min`);

console.log('\n--- Traffic sources ---');
for (const r of sources.rows) console.log(`  ${r.dimensionValues[0].value}: ${r.metricValues[0].value}`);

console.log('\n--- Top pages ---');
for (const r of pages.rows) console.log(`  ${r.metricValues[0].value.padStart(4)} views  ${r.dimensionValues[0].value}`);

console.log('\n--- Daily users ---');
for (const r of daily.rows) {
  const d = r.dimensionValues[0].value;
  const u = parseInt(r.metricValues[0].value);
  const bar = '█'.repeat(Math.round(u / 2));
  console.log(`  ${d.slice(4,6)}/${d.slice(6,8)}  ${bar} ${u}`);
}

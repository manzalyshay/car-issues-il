import { readFileSync } from 'fs';
import { google } from 'googleapis';

const TOKEN_PATH = 'scripts/gsc-token.json';
const CREDS_PATH = 'scripts/gsc-oauth-client.json';

const creds = JSON.parse(readFileSync(CREDS_PATH));
const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
auth.setCredentials(JSON.parse(readFileSync(TOKEN_PATH)));

const sc = google.searchconsole({ version: 'v1', auth });
const siteUrl = 'sc-domain:carissues.co.il';

const res = await sc.searchanalytics.query({
  siteUrl,
  requestBody: {
    startDate: '2026-02-12',
    endDate: '2026-05-13',
    dimensions: ['date'],
    rowLimit: 90,
  },
});

const rows = res.data.rows || [];

const weeks = {};
for (const r of rows) {
  const d = new Date(r.keys[0]);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  const wk = mon.toISOString().slice(0,10);
  if (!weeks[wk]) weeks[wk] = { clicks: 0, impressions: 0 };
  weeks[wk].clicks += r.clicks;
  weeks[wk].impressions += Math.round(r.impressions);
}

console.log('שבוע (ראשון)   | קליקים | חשיפות');
console.log('----------------|--------|--------');
for (const [wk, d] of Object.entries(weeks).sort()) {
  console.log(`${wk}    |   ${String(d.clicks).padEnd(5)}|  ${d.impressions}`);
}

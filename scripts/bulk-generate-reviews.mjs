#!/usr/bin/env node
/**
 * Bulk-generates missing year-specific AI summaries.
 * Calls the production site's API (or local dev) in controlled parallel batches.
 *
 * Usage:
 *   node scripts/bulk-generate-reviews.mjs [--concurrency 3] [--base-url https://carissues.co.il]
 */

import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'concurrency': { type: 'string', default: '3' },
    'base-url': { type: 'string', default: 'http://localhost:7000' },
    'admin-token': { type: 'string', default: process.env.ADMIN_TOKEN ?? '' },
  },
});

const BASE_URL = values['base-url'];
const CONCURRENCY = parseInt(values['concurrency']);
const ADMIN_TOKEN = values['admin-token'];

const headers = {
  'Content-Type': 'application/json',
  ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
};

async function getMissing() {
  const res = await fetch(`${BASE_URL}/api/admin/bulk-generate-reviews`, { headers });
  if (!res.ok) throw new Error(`GET failed: ${res.status} ${await res.text()}`);
  const { missing, total } = await res.json();
  console.log(`Found ${total} missing year-specific reviews`);
  return missing;
}

async function generateOne(item) {
  const res = await fetch(`${BASE_URL}/api/admin/bulk-generate-reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify(item),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, ...data };
}

async function runBatch(items, concurrency) {
  let done = 0;
  let failed = 0;
  const total = items.length;
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const result = await generateOne(item);
        done++;
        const pct = ((done + failed) / total * 100).toFixed(1);
        if (result.skipped) {
          console.log(`[${pct}%] SKIP ${item.makeSlug}/${item.modelSlug}/${item.year}`);
        } else if (result.generated) {
          console.log(`[${pct}%] OK   ${item.makeSlug}/${item.modelSlug}/${item.year}`);
        } else {
          console.log(`[${pct}%] ERR  ${item.makeSlug}/${item.modelSlug}/${item.year} — ${JSON.stringify(result)}`);
          failed++;
        }
      } catch (e) {
        failed++;
        done++;
        console.error(`FAIL ${item.makeSlug}/${item.modelSlug}/${item.year}: ${e.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\nDone: ${done - failed} ok, ${failed} failed out of ${total}`);
}

const missing = await getMissing();
if (missing.length === 0) {
  console.log('Nothing to generate!');
  process.exit(0);
}

await runBatch(missing, CONCURRENCY);

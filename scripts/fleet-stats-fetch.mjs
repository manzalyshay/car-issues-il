#!/usr/bin/env node
// Pages through the whole data.gov.il active-vehicle registry (private &
// commercial, ~4.2M rows) with a narrow field list and writes a combination
// counter to a cache file. The registry has no aggregate/SQL endpoint and its
// bulk CSV needs a login, so paging is the only way to get exact counts.
//
//   node scripts/fleet-stats-fetch.mjs [cacheFile]
//
// Then run scripts/fleet-stats-build.mjs to turn the cache into
// src/data/fleetStats.json.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RESOURCE = '053cea08-09bc-40ec-8f7a-156f0677aff3';
const API = 'https://data.gov.il/api/3/action/datastore_search';
const FIELDS = ['tozeret_nm', 'kinuy_mishari', 'shnat_yitzur', 'tzeva_rechev', 'sug_delek_nm', 'baalut', 'moed_aliya_lakvish'];
const PAGE = 32000;
const CONCURRENCY = 3;
const out = process.argv[2] || join(tmpdir(), 'fleet-stats-raw.json');

// Minimal RFC-4180 line splitter (fields may be quoted and contain commas).
function splitCsvLine(line) {
  const cells = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

async function fetchPage(offset, attempt = 1) {
  const url = `${API}?resource_id=${RESOURCE}&limit=${PAGE}&offset=${offset}&records_format=csv&include_total=false&sort=_id&fields=${FIELDS.join(',')}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.result.records;
  } catch (e) {
    if (attempt >= 5) throw e;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return fetchPage(offset, attempt + 1);
  }
}

const totalRes = await fetch(`${API}?resource_id=${RESOURCE}&limit=0`).then((r) => r.json());
const total = totalRes.result.total;
console.log(`registry rows: ${total}`);

// key: make|model|year|color|fuel|ownership  → count
const combos = new Map();
// key: yyyy-m|make|model|fuel → count (road-entry month, recent years only)
const entries = new Map();
let rows = 0;

const offsets = [];
for (let o = 0; o < total; o += PAGE) offsets.push(o);

async function worker() {
  while (offsets.length) {
    const offset = offsets.shift();
    const csv = await fetchPage(offset);
    for (const line of csv.split('\n')) {
      if (!line) continue;
      const c = splitCsvLine(line.replace(/\r$/, ''));
      if (c.length < 7) continue;
      rows++;
      const key = c.slice(0, 6).join('|');
      combos.set(key, (combos.get(key) || 0) + 1);
      const moed = c[6];
      if (moed && Number(moed.slice(0, 4)) >= 2023) {
        const ek = `${moed}|${c[0]}|${c[1]}|${c[4]}`;
        entries.set(ek, (entries.get(ek) || 0) + 1);
      }
    }
    if ((offset / PAGE) % 10 === 0) console.log(`offset ${offset} · rows ${rows} · combos ${combos.size}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

writeFileSync(out, JSON.stringify({
  fetchedAt: new Date().toISOString(),
  total, rows,
  combos: [...combos.entries()],
  entries: [...entries.entries()],
}));
console.log(`done: ${rows} rows, ${combos.size} combos → ${out}`);

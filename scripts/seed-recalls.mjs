/**
 * scripts/seed-recalls.mjs
 *
 * Fetches NHTSA recalls for ALL car models in the DB, translates to Hebrew via Groq,
 * and upserts into the recalls_cache table. Only translates records not already cached.
 *
 * Run: node scripts/seed-recalls.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const GROQ_API_KEY  = process.env.GROQ_API_KEY              || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !GROQ_API_KEY) {
  console.error('Missing env vars. Run with .env.local loaded, e.g.:\n  node --env-file=.env.local scripts/seed-recalls.mjs');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return raw;
}

function extractYear(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length >= 4) {
    const yr = parseInt(digits.slice(0, 4));
    if (yr > 1980 && yr <= new Date().getFullYear() + 1) return yr;
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchNHTSA(makeEn, modelEn, year) {
  try {
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}&modelYear=${year}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

async function translateChunk(recalls) {
  if (recalls.length === 0) return recalls;
  const input = recalls.map((r, i) =>
    `[${i + 1}]\ncomponent: ${r.component}\nsummary: ${r.summary}\nconsequence: ${r.consequence}\nremedy: ${r.remedy}`
  ).join('\n\n');

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: 8000,
        messages: [
          {
            role: 'system',
            content: 'Translate each numbered recall from English to Hebrew. Keep technical automotive terms accurate. Reply ONLY in this exact format:\n[N]\ncomponent: ...\nsummary: ...\nconsequence: ...\nremedy: ...',
          },
          { role: 'user', content: input },
        ],
      }),
      signal: AbortSignal.timeout(40000),
    });

    if (!res.ok) {
      console.warn('  Groq error', res.status, await res.text());
      return recalls;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const out = recalls.map(r => ({ ...r }));
    const blocks = content.split(/\n(?=\[\d+\])/);
    for (const block of blocks) {
      const idxMatch = block.match(/^\[(\d+)\]/);
      if (!idxMatch) continue;
      const idx = parseInt(idxMatch[1]) - 1;
      if (idx < 0 || idx >= out.length) continue;
      const get = (field) => {
        const m = block.match(new RegExp(`${field}:\\s*([\\s\\S]*?)(?=\\n(?:component|summary|consequence|remedy):|$)`));
        return m?.[1]?.trim() || '';
      };
      const component   = get('component');
      const summary     = get('summary');
      const consequence = get('consequence');
      const remedy      = get('remedy');
      if (component)   out[idx].component   = component;
      if (summary)     out[idx].summary     = summary;
      if (consequence) out[idx].consequence = consequence;
      if (remedy)      out[idx].remedy      = remedy;
    }
    return out;
  } catch (e) {
    console.warn('  Groq exception:', e.message);
    return recalls;
  }
}

// ── main ───────────────────────────────────────────────────────────────────────

async function main() {
  // Load all models
  const [{ data: makes }, { data: models }] = await Promise.all([
    sb.from('car_makes').select('slug, name_en'),
    sb.from('car_models').select('make_slug, slug, years, name_en'),
  ]);

  const makeNameMap = Object.fromEntries((makes || []).map(m => [m.slug, m.name_en]));

  // Load already-cached IDs
  const { data: existing } = await sb.from('recalls_cache').select('id');
  const cachedIds = new Set((existing || []).map(r => r.id));
  console.log(`Already cached: ${cachedIds.size} recalls`);

  let totalNew = 0;
  let totalModels = (models || []).length;
  let processed = 0;

  for (const model of (models || [])) {
    processed++;
    const makeEn  = makeNameMap[model.make_slug] || model.make_slug;
    const modelEn = model.name_en;
    const years   = model.years || [];

    process.stdout.write(`[${processed}/${totalModels}] ${makeEn} ${modelEn} (${years.length} years)... `);

    // Fetch all years in parallel
    const batches = await Promise.all(years.map(y => fetchNHTSA(makeEn, modelEn, y)));
    const raw = batches.flat();

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const r of raw) {
      const id = r.NHTSACampaignNumber;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(r);
    }

    // Filter out already cached
    const toTranslate = unique.filter(r => !cachedIds.has(r.NHTSACampaignNumber));
    if (toTranslate.length === 0) {
      console.log(`✓ (${unique.length} recalls, all cached)`);
      continue;
    }

    console.log(`${unique.length} recalls, ${toTranslate.length} new — translating...`);

    // Translate in chunks of 6
    const CHUNK = 6;
    const rows = [];
    for (let i = 0; i < toTranslate.length; i += CHUNK) {
      const chunk = toTranslate.slice(i, i + CHUNK);
      const fields = chunk.map(r => ({
        component:   r.Component   || '',
        summary:     r.Summary     || '',
        consequence: r.Consequence || '',
        remedy:      r.Remedy      || '',
      }));
      const translated = await translateChunk(fields);

      for (let j = 0; j < chunk.length; j++) {
        const r = chunk[j];
        const t = translated[j];
        rows.push({
          id:             r.NHTSACampaignNumber,
          make:           makeEn.toLowerCase(),
          model:          modelEn.toLowerCase(),
          date:           formatDate(r.ReportReceivedDate || ''),
          component_he:   t.component   || fields[j].component,
          summary_he:     t.summary     || fields[j].summary,
          consequence_he: t.consequence || fields[j].consequence,
          remedy_he:      t.remedy      || fields[j].remedy,
          manufacturer:   r.Manufacturer || '',
          recall_year:    r.ModelYear ? parseInt(r.ModelYear) : extractYear(r.ReportReceivedDate || ''),
        });
        cachedIds.add(r.NHTSACampaignNumber);
      }

      // Small delay between Groq calls to avoid rate limit
      if (i + CHUNK < toTranslate.length) await sleep(500);
    }

    // Upsert to DB
    if (rows.length > 0) {
      const { error } = await sb.from('recalls_cache').upsert(rows, { onConflict: 'id' });
      if (error) console.error('  DB error:', error.message);
      else {
        totalNew += rows.length;
        console.log(`  ✓ saved ${rows.length} new recalls`);
      }
    }

    // Small delay between models
    await sleep(200);
  }

  console.log(`\nDone. Total new recalls saved: ${totalNew}`);
}

main().catch(console.error);

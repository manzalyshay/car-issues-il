/**
 * fix-sources-breakdown.mjs
 *
 * Directly generates and saves sources_breakdown for all expert_reviews rows
 * that currently have an empty array. Calls Mistral API directly — no Next.js needed.
 *
 * Usage:
 *   node scripts/fix-sources-breakdown.mjs
 *   DELAY_MS=2000 node scripts/fix-sources-breakdown.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}
loadEnv();

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const apiKey = process.env.MISTRAL_API_KEY;
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '2500');

if (!apiKey) { console.error('MISTRAL_API_KEY required'); process.exit(1); }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Partial-match keywords for Israeli sources (handles name variants with/without country suffix)
const IL_KEYWORDS = ['ישראל', 'טפוז', 'carzone', 'drive.co.il', 'icar', 'פייסבוק'];
function isLocalSource(name) {
  const lower = name.toLowerCase();
  return IL_KEYWORDS.some(k => lower.includes(k));
}

// ── Generate knowledge-based per-source breakdown ─────────────────────────────

async function generateBreakdown(makeNameHe, modelNameHe, makeNameEn, modelNameEn) {
  const prompt = `אתה מומחה לביקורות רכב. עבור ${makeNameHe} ${modelNameHe} (${makeNameEn} ${modelNameEn}), כתוב סיכום קצר (2-3 משפטים) של מה שבעלי הרכב אומרים בכל אחד מהמקורות הבאים, בהתבסס על הידע שלך.

המקורות:
- CarZone ביקורות גולשים (ישראל)
- פורום טפוז מכוניות (ישראל)
- KBB - Kelley Blue Book (בינלאומי)
- Edmunds Owner Reviews (בינלאומי)
- ZigWheels Owner Reviews (בינלאומי)

לכל מקור: סיכום קצר בעברית (2-3 משפטים), ציון 1-10.
אם אין לך מידע ספציפי על מקור מסוים — דלג עליו.
כתוב רק על חוות דעת בעלי הרכב: נהיגה, אמינות, תחזוקה, נוחות, עלויות — לא על קנייה או השוואות.

החזר JSON בלבד:
[{"source":"שם המקור","summary":"...","score":7}]`;

  try {
    const res = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0.3,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) { console.log(`  Mistral HTTP ${res.status}`); return []; }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => ({
        source:    String(item.source ?? ''),
        flag:      isLocalSource(String(item.source ?? '')) ? '🇮🇱' : '🌍',
        postCount: 0,
        score:     item.score != null ? Number(item.score) : null,
        summary:   String(item.summary ?? ''),
      }))
      .filter(b => b.source && b.summary.length > 20);
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return [];
  }
}

// ── Load all cars ─────────────────────────────────────────────────────────────

const [{ data: makes }, { data: models }, { data: rows }] = await Promise.all([
  sb.from('car_makes').select('slug,name_he,name_en'),
  sb.from('car_models').select('make_slug,slug,name_he,name_en'),
  sb.from('expert_reviews').select('id,make_slug,model_slug,sources_breakdown').is('year', null),
]);

const makeMap  = Object.fromEntries((makes ?? []).map(m => [m.slug, m]));
const modelMap = Object.fromEntries((models ?? []).map(m => [`${m.make_slug}/${m.slug}`, m]));

const targets = (rows ?? []).filter(r => {
  const bd = r.sources_breakdown;
  return !bd || (Array.isArray(bd) && bd.length === 0);
});

console.log(`\n🔧 Fixing sources_breakdown for ${targets.length} rows…\n`);

let fixed = 0, failed = 0;

for (let i = 0; i < targets.length; i++) {
  const row = targets[i];
  const label = `${row.make_slug}/${row.model_slug}`;
  process.stdout.write(`[${i + 1}/${targets.length}] ${label.padEnd(36)}`);

  const make  = makeMap[row.make_slug];
  const model = modelMap[`${row.make_slug}/${row.model_slug}`];
  if (!make || !model) {
    console.log('⚠ unknown car, skipping');
    failed++;
    continue;
  }

  const breakdown = await generateBreakdown(make.name_he, model.name_he, make.name_en, model.name_en);

  if (breakdown.length === 0) {
    console.log('✗ empty breakdown');
    failed++;
  } else {
    const { error } = await sb
      .from('expert_reviews')
      .update({ sources_breakdown: breakdown })
      .eq('id', row.id);

    if (error) {
      console.log(`✗ DB error: ${error.message}`);
      failed++;
    } else {
      console.log(`✓ ${breakdown.length} sources`);
      fixed++;
    }
  }

  if (i < targets.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`\n✅ Done — ${fixed} fixed, ${failed} failed\n`);

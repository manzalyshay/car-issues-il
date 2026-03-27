/**
 * scripts/backfill-israeli.mjs
 *
 * Fills in local_summary_he + local_score for existing general rows that have
 * only a global summary (seeded before Israeli summary generation was added).
 * Does NOT touch year-specific rows.
 *
 * Usage:
 *   node scripts/backfill-israeli.mjs
 *   DELAY_MS=800 node scripts/backfill-israeli.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch { /* ignore */ }
}
loadEnv();

const GEMINI_URL  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
const SB_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DELAY_MS    = parseInt(process.env.DELAY_MS ?? '1200');

if (!SB_URL || !SB_KEY) { console.error('Missing Supabase env vars'); process.exit(1); }
if (!GEMINI_KEY && !MISTRAL_KEY) { console.error('Need GEMINI_API_KEY or MISTRAL_API_KEY'); process.exit(1); }

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(SB_URL, SB_KEY);

function buildIsraeliPrompt(makeHe, modelHe, makeEn, modelEn) {
  return `אתה עוזר לאתר ביקורות רכב ישראלי. כתוב סיכום מנקודת מבט של נהגים ישראלים בפועל.

כתוב 2-3 משפטים בעברית שמשקפים מה בעלי ${makeHe} ${modelHe} (${makeEn} ${modelEn}) בישראל בדרך כלל מדווחים — בהתחשב בתנאי הנהיגה, האקלים, ורמת השירות בישראל.

חוקים:
- כתוב בגוף שלישי: "בעלי הרכב בישראל מדווחים ש...", "נהגים ישראלים מציינים...", "תלונה נפוצה בישראל היא..."
- התמקד בחוויה ישראלית: תנאי נהיגה עירוניים, חום, שירות, אמינות
- אל תכתוב תיאור כללי של הרכב — כתוב מה הנהגים אומרים
- אל תשתמש במילה "סלון" — השתמש בסדאן/SUV/האצ'בק
- אסור לציין גדלי מנוע או נתונים טכניים ספציפיים
- ציון: 9-10 ממליצים בחום, 7-8 שביעות רצון כללית, 5-6 מעורב, 3-4 תלונות רבות

החזר JSON בלבד:
{"summary_he":"...","score":8,"pros":["...","..."],"cons":["...","..."]}`;
}

function parseJson(text) {
  try {
    const clean = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    const p = JSON.parse(clean);
    p.score = Math.min(10, Math.max(1, Number(p.score) || 6));
    if (!p.summary_he || p.summary_he.length < 20) return null;
    return p;
  } catch { return null; }
}

async function callLlm(prompt) {
  // Try Gemini first (faster), fallback Mistral
  if (GEMINI_KEY) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 500 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json();
      if (!json?.error) {
        const text = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
        const result = parseJson(text);
        if (result) return result;
      }
    } catch { /* fallthrough */ }
  }
  if (MISTRAL_KEY) {
    try {
      const res = await fetch(MISTRAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6, max_tokens: 500,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json();
      const text = (json?.choices?.[0]?.message?.content ?? '').trim();
      return parseJson(text);
    } catch { /* ignore */ }
  }
  return null;
}

// Hebrew make/model lookup (mirrors seed-knowledge.mjs)
const HE_MAKES = {
  toyota: 'טויוטה', hyundai: 'יונדאי', kia: 'קיה', mazda: 'מאזדה',
  volkswagen: 'פולקסווגן', skoda: 'סקודה', honda: 'הונדה', suzuki: 'סוזוקי',
  bmw: 'ב.מ.וו', mercedes: 'מרצדס-בנץ', audi: 'אאודי', ford: 'פורד',
  nissan: 'ניסאן', peugeot: "פיג'ו", renault: 'רנו', volvo: 'וולוו',
  jeep: "ג'יפ", mitsubishi: 'מיצובישי', subaru: 'סובארו',
  byd: 'BYD', mg: 'MG', chery: "צ'רי", geely: "ג'ילי",
  cupra: 'קופרה', seat: 'סיאט', opel: 'אופל', lexus: 'לקסוס',
  dacia: "דאצ'יה", volvo: 'וולוו',
};
const EN_MAKES = {
  toyota: 'Toyota', hyundai: 'Hyundai', kia: 'Kia', mazda: 'Mazda',
  volkswagen: 'Volkswagen', skoda: 'Skoda', honda: 'Honda', suzuki: 'Suzuki',
  bmw: 'BMW', mercedes: 'Mercedes-Benz', audi: 'Audi', ford: 'Ford',
  nissan: 'Nissan', peugeot: 'Peugeot', renault: 'Renault', volvo: 'Volvo',
  jeep: 'Jeep', mitsubishi: 'Mitsubishi', subaru: 'Subaru',
  byd: 'BYD', mg: 'MG', chery: 'Chery', geely: 'Geely',
  cupra: 'Cupra', seat: 'Seat', opel: 'Opel', lexus: 'Lexus', dacia: 'Dacia',
};

// Fetch rows missing local_summary_he (general only, year IS NULL)
const { data: rows, error } = await sb
  .from('expert_reviews')
  .select('id,make_slug,model_slug,global_score,top_score')
  .is('year', null)
  .is('local_summary_he', null)
  .order('make_slug').order('model_slug');

if (error) { console.error('DB error:', error.message); process.exit(1); }

console.log(`\nBackfill Israeli summaries — ${rows.length} rows missing local_summary_he\n`);

let done = 0, saved = 0, failed = 0;

for (const row of rows) {
  const makeHe = HE_MAKES[row.make_slug] ?? row.make_slug;
  const makeEn = EN_MAKES[row.make_slug] ?? row.make_slug;
  // Use make_slug for model name if not in lookup (generic fallback)
  const modelHe = row.model_slug;
  const modelEn = row.model_slug;

  process.stdout.write(`[${done + 1}/${rows.length}] ${row.make_slug}/${row.model_slug}`.padEnd(46));

  const israeli = await callLlm(buildIsraeliPrompt(makeHe, modelHe, makeEn, modelEn));
  if (!israeli) {
    process.stdout.write('— (no data)\n');
    failed++;
  } else {
    const topScore = (israeli.score + (row.global_score ?? israeli.score)) / 2;
    const { error: updateErr } = await sb
      .from('expert_reviews')
      .update({
        local_summary_he: israeli.summary_he,
        local_score: israeli.score,
        top_score: topScore,
      })
      .eq('id', row.id);
    if (updateErr) {
      process.stdout.write('✗ (db error)\n');
      failed++;
    } else {
      process.stdout.write('✓\n');
      saved++;
    }
  }

  done++;
  if (done < rows.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`\nDone — ${saved} updated, ${failed} failed`);

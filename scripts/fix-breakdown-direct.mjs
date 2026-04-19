/**
 * Fix all expert_reviews rows (year=null) that have empty sources_breakdown.
 * Calls Mistral directly — no Next.js server needed.
 * Usage: node scripts/fix-breakdown-direct.mjs
 *        FORCE=true node scripts/fix-breakdown-direct.mjs  # re-run even if populated
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const raw = readFileSync(resolve(__dir, '../.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* ignore — env already set */ }

const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const apiKey = process.env.MISTRAL_API_KEY;
const FORCE = process.env.FORCE === 'true';
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '2000');

if (!apiKey) { console.error('MISTRAL_API_KEY required'); process.exit(1); }

const IL_KEYWORDS = ['carzone', 'טפוז', 'ישראל'];
function resolveFlag(s) { return IL_KEYWORDS.some(k => s.toLowerCase().includes(k)) ? '🇮🇱' : '🌍'; }

async function generateBreakdown(makeSlug, modelSlug, localSummary, globalSummary) {
  // Use the DB's existing local/global summaries to ground the per-source bullets
  const context = [
    localSummary  ? `ביקורות ישראליות: ${localSummary}`  : '',
    globalSummary ? `ביקורות בינלאומיות: ${globalSummary}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `אתה מומחה לביקורות רכב. עבור ${makeSlug.replace(/-/g,' ')} ${modelSlug.replace(/-/g,' ')} כתוב סיכום קצר (1-2 משפטים) של מה שבעלי הרכב אומרים בכל אחד מהמקורות הבאים.

${context ? `הקשר:\n${context}\n` : ''}
המקורות:
- CarZone ביקורות גולשים (ישראל)
- פורום טפוז מכוניות (ישראל)
- KBB - Kelley Blue Book (בינלאומי)
- Edmunds Owner Reviews (בינלאומי)
- ZigWheels Owner Reviews (בינלאומי)

לכל מקור: סיכום קצר בעברית, ציון 1-10. דלג על מקורות שאין לך מידע עליהם.
החזר JSON בלבד — מערך:
[{"source":"שם המקור","summary":"...","score":7}, ...]`;

  try {
    const res = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'mistral-small-latest', temperature: 0.3, max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    if (!Array.isArray(parsed)) return null;
    return parsed
      .map(item => ({
        source:    String(item.source ?? ''),
        flag:      resolveFlag(String(item.source ?? '')),
        postCount: 0,
        score:     item.score != null ? Number(item.score) : null,
        summary:   String(item.summary ?? ''),
      }))
      .filter(b => b.source && b.summary.length > 20);
  } catch (e) { return null; }
}

// Fetch all year=null rows
const { data: rows, error } = await sb
  .from('expert_reviews')
  .select('id,make_slug,model_slug,local_summary_he,global_summary_he,sources_breakdown')
  .is('year', null);

if (error) { console.error('DB error:', error.message); process.exit(1); }

const targets = (rows ?? []).filter(r => {
  const isEmpty = !r.sources_breakdown || (Array.isArray(r.sources_breakdown) && r.sources_breakdown.length === 0);
  return FORCE || isEmpty;
});

console.log(`\n🔧 Fixing per-source breakdown for ${targets.length} / ${rows.length} year=null rows\n`);

let done = 0, fixed = 0, skipped = 0;

for (const row of targets) {
  done++;
  const label = `${row.make_slug}/${row.model_slug}`;
  process.stdout.write(`[${done}/${targets.length}] ${label.padEnd(36)}`);

  const breakdown = await generateBreakdown(row.make_slug, row.model_slug, row.local_summary_he, row.global_summary_he);

  if (!breakdown || breakdown.length === 0) {
    process.stdout.write('✗ no breakdown generated\n');
    skipped++;
  } else {
    const { error: upErr } = await sb
      .from('expert_reviews')
      .update({ sources_breakdown: breakdown })
      .eq('id', row.id);
    if (upErr) {
      process.stdout.write(`✗ db: ${upErr.message}\n`);
      skipped++;
    } else {
      process.stdout.write(`✓ ${breakdown.length} sources\n`);
      fixed++;
    }
  }

  if (done < targets.length) await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`\n✅ Done — ${fixed} fixed, ${skipped} skipped\n`);

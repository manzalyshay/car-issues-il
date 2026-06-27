/**
 * Batch-translate all Hebrew reviews to English via Gemini.
 * Uses wrangler D1 REST API directly.
 */

import { execSync } from 'child_process';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CF_TOKEN   = process.env.CLOUDFLARE_API_TOKEN;
const DB_NAME    = 'car-issues-db';

if (!GEMINI_KEY) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }
if (!CF_TOKEN)   { console.error('Missing CLOUDFLARE_API_TOKEN'); process.exit(1); }

function d1Query(sql) {
  const result = execSync(
    `CLOUDFLARE_API_TOKEN=${CF_TOKEN} npx wrangler d1 execute ${DB_NAME} --remote --json --command ${JSON.stringify(sql)} 2>/dev/null`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
  );
  // wrangler outputs non-JSON lines + possibly multiple JSON arrays — extract first complete array
  const jsonStart = result.indexOf('[');
  if (jsonStart === -1) throw new Error('No JSON in wrangler output: ' + result.slice(0, 200));
  // Walk the string to find the end of the first complete JSON array
  let depth = 0, inStr = false, escape = false, end = -1;
  for (let i = jsonStart; i < result.length; i++) {
    const c = result[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inStr) { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) throw new Error('Could not find end of JSON array');
  const parsed = JSON.parse(result.slice(jsonStart, end));
  return parsed[0]?.results ?? [];
}

async function translate(title, body, retries = 3) {
  const prompt = `You are a professional automotive translator. Translate the following Hebrew car review to natural, fluent English. Keep technical terms accurate. Preserve the reviewer's tone. Do NOT add commentary.

Return ONLY a JSON object:
{"title": "<translated title>", "body": "<translated body>"}

Hebrew title: ${title || '(no title)'}
Hebrew body: ${body}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 10000 * attempt));
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (res.status === 429) {
        process.stdout.write(`(rate limit, waiting 30s) `);
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      const json = await res.json();
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
      if (!raw) return null;
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleaned);
    } catch { /* retry */ }
  }
  return null;
}

async function main() {
  console.log('Fetching untranslated reviews...');
  const reviews = d1Query("SELECT id, title, body FROM reviews WHERE body_en IS NULL ORDER BY created_at DESC");
  console.log(`Found ${reviews.length} reviews to translate.\n`);

  let ok = 0, failed = 0;
  for (const [i, review] of reviews.entries()) {
    process.stdout.write(`[${i + 1}/${reviews.length}] ${review.id.slice(0, 8)}... `);
    try {
      const result = await translate(review.title ?? '', review.body ?? '');
      if (result?.body) {
        const titleEn = (result.title ?? '').replace(/'/g, "''");
        const bodyEn  = (result.body  ?? '').replace(/'/g, "''");
        d1Query(`UPDATE reviews SET title_en = '${titleEn}', body_en = '${bodyEn}' WHERE id = '${review.id}'`);
        console.log('✓');
        ok++;
      } else {
        console.log('✗ (no translation)');
        failed++;
      }
    } catch (e) {
      console.log(`✗ (${e.message})`);
      failed++;
    }
    // 5s delay to stay under free-tier 15 RPM limit
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log(`\nDone: ${ok} translated, ${failed} failed.`);
}

main().catch(console.error);

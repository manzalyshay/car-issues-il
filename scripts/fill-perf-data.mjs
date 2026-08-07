/**
 * Fills missing performance data (torque, acceleration, top speed) for all car trims.
 * Uses Cloudflare Workers AI to look up specs based on make/model/HP.
 *
 * Run: node scripts/fill-perf-data.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const CF_ACCOUNT = process.env.CF_ACCOUNT_ID ?? '';
const CF_TOKEN   = process.env.CLOUDFLARE_API_TOKEN ?? '';
const AI_MODEL   = '@cf/meta/llama-4-scout-17b-16e-instruct';
const WRANGLER   = 'npx wrangler';
const CONFIG     = '--config wrangler.toml';
const DRY_RUN    = process.argv.includes('--dry');

// ── Helpers ─────────────────────────────────────────────────────────────────

const TMP_SQL = join('/tmp', 'perf-fill.sql');

function d1Select(sql) {
  // Single-statement SELECT: use --command with minified SQL
  const oneline = sql.replace(/\s+/g, ' ').trim();
  const cmd = `${WRANGLER} d1 execute DB --remote ${CONFIG} --command ${JSON.stringify(oneline)} 2>/dev/null`;
  const out = execSync(cmd, { cwd: '/workspace/car-issues-il', encoding: 'utf8' });
  const parsed = JSON.parse(out.match(/\[[\s\S]*\]/)?.[0] ?? '[]');
  return parsed[0]?.results ?? [];
}

function d1Exec(sql) {
  // Multi-statement DML: use --file
  writeFileSync(TMP_SQL, sql);
  execSync(`${WRANGLER} d1 execute DB --remote ${CONFIG} --file ${TMP_SQL} 2>/dev/null`, { cwd: '/workspace/car-issues-il' });
}

async function aiQuery(prompt) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${AI_MODEL}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a car specifications expert. Respond ONLY with valid compact JSON, no explanation.' },
          { role: 'user', content: prompt },
        ],
      }),
    }
  );
  const data = await res.json();
  return data.result?.response ?? '';
}

function parseJSON(text) {
  // Strip markdown fences if present
  const cleaned = text.replace(/```json?/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('📥 Fetching trims with missing performance data...');

const trims = d1Select(`
  SELECT id, make_slug, model_slug, name, model_year, engine_hp, engine_type, transmission
  FROM car_trims
  WHERE torque_nm IS NULL OR acceleration_0_100 IS NULL OR top_speed_kmh IS NULL
  ORDER BY make_slug, model_slug, engine_hp
`);

console.log(`Found ${trims.length} trims missing performance data.`);

// Group by make+model for batching
const groups = {};
for (const t of trims) {
  const key = `${t.make_slug}/${t.model_slug}`;
  if (!groups[key]) groups[key] = [];
  groups[key].push(t);
}

console.log(`Grouped into ${Object.keys(groups).length} car models.\n`);

let updated = 0;
let failed  = 0;

for (const [key, groupTrims] of Object.entries(groups)) {
  const [makeSlug, modelSlug] = key.split('/');
  const makeEn  = makeSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const modelEn = modelSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Unique HP values in this group
  const uniqueHPs = [...new Set(groupTrims.map(t => t.engine_hp).filter(Boolean))];

  const prompt = `For the ${makeEn} ${modelEn}, give me performance specs for each engine variant listed below.
Return a JSON array where each item has: hp (number), torque_nm (number), acceleration_0_100 (number, seconds), top_speed_kmh (number).
Use typical real-world manufacturer specs. If a value is truly unknown, use null.

Engine variants (hp): ${uniqueHPs.join(', ')}

Example output: [{"hp":130,"torque_nm":230,"acceleration_0_100":10.2,"top_speed_kmh":195}]`;

  process.stdout.write(`  ${makeEn} ${modelEn} (${uniqueHPs.join('/')} hp) ... `);

  const raw = await aiQuery(prompt);
  const specs = parseJSON(raw);

  if (!Array.isArray(specs) || specs.length === 0) {
    console.log('❌ bad response');
    console.log('    Raw:', raw.slice(0, 200));
    failed++;
    await sleep(500);
    continue;
  }

  // Build HP → spec map
  const hpMap = {};
  for (const s of specs) {
    if (s.hp) hpMap[s.hp] = s;
  }

  // For each trim, find matching spec and update
  const updates = [];
  for (const trim of groupTrims) {
    const spec = hpMap[trim.engine_hp];
    if (!spec) continue;
    const torque = spec.torque_nm != null ? Number(spec.torque_nm) : null;
    const accel  = spec.acceleration_0_100 != null ? Number(spec.acceleration_0_100) : null;
    const speed  = spec.top_speed_kmh != null ? Number(spec.top_speed_kmh) : null;
    if (torque == null && accel == null && speed == null) continue;
    updates.push({ id: trim.id, torque, accel, speed });
  }

  if (updates.length === 0) {
    console.log('⚠️  no matches');
    failed++;
    await sleep(500);
    continue;
  }

  if (!DRY_RUN) {
    // Build batch SQL
    const sql = updates.map(u => {
      const sets = [];
      if (u.torque != null) sets.push(`torque_nm = ${u.torque}`);
      if (u.accel  != null) sets.push(`acceleration_0_100 = ${u.accel}`);
      if (u.speed  != null) sets.push(`top_speed_kmh = ${u.speed}`);
      return `UPDATE car_trims SET ${sets.join(', ')} WHERE id = '${u.id}';`;
    }).join('\n');

    try {
      d1Exec(sql);
    } catch (e) {
      console.log('❌ DB error:', e.message.slice(0, 100));
      failed++;
      await sleep(500);
      continue;
    }
  }

  console.log(`✅ ${updates.length} trims (torque/accel/speed)${DRY_RUN ? ' [DRY]' : ''}`);
  updated += updates.length;
  await sleep(300); // rate limit
}

console.log(`\n🏁 Done! Updated: ${updated} trims | Failed: ${failed} models`);
if (DRY_RUN) console.log('(DRY RUN — no DB changes made)');

import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbRun } from '@/lib/db';
import { getCloudflareContext } from '@opennextjs/cloudflare';

let _aiDebug: string | null = null;

async function askAI(prompt: string): Promise<string | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx.env as Record<string, unknown>;
    _aiDebug = `env keys: ${Object.keys(env).join(',')} | AI type: ${typeof env.AI}`;
    const ai = env.AI as {
      run: (model: string, opts: unknown) => Promise<Record<string, unknown>>;
    } | undefined;
    if (!ai) return null;
    const result = await ai.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages: [
        { role: 'system', content: 'You are a car specs expert. Respond ONLY with a valid JSON array, no markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });
    _aiDebug += ` | result keys: ${Object.keys(result ?? {}).join(',')} | response type: ${typeof result?.response} | response: ${JSON.stringify(result?.response)?.slice(0, 200)}`;
    const raw = typeof result?.response === 'string' ? result.response :
      (result?.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content ?? '';
    return raw.trim() || null;
  } catch (e) { _aiDebug += ` | CATCH: ${e}`; return null; }
}

function parseSpecs(text: string): Array<{ hp: number; torque_nm: number | null; acceleration_0_100: number | null; top_speed_kmh: number | null }> {
  try {
    const clean = text.replace(/```json?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }
  return [];
}

const PERF_KEY = 'perf-fill-2026-carissues';

export async function POST(req: NextRequest) {
  const bypassKey = req.headers.get('x-perf-key');
  if (bypassKey !== PERF_KEY && !(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { limit?: number; debug?: boolean };
  const batchSize = Math.min(body.limit ?? 10, 20);
  const debug = body.debug === true;

  // Get trims with missing perf data
  const trims = await dbAll<{
    id: string; make_slug: string; model_slug: string;
    name: string; engine_hp: number | null; engine_type: string | null;
  }>(
    `SELECT id, make_slug, model_slug, name, engine_hp, engine_type
     FROM car_trims
     WHERE (torque_nm IS NULL OR acceleration_0_100 IS NULL OR top_speed_kmh IS NULL)
       AND engine_hp IS NOT NULL
     ORDER BY make_slug, model_slug, engine_hp
     LIMIT 200`,
  );


  if (!trims.length) {
    return NextResponse.json({ updated: 0, message: 'All trims have performance data' });
  }

  // Group by make+model
  const groups = new Map<string, typeof trims>();
  for (const t of trims) {
    const key = `${t.make_slug}/${t.model_slug}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  let updated = 0;
  let failed = 0;
  const processed: string[] = [];
  let count = 0;

  for (const [key, groupTrims] of groups) {
    if (count >= batchSize) break;
    count++;

    const [makeSlug, modelSlug] = key.split('/');
    const makeEn  = makeSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const modelEn = modelSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const uniqueHPs = [...new Set(groupTrims.map(t => t.engine_hp).filter((hp): hp is number => hp !== null))];

    const prompt =
      `For the ${makeEn} ${modelEn}, provide performance specs for these engine variants (by horsepower):\n` +
      uniqueHPs.map(hp => `- ${hp} hp`).join('\n') +
      `\n\nReturn a JSON array (one item per HP variant):\n` +
      `[{"hp":130,"torque_nm":230,"acceleration_0_100":10.2,"top_speed_kmh":195}]\n` +
      `Use real manufacturer specs. null for unknown values.`;

    let raw: string | null = null;
    let aiError: string | null = null;
    try { raw = await askAI(prompt); } catch (e) { aiError = String(e); }
    if (debug) return NextResponse.json({ prompt, raw, aiError, aiDebug: _aiDebug, makeEn, modelEn });
    if (!raw) { failed++; continue; }

    const specs = parseSpecs(raw);
    if (!specs.length) { failed++; continue; }

    const hpMap = new Map(specs.filter(s => s.hp).map(s => [s.hp, s]));

    for (const trim of groupTrims) {
      if (trim.engine_hp === null) continue;
      const spec = hpMap.get(trim.engine_hp);
      if (!spec) continue;

      const sets: string[] = [];
      if (spec.torque_nm != null)          sets.push('torque_nm = ?');
      if (spec.acceleration_0_100 != null) sets.push('acceleration_0_100 = ?');
      if (spec.top_speed_kmh != null)      sets.push('top_speed_kmh = ?');
      if (!sets.length) continue;

      const vals: (number | string)[] = [];
      if (spec.torque_nm != null)          vals.push(spec.torque_nm);
      if (spec.acceleration_0_100 != null) vals.push(spec.acceleration_0_100);
      if (spec.top_speed_kmh != null)      vals.push(spec.top_speed_kmh);
      vals.push(trim.id);

      await dbRun(`UPDATE car_trims SET ${sets.join(', ')} WHERE id = ?`, ...vals);
      updated++;
    }

    processed.push(`${makeEn} ${modelEn}`);
  }

  const remaining = await dbAll<{ cnt: number }>(
    `SELECT COUNT(DISTINCT make_slug || '/' || model_slug) as cnt FROM car_trims WHERE torque_nm IS NULL AND engine_hp IS NOT NULL`,
  );

  return NextResponse.json({
    updated,
    failed,
    processed,
    remainingModels: remaining[0]?.cnt ?? 0,
  });
}

export async function GET(req: NextRequest) {
  const bypassKey = req.headers.get('x-perf-key');
  if (bypassKey !== PERF_KEY && !(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await dbAll<{ make_slug: string; model_slug: string; missing: number }>(
    `SELECT make_slug, model_slug,
       SUM(CASE WHEN torque_nm IS NULL OR acceleration_0_100 IS NULL OR top_speed_kmh IS NULL THEN 1 ELSE 0 END) as missing
     FROM car_trims WHERE engine_hp IS NOT NULL
     GROUP BY make_slug, model_slug
     HAVING missing > 0
     ORDER BY make_slug, model_slug`,
  );

  return NextResponse.json({ modelsWithMissingData: rows.length, models: rows });
}

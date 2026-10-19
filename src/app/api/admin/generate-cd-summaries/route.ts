/**
 * Generate Hebrew summaries enriched with real Israeli trim/spec data from auto.co.il.
 * Uses Cloudflare Workers AI (LLaMA) — no external API quota needed.
 *
 * POST body:
 *   limit?:     number  — max per run (default 5, max 15)
 *   force?:     boolean — regenerate even if summary exists
 *   generic?:   boolean — only regenerate the "generic" template summaries
 *   makeSlug?:  string  — target single model
 *   modelSlug?: string  — target single model
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbFirst, dbRun } from '@/lib/db';
import { runWorkersAI } from '@/lib/workersAi';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Feature slug → Hebrew label
const FEATURE_LABELS: Record<string, string> = {
  adaptive_cruise:   'קרוז קונטרול מסתגל',
  aeb:               'בלימת חירום אוטומטית (AEB)',
  apple_carplay:     'Apple CarPlay / Android Auto',
  auto_lights:       'תאורה אוטומטית',
  blind_spot:        'ניטור שטח עיוור',
  lane_keep:         'שמירת נתיב',
  led_lights:        'פנסי LED',
  parking_sensors:   'חיישני חנייה',
  push_start:        'הנעה ללא מפתח',
  rear_camera:       'מצלמת רוורס',
  sunroof:           'גג פנורמי/שמש',
  heated_seats:      'מושבים מחוממים',
  ventilated_seats:  'מושבים מאווררים',
  navigation:        'ניווט מובנה',
  wireless_charging: 'טעינה אלחוטית',
  head_up_display:   'מסך הד-אפ',
  'camera_360':      'מצלמה 360°',
  auto_parking:      'חנייה אוטומטית',
  power_tailgate:    'תא מטען חשמלי',
  ambient_lighting:  'תאורת אווירה',
};

interface TrimRow {
  name: string;
  engine_hp: number | null;
  torque_nm: number | null;
  acceleration_0_100: number | null;
  top_speed_kmh: number | null;
  fuel_consumption: number | null;
  fuel_consumption_real: number | null;
  cargo_liters: number | null;
  curb_weight_kg: number | null;
  price_ils: number | null;
  monthly_price: number | null;
  engine_cc: number | null;
  engine_type: string | null;
  drive_type: string | null;
  features: string | null;
}

function buildSpecBlock(trims: TrimRow[], makeNameEn: string, modelNameEn: string, years: number[]): string {
  if (!trims.length) return '';

  const vals = (key: keyof TrimRow) => trims.map(t => t[key] as number | null).filter((v): v is number => v != null);
  const minMax = (key: keyof TrimRow) => { const vs = vals(key); return vs.length ? { min: Math.min(...vs), max: Math.max(...vs) } : null; };

  const lines: string[] = [];

  // Year range
  if (years.length) {
    const yrStr = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : `${years[0]}`;
    lines.push(`Model years in Israel: ${yrStr}`);
  }

  // Engine types
  const types = [...new Set(trims.map(t => t.engine_type).filter(Boolean))];
  if (types.length) lines.push(`Engine type(s): ${types.join(', ')}`);

  // HP
  const hp = minMax('engine_hp');
  if (hp) lines.push(hp.min === hp.max ? `Power: ${hp.min} hp` : `Power range: ${hp.min}–${hp.max} hp`);

  // Torque
  const tq = minMax('torque_nm');
  if (tq) lines.push(tq.min === tq.max ? `Torque: ${tq.min} Nm` : `Torque: ${tq.min}–${tq.max} Nm`);

  // Acceleration
  const ac = minMax('acceleration_0_100');
  if (ac) lines.push(ac.min === ac.max ? `0–100 km/h: ${ac.min}s` : `0–100 km/h: ${ac.min}–${ac.max}s`);

  // Fuel
  const fu = minMax('fuel_consumption');
  if (fu) lines.push(fu.min === fu.max ? `Fuel (manufacturer): ${fu.min} L/100km` : `Fuel (manufacturer): ${fu.min}–${fu.max} L/100km`);
  const fur = minMax('fuel_consumption_real');
  if (fur) lines.push(fur.min === fur.max ? `Fuel (real-world test): ${fur.min} L/100km` : `Fuel (real-world): ${fur.min}–${fur.max} L/100km`);

  // Cargo
  const cargo = minMax('cargo_liters');
  if (cargo) lines.push(`Cargo: ${cargo.max}L`);

  // Price
  const prices = vals('price_ils').filter(p => p > 50000);
  if (prices.length) {
    const mn = Math.min(...prices), mx = Math.max(...prices);
    lines.push(mn === mx ? `Israeli MSRP: ₪${Math.round(mn / 1000)}K` : `Israeli MSRP: ₪${Math.round(mn / 1000)}K–₪${Math.round(mx / 1000)}K`);
  }

  // Trim names
  const trimNames = trims.map(t => t.name).join(', ');
  lines.push(`Israeli trims: ${trimNames}`);

  // Safety/tech features (union of all trims)
  const allFeatures = new Set<string>();
  for (const t of trims) {
    try { (JSON.parse(t.features ?? '[]') as string[]).forEach(f => allFeatures.add(f)); } catch { /* */ }
  }
  const safetyFeatures = [...allFeatures].filter(f =>
    ['aeb', 'adaptive_cruise', 'blind_spot', 'lane_keep', 'camera_360', 'auto_parking', 'head_up_display'].includes(f)
  ).map(f => FEATURE_LABELS[f] ?? f);
  const techFeatures = [...allFeatures].filter(f =>
    ['apple_carplay', 'navigation', 'wireless_charging', 'ambient_lighting'].includes(f)
  ).map(f => FEATURE_LABELS[f] ?? f);
  const comfortFeatures = [...allFeatures].filter(f =>
    ['sunroof', 'heated_seats', 'ventilated_seats', 'power_tailgate'].includes(f)
  ).map(f => FEATURE_LABELS[f] ?? f);

  if (safetyFeatures.length) lines.push(`Safety/ADAS: ${safetyFeatures.join(', ')}`);
  if (techFeatures.length) lines.push(`Tech: ${techFeatures.join(', ')}`);
  if (comfortFeatures.length) lines.push(`Comfort: ${comfortFeatures.join(', ')}`);

  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [total, generic] = await Promise.all([
    dbFirst<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM expert_reviews WHERE summary_en IS NOT NULL AND summary_en != '' AND (global_summary_he IS NULL OR global_summary_he = '') AND year IS NULL`),
    dbFirst<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM expert_reviews WHERE year IS NULL AND (global_summary_he LIKE 'מומחים מציינים ש%' OR global_summary_he LIKE 'לפי ביקורות מקצועיות%')`),
  ]);
  return NextResponse.json({ needsGeneration: total?.cnt ?? 0, genericSummaries: generic?.cnt ?? 0 });
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    limit?: number; force?: boolean; generic?: boolean; makeSlug?: string; modelSlug?: string;
  };
  const limit = Math.min(body.limit ?? 5, 15);
  const force = body.force === true;
  const genericOnly = body.generic === true;

  let whereExtra = '';
  if (!force && !genericOnly) whereExtra = `AND (er.global_summary_he IS NULL OR er.global_summary_he = '')`;
  if (genericOnly) whereExtra = `AND (er.global_summary_he LIKE 'מומחים מציינים ש%' OR er.global_summary_he LIKE 'לפי ביקורות מקצועיות%')`;

  const ms = body.makeSlug?.replace(/'/g, '') ?? '';
  const mo = body.modelSlug?.replace(/'/g, '') ?? '';
  const whereModel = ms && mo ? `AND er.make_slug = '${ms}' AND er.model_slug = '${mo}'` : '';

  const rows = await dbAll<{
    id: string; make_slug: string; model_slug: string;
    summary_en: string; pros_en: string | null; cons_en: string | null;
    global_score: number | null; sources_breakdown_en: string | null;
    make_name_he: string; model_name_he: string; make_name_en: string; model_name_en: string;
    years: string | null;
  }>(
    `SELECT er.id, er.make_slug, er.model_slug, er.summary_en, er.pros_en, er.cons_en,
            er.global_score, er.sources_breakdown_en,
            COALESCE(mk.name_he, er.make_slug) as make_name_he,
            COALESCE(mk.name_en, er.make_slug) as make_name_en,
            COALESCE(cm.name_he, er.model_slug) as model_name_he,
            COALESCE(cm.name_en, er.model_slug) as model_name_en,
            cm.years
     FROM expert_reviews er
     LEFT JOIN car_makes mk ON er.make_slug = mk.slug
     LEFT JOIN car_models cm ON er.make_slug = cm.make_slug AND er.model_slug = cm.slug
     WHERE er.summary_en IS NOT NULL AND er.summary_en != ''
       ${whereExtra} ${whereModel}
       AND er.year IS NULL
     ORDER BY er.make_slug, er.model_slug
     LIMIT ?`,
    limit,
  );

  if (!rows.length) return NextResponse.json({ generated: 0, message: 'All done' });

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    let prosEn: string[] = [];
    let consEn: string[] = [];
    let modelYears: number[] = [];
    try { if (row.pros_en) prosEn = JSON.parse(row.pros_en); } catch { /* */ }
    try { if (row.cons_en) consEn = JSON.parse(row.cons_en); } catch { /* */ }
    try { if (row.years) modelYears = JSON.parse(row.years); } catch { /* */ }

    const verdict = row.summary_en;

    let cdRating: number | null = row.global_score;
    try {
      if (row.sources_breakdown_en) {
        const src = JSON.parse(row.sources_breakdown_en);
        const r = src?.caranddriver?.rating ?? src?.autocar?.rating;
        if (r != null) cdRating = parseFloat(r);
      }
    } catch { /* */ }
    const score = cdRating ?? 7;

    // Fetch Israeli trim specs
    const trims = await dbAll<TrimRow>(
      `SELECT name, engine_hp, torque_nm, acceleration_0_100, top_speed_kmh,
              fuel_consumption, fuel_consumption_real, cargo_liters, curb_weight_kg,
              price_ils, monthly_price, engine_cc, engine_type, drive_type, features
       FROM car_trims
       WHERE make_slug = ? AND model_slug = ? AND is_israel = 1
       ORDER BY sort_order`,
      row.make_slug, row.model_slug,
    ).catch(() => [] as TrimRow[]);

    const specsBlock = buildSpecBlock(trims, row.make_name_en, row.model_name_en, modelYears);
    const hasSpecs = specsBlock.length > 0;

    const systemPrompt = `You are a Hebrew car journalist. Write factual, specific car summaries for an Israeli audience. Always respond with valid JSON only — no markdown, no code fences, no extra text.`;

    const userPrompt = `Write a Hebrew summary for the ${row.make_name_en} ${row.model_name_en} (${row.make_name_he} ${row.model_name_he}).

## Expert review (Car and Driver / Autocar):
${verdict}${prosEn.length ? `\nPros: ${prosEn.slice(0, 3).join('; ')}` : ''}${consEn.length ? `\nCons: ${consEn.slice(0, 3).join('; ')}` : ''}
Score: ${score}/10
${hasSpecs ? `\n## Israeli market data (auto.co.il):\n${specsBlock}` : ''}

## Output requirements:
- summary_he: 3–5 Hebrew sentences. Be SPECIFIC — mention actual numbers (HP, 0–100, L/100km, price range, trim names). Cover: what kind of car it is, ${hasSpecs ? 'trim levels, engine power, fuel economy, ' : ''}key pros, key cons. Do NOT start with "מומחים מציינים ש" — use natural phrasing like "ה${row.make_name_he} ${row.model_name_he} הוא..." or "ה${row.model_name_he} של ${row.make_name_he} מגיע...". If hybrid/electric variants exist, mention them. Do NOT mention Israel, Israeli cities, Israeli roads, Israeli weather, or any Israel-specific context — this is a general automotive summary.
- pros: array of 3 short Hebrew strings — use REAL specs where available (e.g. "230 כ\\"ס", "0–100 ב-9.1 שנ'", "AEB וכל מערכות הבטיחות")
- cons: array of 3 short Hebrew strings
- score: ${score}

Respond with ONLY this JSON (no markdown):
{"summary_he":"...","score":${score},"pros":["...","...","..."],"cons":["...","...","..."]}`;

    const raw = await runWorkersAI(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { max_tokens: 1500, temperature: 0.35 },
    );

    if (!raw) {
      errors.push(`${row.make_slug}/${row.model_slug}: AI returned null`);
      failed++;
      continue;
    }

    const clean = raw
      .replace(/^```[a-z]*\n?/im, '').replace(/\n?```\s*$/m, '').trim()
      .replace(/\\'/g, "'");
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(clean); } catch { /* */ }
    if (!parsed) {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch { /* */ } }
    }

    if (!parsed || typeof parsed.summary_he !== 'string' || !parsed.summary_he.trim()) {
      errors.push(`${row.make_slug}/${row.model_slug}: parse failed — ${clean.slice(-80)}`);
      failed++;
      continue;
    }

    const summaryHe = parsed.summary_he;
    const summaryScore = typeof parsed.score === 'number' && Number.isFinite(parsed.score) ? parsed.score : score;

    try {
      await dbRun(
        `UPDATE expert_reviews SET global_summary_he=?, pros=?, cons=?, global_score=?, top_score=? WHERE id=?`,
        summaryHe,
        JSON.stringify(parsed.pros ?? []),
        JSON.stringify(parsed.cons ?? []),
        summaryScore,
        summaryScore,
        row.id,
      );
      generated++;
    } catch (e: unknown) {
      errors.push(`${row.make_slug}/${row.model_slug}: db error — ${String(e).slice(0, 50)}`);
      failed++;
    }
  }

  return NextResponse.json({ generated, failed, total: rows.length, errors });
}

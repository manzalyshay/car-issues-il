import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/db';
import { randomUUID } from 'crypto';

// Map car category → applies_to tier
const CATEGORY_TIER: Record<string, string> = {
  suv: 'suv', crossover: 'suv', pickup: 'suv',
  sedan: 'family', hatchback: 'family', wagon: 'family', minivan: 'family',
  sports: 'family', electric: 'family',
  luxury: 'luxury',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const makeSlug  = searchParams.get('make')  ?? '';
  const modelSlug = searchParams.get('model') ?? '';
  const category  = searchParams.get('category') ?? 'family';

  const tier = CATEGORY_TIER[category] ?? 'family';

  const [costs, userCosts] = await Promise.all([
    dbAll(
      `SELECT * FROM repair_costs WHERE applies_to IN ('all', ?) ORDER BY category, repair_key`,
      tier,
    ).catch(() => []),
    dbAll<{ repair_key: string; repair_name_he: string; cost_ils: number; workshop_type: string | null; notes: string | null; created_at: string; year: number | null; mileage: number | null }>(
      `SELECT repair_key, repair_name_he, cost_ils, workshop_type, notes, created_at, year, mileage
       FROM user_repair_costs WHERE make_slug = ? AND model_slug = ? ORDER BY created_at DESC LIMIT 50`,
      makeSlug, modelSlug,
    ).catch(() => []),
  ]);

  // Aggregate user costs per repair type
  const userAgg: Record<string, { count: number; avg: number; min: number; max: number; samples: typeof userCosts }> = {};
  for (const r of userCosts) {
    if (!userAgg[r.repair_key]) userAgg[r.repair_key] = { count: 0, avg: 0, min: Infinity, max: -Infinity, samples: [] };
    const agg = userAgg[r.repair_key];
    agg.count++;
    agg.avg = (agg.avg * (agg.count - 1) + r.cost_ils) / agg.count;
    agg.min = Math.min(agg.min, r.cost_ils);
    agg.max = Math.max(agg.max, r.cost_ils);
    agg.samples.push(r);
  }

  return NextResponse.json({ costs, userAgg, recentUserCosts: userCosts.slice(0, 10) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { make_slug, model_slug, year, mileage, repair_key, repair_name_he, cost_ils, workshop_type, notes } = body;

    if (!make_slug || !model_slug || !repair_key || !repair_name_he || !cost_ils) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof cost_ils !== 'number' || cost_ils < 10 || cost_ils > 200000) {
      return NextResponse.json({ error: 'Invalid cost amount' }, { status: 400 });
    }

    await dbRun(
      `INSERT INTO user_repair_costs (id, make_slug, model_slug, year, mileage, repair_key, repair_name_he, cost_ils, workshop_type, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(), make_slug, model_slug,
      year ? parseInt(year) : null,
      mileage ? parseInt(mileage) : null,
      repair_key, repair_name_he,
      Math.round(cost_ils),
      workshop_type || null,
      notes?.slice(0, 500) || null,
      new Date().toISOString(),
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

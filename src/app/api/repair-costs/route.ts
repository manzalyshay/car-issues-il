import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';

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
  const db = getServiceClient();

  // Fetch reference costs (midrag data) for this car tier
  const { data: costs } = await db
    .from('repair_costs')
    .select('*')
    .in('applies_to', ['all', tier])
    .order('category')
    .order('repair_key');

  // Fetch user-submitted costs for this model
  const { data: userCosts } = await db
    .from('user_repair_costs')
    .select('repair_key, repair_name_he, cost_ils, workshop_type, notes, created_at, year, mileage')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .order('created_at', { ascending: false })
    .limit(50);

  // Aggregate user costs per repair type
  const userAgg: Record<string, { count: number; avg: number; min: number; max: number; samples: typeof userCosts }> = {};
  for (const r of userCosts ?? []) {
    if (!userAgg[r.repair_key]) userAgg[r.repair_key] = { count: 0, avg: 0, min: Infinity, max: -Infinity, samples: [] };
    const agg = userAgg[r.repair_key];
    agg.count++;
    agg.avg = (agg.avg * (agg.count - 1) + r.cost_ils) / agg.count;
    agg.min = Math.min(agg.min, r.cost_ils);
    agg.max = Math.max(agg.max, r.cost_ils);
    agg.samples!.push(r);
  }

  return NextResponse.json({ costs: costs ?? [], userAgg, recentUserCosts: (userCosts ?? []).slice(0, 10) });
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

    const db = getServiceClient();
    const { error } = await db.from('user_repair_costs').insert({
      make_slug, model_slug,
      year: year ? parseInt(year) : null,
      mileage: mileage ? parseInt(mileage) : null,
      repair_key, repair_name_he,
      cost_ils: Math.round(cost_ils),
      workshop_type: workshop_type || null,
      notes: notes?.slice(0, 500) || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

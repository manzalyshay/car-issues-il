import { NextRequest, NextResponse } from 'next/server';
import { dbFirst } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) return NextResponse.json(null);
  try {
    const row = await dbFirst<{
      overall_stars: number;
      adult_occupant_pct: number;
      child_occupant_pct: number;
      vulnerable_road_users_pct: number;
      safety_assist_pct: number;
      test_year: number;
      model_name: string;
    }>(
      'SELECT overall_stars, adult_occupant_pct, child_occupant_pct, vulnerable_road_users_pct, safety_assist_pct, test_year, model_name FROM euro_ncap WHERE make_slug=? AND model_slug=? ORDER BY test_year DESC LIMIT 1',
      make, model,
    );
    return NextResponse.json(row ?? null, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return NextResponse.json(null);
  }
}

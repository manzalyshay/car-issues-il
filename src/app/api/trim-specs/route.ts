import { NextRequest, NextResponse } from 'next/server';
import { getTrimSpecs } from '@/lib/trimSpecsDb';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) {
    return NextResponse.json({ error: 'make and model are required' }, { status: 400 });
  }
  try {
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : undefined;
    const trims = await getTrimSpecs(make, model, year);
    return NextResponse.json(trims, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

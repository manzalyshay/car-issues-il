import { NextRequest, NextResponse } from 'next/server';
import { findCarModel } from '@/lib/sketchfab';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) return NextResponse.json(null);
  const result = await findCarModel(make, model).catch(() => null);
  return NextResponse.json(result);
}

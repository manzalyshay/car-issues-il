import { NextRequest, NextResponse } from 'next/server';
import { getAiScore } from '@/lib/aiScore';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) return NextResponse.json(null);
  const result = await getAiScore(make, model).catch(() => null);
  return NextResponse.json(result);
}

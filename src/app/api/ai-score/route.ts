import { NextRequest, NextResponse } from 'next/server';
import { getAiScore } from '@/lib/aiScore';
import { getDisplayScore } from '@/lib/displayScore';

export const runtime = 'nodejs';

/**
 * Base score + confidence for a model, plus the external test average so the
 * compare page can show the same score as the model page (owner reviews are
 * blended client-side from the reviews it already loads, then the tests).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) return NextResponse.json(null);
  const [base, display] = await Promise.all([
    getAiScore(make, model).catch(() => null),
    getDisplayScore(make, model).catch(() => null),
  ]);
  if (!base) return NextResponse.json(null);
  return NextResponse.json({ ...base, testAvg: display?.testAvg ?? null });
}

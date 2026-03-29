import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeExpertReviews } from '@/lib/expertReviews';

// Internal scrape endpoint — authenticated via service role key only (never exposed to browser)
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (auth !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { makeSlug, modelSlug } = await req.json();
  const make  = getMakeBySlug(makeSlug);
  const model = make ? getModelBySlug(make, modelSlug) : null;
  if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  const saved = await scrapeExpertReviews(
    makeSlug, modelSlug,
    make.nameHe, model.nameHe,
    make.nameEn, model.nameEn,
  );
  return NextResponse.json({ ok: true, saved });
}

import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviewsForYear, scrapeExpertReviews } from '@/lib/expertReviews';
import { getServiceClient } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { makeSlug, modelSlug, year } = await req.json();
  if (!makeSlug || !modelSlug || !year) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const yearNum = parseInt(year);

  // Skip if ANY year-specific row exists in the DB (even 0-post LLM-fallback rows)
  // — we only generate once per car/year, regardless of whether real posts were found.
  const sb = getServiceClient();
  const { data: existing } = await sb
    .from('expert_reviews')
    .select('id')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .eq('year', yearNum)
    .limit(1);
  if (existing && existing.length > 0) {
    const { review } = await getExpertReviewsForYear(makeSlug, modelSlug, yearNum);
    return NextResponse.json({ review, generated: false });
  }

  const make = await getMakeBySlug(makeSlug);
  const model = make ? await getModelBySlug(makeSlug, modelSlug) : null;
  if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  await scrapeExpertReviews(
    makeSlug, modelSlug,
    make.nameHe, model.nameHe,
    make.nameEn, model.nameEn,
    yearNum,
  );

  // Return the freshly generated review
  const { review: newReview } = await getExpertReviewsForYear(makeSlug, modelSlug, yearNum);
  return NextResponse.json({ review: newReview, generated: true });
}

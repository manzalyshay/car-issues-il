import { NextRequest, NextResponse } from 'next/server';
import { getExpertReviews, scrapeExpertReviews } from '@/lib/expertReviews';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  if (!make || !model) return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });

  const reviews = await getExpertReviews(make, model);
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.SCRAPER_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { makeSlug, modelSlug, year } = await req.json();
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const makeObj = getMakeBySlug(makeSlug);
  const modelObj = makeObj ? getModelBySlug(makeObj, modelSlug) : null;
  if (!makeObj || !modelObj) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  const saved = await scrapeExpertReviews(
    makeSlug, modelSlug,
    makeObj.nameHe, modelObj.nameHe,
    makeObj.nameEn, modelObj.nameEn,
    year ? parseInt(year) : undefined,
  );

  return NextResponse.json({ saved });
}

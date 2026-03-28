import { NextRequest, NextResponse } from 'next/server';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';
import { scrapeRawPosts } from '@/lib/expertReviews';
import { isAdmin } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug } = await req.json();
  const make  = getMakeBySlug(makeSlug);
  const model = make ? getModelBySlug(make, modelSlug) : null;
  if (!make || !model) return NextResponse.json({ error: 'Unknown car' }, { status: 404 });

  const posts = await scrapeRawPosts(make.nameHe, model.nameHe, make.nameEn, model.nameEn);
  return NextResponse.json({ posts });
}

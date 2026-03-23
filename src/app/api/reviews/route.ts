import { NextRequest, NextResponse } from 'next/server';
import { addReview } from '@/lib/reviewsDb';
import type { Review } from '@/data/reviews';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { makeSlug, modelSlug, year, authorName, userId, rating, title, body: reviewBody, category, mileage, images } = body;

    if (!makeSlug || !modelSlug || !year || !authorName || !title || !reviewBody || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    const review = await addReview({
      makeSlug,
      modelSlug,
      year: parseInt(year),
      authorName: authorName.trim().slice(0, 50),
      userId: userId ?? undefined,
      rating,
      title: title.trim().slice(0, 100),
      body: reviewBody.trim().slice(0, 2000),
      category: category ?? 'general',
      mileage: mileage ? parseInt(mileage) : undefined,
      images: Array.isArray(images) ? images.slice(0, 4) : [],
    } as Omit<Review, 'id' | 'createdAt' | 'helpful'>);

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error('[Reviews API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

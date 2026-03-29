import { NextRequest, NextResponse } from 'next/server';
import { addReview } from '@/lib/reviewsDb';
import type { Review } from '@/data/reviews';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY ?? '';

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // not configured — skip
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { makeSlug, modelSlug, year, authorName, userId, rating, title, body: reviewBody, category, mileage, images, captchaToken } = body;

    if (!makeSlug || !modelSlug || !year || !authorName || !reviewBody || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Verify CAPTCHA for guests (userId absent)
    if (!userId && TURNSTILE_SECRET) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
      const ok = await verifyTurnstile(captchaToken ?? '', ip);
      if (!ok) return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 400 });
    }

    const review = await addReview({
      makeSlug,
      modelSlug,
      year: parseInt(year),
      authorName: authorName.trim().slice(0, 50),
      userId: userId ?? undefined,
      rating,
      title: (title ?? '').trim().slice(0, 100),
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

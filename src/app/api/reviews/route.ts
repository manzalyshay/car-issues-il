import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { addReview, getReviewsForModel, translateAndSaveReview } from '@/lib/reviewsDb';
import { dbAll } from '@/lib/db';
import { sendEmail } from '@/lib/sendEmail';

function purgeCloudflarePaths(urls: string[]) {
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_CACHE_TOKEN;
  if (!zone || !token) return;
  fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: urls }),
  }).catch(() => {}); // fire-and-forget, never block the response
}
import type { Review } from '@/data/reviews';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const makeSlug  = searchParams.get('makeSlug');
  const modelSlug = searchParams.get('modelSlug');
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  const reviews = await getReviewsForModel(makeSlug, modelSlug);
  return NextResponse.json({ reviews });
}

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

async function notifyFollowers({
  makeSlug, modelSlug, authorName, rating, title, body,
}: { makeSlug: string; modelSlug: string; authorName: string; rating: number; title: string; body: string }) {
  const followers = await dbAll<{ user_email: string }>(
    'SELECT user_email FROM model_follows WHERE make_slug = ? AND model_slug = ?',
    makeSlug, modelSlug,
  ).catch(() => []);
  if (!followers.length) return;

  const carName = `${makeSlug} ${modelSlug}`.replace(/-/g, ' ');
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const preview = body.slice(0, 200) + (body.length > 200 ? '…' : '');
  const url = `https://carissues.co.il/cars/${makeSlug}/${modelSlug}`;

  const html = `
<div dir="rtl" style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1c2733">
  <div style="background:#0f2c4d;padding:20px 24px;border-radius:8px 8px 0 0">
    <span style="color:#60a5fa;font-size:13px;font-weight:700;letter-spacing:.1em">CARISSUES.CO.IL</span>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e3e8ee;border-top:none;border-radius:0 0 8px 8px">
    <h2 style="margin:0 0 4px;font-size:18px">ביקורת חדשה על ${carName}</h2>
    <p style="margin:0 0 16px;color:#66788c;font-size:13px">מאת ${authorName} · ${stars}</p>
    ${title ? `<p style="font-weight:700;margin:0 0 8px">${title}</p>` : ''}
    <p style="margin:0 0 20px;line-height:1.6;color:#4a5b6d">${preview}</p>
    <a href="${url}" style="display:inline-block;background:#1b4f8a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px">
      לביקורת המלאה ←
    </a>
    <p style="margin:24px 0 0;font-size:11px;color:#a8b5c4">
      קיבלת מייל זה כי אתה עוקב אחר ${carName} באתר CarIssues.
      <a href="${url}" style="color:#a8b5c4">הסרה מרשימת העוקבים</a>
    </p>
  </div>
</div>`;

  // Send to each follower (Resend supports up to 50 recipients per call, batch if needed)
  const emails = followers.map(f => f.user_email);
  for (let i = 0; i < emails.length; i += 50) {
    await sendEmail({
      to: emails.slice(i, i + 50),
      subject: `ביקורת חדשה על ${carName} · ${stars}`,
      html,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { makeSlug, modelSlug, year, authorName, userId, rating, title, body: reviewBody, category, subModel, mileage, images, captchaToken } = body;

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
      subModel: subModel ? String(subModel).trim().slice(0, 60) : undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      images: Array.isArray(images) ? images.slice(0, 4) : [],
    } as Omit<Review, 'id' | 'createdAt' | 'helpful'>);

    // Translate inline — after() loses the CF async context so getCloudflareContext fails inside it
    await translateAndSaveReview(review.id, review.title, review.body).catch(() => {});

    // Notify followers — fire-and-forget
    notifyFollowers({ makeSlug, modelSlug, authorName, rating, title, body: reviewBody }).catch(() => {});

    revalidatePath(`/cars/${makeSlug}/${modelSlug}`);
    revalidatePath(`/cars/${makeSlug}/${modelSlug}/issues`);
    revalidatePath('/');
    purgeCloudflarePaths([
      `https://carissues.co.il/cars/${makeSlug}/${modelSlug}`,
      `https://carissues.co.il/cars/${makeSlug}/${modelSlug}/issues`,
      'https://carissues.co.il/',
    ]);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error('[Reviews API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

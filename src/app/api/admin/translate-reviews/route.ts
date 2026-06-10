import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';
import { translateReview } from '@/lib/translateReview';

/**
 * POST /api/admin/translate-reviews
 *
 * Batch-translates reviews that have no English content yet.
 * Processes up to `limit` reviews per call (default 20) to stay within timeouts.
 *
 * Body (optional): { limit?: number }
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = Math.min(body.limit ?? 20, 50);

  const db = getServiceClient();

  // Fetch reviews without English translation
  const { data: reviews, error } = await db
    .from('reviews')
    .select('id, title, body')
    .is('body_en', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reviews?.length) return NextResponse.json({ translated: 0, message: 'All reviews already translated' });

  let translated = 0;
  let failed = 0;

  for (const review of reviews) {
    try {
      const { titleEn, bodyEn } = await translateReview(
        String(review.title ?? ''),
        String(review.body ?? ''),
      );
      if (bodyEn) {
        await db.from('reviews').update({ title_en: titleEn, body_en: bodyEn }).eq('id', review.id);
        translated++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    translated,
    failed,
    remaining: reviews.length === limit ? 'more reviews may remain' : 'done',
  });
}

/**
 * GET /api/admin/translate-reviews
 * Returns count of untranslated reviews.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getServiceClient();
  const { count } = await db.from('reviews').select('id', { count: 'exact', head: true }).is('body_en', null);
  return NextResponse.json({ untranslated: count ?? 0 });
}

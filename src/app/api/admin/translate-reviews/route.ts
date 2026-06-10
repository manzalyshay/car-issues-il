import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { translateReview } from '@/lib/translateReview';
import { dbAll, dbFirst, dbRun } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { limit?: number };
  const limit = Math.min(body.limit ?? 20, 50);

  const reviews = await dbAll<{ id: string; title: string; body: string }>(
    'SELECT id, title, body FROM reviews WHERE body_en IS NULL ORDER BY created_at DESC LIMIT ?',
    limit,
  );

  if (!reviews.length) return NextResponse.json({ translated: 0, message: 'All reviews already translated' });

  let translated = 0;
  let failed = 0;

  for (const review of reviews) {
    try {
      const { titleEn, bodyEn } = await translateReview(review.title ?? '', review.body ?? '');
      if (bodyEn) {
        await dbRun('UPDATE reviews SET title_en = ?, body_en = ? WHERE id = ?', titleEn ?? null, bodyEn, review.id);
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

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await dbFirst<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM reviews WHERE body_en IS NULL',
  );
  return NextResponse.json({ untranslated: row?.cnt ?? 0 });
}

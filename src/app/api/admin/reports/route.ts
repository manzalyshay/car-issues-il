import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbBatch, dbRun } from '@/lib/db';

/** Review reports (D1 review_reports), joined with the reported review. */
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await dbAll<{
    id: string; review_id: string; reason: string; ip: string; created_at: string;
    make_slug: string | null; model_slug: string | null; year: number | null;
    title: string | null; author: string | null; body: string | null;
  }>(
    `SELECT r.id, r.review_id, r.reason, r.ip, r.created_at,
            v.make_slug, v.model_slug, v.year, v.title, v.author, v.body
       FROM review_reports r LEFT JOIN reviews v ON v.id = r.review_id
      ORDER BY r.created_at DESC LIMIT 200`,
  );
  return NextResponse.json(rows.map(({ make_slug, model_slug, year, title, author, body, ...r }) => ({
    ...r,
    reviews: make_slug ? { make_slug, model_slug, year, title, author, body } : null,
  })));
}

/** { action: 'dismiss', id } removes one report; { action: 'delete_review', reviewId } deletes the review and its reports. */
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action, id, reviewId } = await req.json().catch(() => ({}));
  if (action === 'dismiss' && id) {
    await dbRun('DELETE FROM review_reports WHERE id = ?', id);
    return NextResponse.json({ ok: true });
  }
  if (action === 'delete_review' && reviewId) {
    await dbBatch([
      { sql: 'DELETE FROM reviews WHERE id = ?', params: [reviewId] },
      { sql: 'DELETE FROM review_reports WHERE review_id = ?', params: [reviewId] },
    ]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

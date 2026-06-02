/**
 * GET /api/cron/cleanup
 *
 * Weekly housekeeping to prevent Supabase Free-tier limits from being hit:
 *   1. Delete page_views older than 90 days  (keeps analytics table lean)
 *   2. Delete social-screenshots older than 60 days (keeps Storage lean)
 *
 * Protected by CRON_SECRET. Runs weekly on Sundays at 02:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getServiceClient();
  const now = new Date();
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Trim page_views older than 90 days
  const { count: deletedViews, error: viewsErr } = await sb
    .from('page_views')
    .delete({ count: 'exact' })
    .lt('created_at', d90);

  // 2. List and delete old social screenshots from Storage
  let deletedFiles = 0;
  try {
    const { data: files } = await sb.storage
      .from('social-screenshots')
      .list('', { limit: 500, sortBy: { column: 'created_at', order: 'asc' } });

    const old = (files ?? []).filter(
      (f) => f.created_at && f.created_at < d60,
    );

    if (old.length > 0) {
      await sb.storage
        .from('social-screenshots')
        .remove(old.map((f) => f.name));
      deletedFiles = old.length;
    }
  } catch { /* storage cleanup is best-effort */ }

  return NextResponse.json({
    ok: true,
    deletedPageViews: deletedViews ?? 0,
    deletedScreenshots: deletedFiles,
    viewsError: viewsErr?.message ?? null,
  });
}

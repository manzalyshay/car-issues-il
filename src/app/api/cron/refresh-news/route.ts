/**
 * GET /api/cron/refresh-news
 * Fetches global car news, AI-rewrites in Hebrew, saves to D1.
 * Protected by CRON_SECRET. Called by Cloudflare Cron Trigger (daily at 06:00 UTC).
 */
import { NextRequest, NextResponse } from 'next/server';
import { refreshCarNews, retranslateUntranslated, retranslateShort } from '@/lib/carNews';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [newArticles, retranslated, retranslatedShort] = await Promise.all([
      refreshCarNews(5),
      retranslateUntranslated(10),
      retranslateShort(10),
    ]);
    return NextResponse.json({ ok: true, newArticles, retranslated, retranslatedShort });
  } catch (err) {
    console.error('[refresh-news]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

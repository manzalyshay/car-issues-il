/**
 * GET /api/cron/backfill-news-images
 * One-off/manual backfill: matches existing articles that have no image (or a
 * raw motor1 feed image) against Wikimedia Commons. Not on a schedule - call
 * repeatedly until `filled` is 0 to work through the backlog (each filled row
 * drops out of the next call's WHERE clause, so no offset is needed).
 * Protected by CRON_SECRET (same secret as the other cron routes).
 */
import { NextRequest, NextResponse } from 'next/server';
import { fillMissingNewsImages } from '@/lib/carNews';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10);
  try {
    const filled = await fillMissingNewsImages(limit);
    return NextResponse.json({ ok: true, filled });
  } catch (err) {
    console.error('[backfill-news-images]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

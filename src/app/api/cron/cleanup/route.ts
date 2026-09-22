/**
 * GET /api/cron/cleanup
 *
 * Weekly housekeeping. Protected by CRON_SECRET.
 * Runs weekly on Sundays at 02:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

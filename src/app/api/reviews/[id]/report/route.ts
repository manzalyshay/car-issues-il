import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/db';

const REASONS = ['spam', 'fake', 'offensive', 'wrong_car', 'other'] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const reason: string = REASONS.includes(body.reason) ? body.reason : 'other';

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // A repeat report of the same review from the same IP is ignored (UNIQUE review_id, ip).
    await dbRun(
      'INSERT OR IGNORE INTO review_reports (id, review_id, reason, ip) VALUES (?, ?, ?, ?)',
      crypto.randomUUID(), id, reason, ip,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Report API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

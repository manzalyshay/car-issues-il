import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbRun } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { imageId, reason } = await req.json();
  if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 });

  await dbRun(
    'UPDATE car_images SET hidden = 1, hidden_reason = ? WHERE id = ?',
    reason ?? null, imageId,
  );
  return NextResponse.json({ ok: true });
}

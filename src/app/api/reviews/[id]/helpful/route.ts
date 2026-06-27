import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { dbFirst, dbRun } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const delta: number = body.delta === -1 ? -1 : 1;

    const row = await dbFirst<{ helpful: number }>('SELECT helpful FROM reviews WHERE id = ?', id);
    const current = row?.helpful ?? 0;
    await dbRun('UPDATE reviews SET helpful = ? WHERE id = ?', Math.max(0, current + delta), id);

    revalidateTag('reviews');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[helpful] unexpected', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

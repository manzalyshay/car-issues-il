import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServiceClient } from '@/lib/adminAuth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const delta: number = body.delta === -1 ? -1 : 1;

    const { data } = await getServiceClient()
      .from('reviews')
      .select('helpful')
      .eq('id', id)
      .single();

    const current = data?.helpful ?? 0;
    const { error } = await getServiceClient()
      .from('reviews')
      .update({ helpful: Math.max(0, current + delta) })
      .eq('id', id);

    if (error) {
      console.error('[helpful]', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    revalidateTag('reviews', 'default');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[helpful] unexpected', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const delta: number = body.delta === -1 ? -1 : 1;

  const { data } = await supabase
    .from('reviews')
    .select('helpful')
    .eq('id', id)
    .single();

  const current = data?.helpful ?? 0;
  await supabase
    .from('reviews')
    .update({ helpful: Math.max(0, current + delta) })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}

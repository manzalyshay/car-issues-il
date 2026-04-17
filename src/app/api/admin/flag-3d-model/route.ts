import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, reason } = await req.json();
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'makeSlug and modelSlug required' }, { status: 400 });

  const sb = getServiceClient();
  const { error } = await sb
    .from('car_3d_models')
    .update({ hidden: true, hidden_reason: reason ?? null })
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bust the cache so the model disappears immediately on next page load
  revalidateTag('car-data', 'default');

  return NextResponse.json({ ok: true });
}

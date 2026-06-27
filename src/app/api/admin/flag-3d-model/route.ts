import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbRun } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, reason } = await req.json();
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'makeSlug and modelSlug required' }, { status: 400 });

  await dbRun(
    'UPDATE car_3d_models SET hidden = 1, hidden_reason = ? WHERE make_slug = ? AND model_slug = ?',
    reason ?? null, makeSlug, modelSlug,
  );

  // Clear globalThis cache so the change is reflected immediately
  const g = globalThis as typeof globalThis & { _3dModelsCache?: unknown };
  delete g._3dModelsCache;

  return NextResponse.json({ ok: true });
}

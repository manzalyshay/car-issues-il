import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { isAdmin } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tag } = await req.json().catch(() => ({ tag: 'car-data' }));
  revalidateTag(tag ?? 'car-data', 'max');
  return NextResponse.json({ ok: true, tag: tag ?? 'car-data' });
}

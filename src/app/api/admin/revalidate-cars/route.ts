import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-service-key');
  const pat = process.env.SUPABASE_PAT;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || (secret !== serviceKey && secret !== pat)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  revalidateTag('car-data', 'default');
  revalidateTag('car-data', 'max');
  return NextResponse.json({ ok: true, revalidated: true });
}

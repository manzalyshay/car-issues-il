import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const REASONS = ['spam', 'fake', 'offensive', 'wrong_car', 'other'] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const reason: string = REASONS.includes(body.reason) ? body.reason : 'other';

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    const { error } = await sb.from('review_reports').insert({
      review_id: id,
      reason,
      ip,
    });

    if (error) {
      // Duplicate report from same IP is fine — silently ignore
      if (error.code === '23505') return NextResponse.json({ ok: true });
      console.error('[Report API]', error.message);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Report API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

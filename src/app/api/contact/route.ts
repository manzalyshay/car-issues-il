import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.message) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const { error } = await sb.from('contact_messages').insert({
    name: String(body.name).slice(0, 120),
    email: String(body.email).slice(0, 200),
    subject: String(body.subject || 'general').slice(0, 60),
    message: String(body.message).slice(0, 4000),
  });

  if (error) {
    console.error('contact insert error', error);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

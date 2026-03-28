import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ is_admin: false });

  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return NextResponse.json({ is_admin: false });

  const { data } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ is_admin: data?.is_admin ?? false });
}

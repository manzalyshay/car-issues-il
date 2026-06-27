import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbFirst } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ is_admin: false });

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return NextResponse.json({ is_admin: false });

    const profile = await dbFirst<{ is_admin: number }>(
      'SELECT is_admin FROM profiles WHERE id = ?', user.id,
    );
    return NextResponse.json({ is_admin: profile?.is_admin === 1 });
  } catch {
    return NextResponse.json({ is_admin: false });
  }
}

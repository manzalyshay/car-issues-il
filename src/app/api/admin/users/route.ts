import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dbFirst, dbRun, dbAll } from '@/lib/db';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function verifyAdmin(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const sb = getAdminClient();
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return null;
  const profile = await dbFirst<{ is_admin: number }>(
    'SELECT is_admin FROM profiles WHERE id = ?', user.id,
  );
  return profile?.is_admin === 1 ? user : null;
}

export async function GET(req: Request) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const adminSb = getAdminClient();
  const { data: { users }, error } = await adminSb.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profiles = await dbAll<{ id: string; is_admin: number; display_name: string | null }>(
    'SELECT id, is_admin, display_name FROM profiles',
  );
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const result = (users ?? []).map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      display_name: profile?.display_name ?? null,
      is_admin: profile?.is_admin ?? false,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
      provider: u.app_metadata?.provider ?? 'email',
    };
  });

  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json({ users: result });
}

export async function PATCH(req: Request) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { userId, is_admin } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  await dbRun(
    'INSERT INTO profiles (id, is_admin) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET is_admin = excluded.is_admin',
    userId, is_admin ? 1 : 0,
  );
  return NextResponse.json({ ok: true });
}

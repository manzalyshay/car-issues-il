import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

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
  const { data } = await getServiceClient().from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin ? user : null;
}

export async function GET(req: Request) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const adminSb = getAdminClient();
  const { data: { users }, error } = await adminSb.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await sb.from('profiles').select('id,is_admin,display_name');
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

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

  const sb = getServiceClient();
  const { error } = await sb.from('profiles').upsert({ id: userId, is_admin }, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

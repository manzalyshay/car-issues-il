import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

async function verifyAdmin(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return false;
  const { data } = await getServiceClient().from('profiles').select('is_admin').eq('id', user.id).single();
  return data?.is_admin === true;
}

export async function GET(req: Request) {
  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken) {
    return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
  }

  const params = new URLSearchParams({ limit: '5' });
  if (vercelProjectId) params.set('projectId', vercelProjectId);
  if (vercelTeamId) params.set('teamId', vercelTeamId);

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Vercel API error: ${res.status}` }, { status: 502 });
  }

  const { deployments } = await res.json();
  const latest = (deployments ?? []).slice(0, 5).map((d: any) => ({
    uid: d.uid,
    url: d.url,
    state: d.state,
    readyState: d.readyState,
    createdAt: d.createdAt,
    buildingAt: d.buildingAt,
    ready: d.ready,
    target: d.target ?? 'production',
    meta: { commitMessage: d.meta?.githubCommitMessage ?? d.meta?.gitlabCommitMessage ?? '' },
  }));

  return NextResponse.json({ deployments: latest });
}

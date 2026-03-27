import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  // Verify admin token (same pattern as /api/admin)
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await sb.auth.getUser(token);
  if (!userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', userData.user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const d7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString();
  const d1  = new Date(now.getTime() -      24 * 60 * 60 * 1000).toISOString();

  // All views in the last 30 days
  const { data: raw } = await sb
    .from('page_views')
    .select('path, session_id, created_at')
    .gte('created_at', d30)
    .order('created_at', { ascending: true });

  const rows = raw ?? [];

  // Totals
  const views30 = rows.length;
  const views7   = rows.filter((r) => r.created_at >= d7).length;
  const views1   = rows.filter((r) => r.created_at >= d1).length;
  const sessions30 = new Set(rows.map((r) => r.session_id)).size;
  const sessions7  = new Set(rows.filter((r) => r.created_at >= d7).map((r) => r.session_id)).size;
  const sessions1  = new Set(rows.filter((r) => r.created_at >= d1).map((r) => r.session_id)).size;

  // Daily breakdown — last 14 days
  const daily: Record<string, { views: number; sessions: Set<string> }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    daily[key] = { views: 0, sessions: new Set() };
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (daily[key]) {
      daily[key].views++;
      daily[key].sessions.add(r.session_id);
    }
  }
  const dailyChart = Object.entries(daily).map(([date, d]) => ({
    date,
    views: d.views,
    sessions: d.sessions.size,
  }));

  // Top pages
  const pageCounts: Record<string, { views: number; sessions: Set<string> }> = {};
  for (const r of rows) {
    if (!pageCounts[r.path]) pageCounts[r.path] = { views: 0, sessions: new Set() };
    pageCounts[r.path].views++;
    pageCounts[r.path].sessions.add(r.session_id);
  }
  const topPages = Object.entries(pageCounts)
    .map(([path, d]) => ({ path, views: d.views, sessions: d.sessions.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  return NextResponse.json({
    totals: { views1, views7, views30, sessions1, sessions7, sessions30 },
    dailyChart,
    topPages,
  });
}

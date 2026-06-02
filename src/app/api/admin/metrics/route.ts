import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const d7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString();
  const d1  = new Date(now.getTime() -      24 * 60 * 60 * 1000).toISOString();
  // 14-day window for chart — go back one extra day so "today" is always fully included
  const d15 = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // Server-side COUNT — unaffected by the 1000-row PostgREST default
  const [
    { count: views30 },
    { count: views7 },
    { count: views1 },
  ] = await Promise.all([
    sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', d30),
    sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', d7),
    sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', d1),
  ]);

  // 14-day chart data — descending so the row cap always captures the most recent days.
  // We only need session_id + created_at here; path is not needed for the chart.
  const { data: rawChart } = await sb
    .from('page_views')
    .select('session_id, created_at')
    .gte('created_at', d15)
    .order('created_at', { ascending: false })
    .limit(5000);

  const chartRows = (rawChart ?? []).reverse(); // oldest→newest for chart building

  // 30-day data — used for topPages AND all session-unique counts.
  // Higher limit so fast-growing sites don't get truncated session counts.
  const { data: raw30 } = await sb
    .from('page_views')
    .select('path, session_id, created_at')
    .gte('created_at', d30)
    .order('created_at', { ascending: false })
    .limit(20000);

  const rows30 = raw30 ?? [];

  // Unique session counts from the 30-day data set
  const sessions30 = new Set(rows30.map((r) => r.session_id)).size;
  const sessions7  = new Set(rows30.filter((r) => r.created_at >= d7).map((r) => r.session_id)).size;
  const sessions1  = new Set(rows30.filter((r) => r.created_at >= d1).map((r) => r.session_id)).size;

  // Daily chart (14 days)
  const daily: Record<string, { views: number; sessions: Set<string> }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    daily[d.toISOString().slice(0, 10)] = { views: 0, sessions: new Set() };
  }
  for (const r of chartRows) {
    const key = r.created_at.slice(0, 10);
    if (daily[key]) { daily[key].views++; daily[key].sessions.add(r.session_id); }
  }
  const dailyChart = Object.entries(daily).map(([date, d]) => ({
    date, views: d.views, sessions: d.sessions.size,
  }));

  // Top pages (30 days) — built from the same 30-day rows, matches the KPI cards
  const pageCounts: Record<string, { views: number; sessions: Set<string> }> = {};
  for (const r of rows30) {
    if (!pageCounts[r.path]) pageCounts[r.path] = { views: 0, sessions: new Set() };
    pageCounts[r.path].views++;
    pageCounts[r.path].sessions.add(r.session_id);
  }
  const topPages = Object.entries(pageCounts)
    .map(([path, d]) => ({ path, views: d.views, sessions: d.sessions.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  return NextResponse.json({
    totals: {
      views1:  views1  ?? 0,
      views7:  views7  ?? 0,
      views30: views30 ?? 0,
      sessions1,
      sessions7,
      sessions30,
    },
    dailyChart,
    topPages,
  });
}

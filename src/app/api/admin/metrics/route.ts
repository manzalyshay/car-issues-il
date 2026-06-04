import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const now = new Date();

  // UTC day boundaries so chart bars align with calendar days
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const msDay = 24 * 60 * 60 * 1000;
  const d30 = new Date(todayStart.getTime() - 29 * msDay).toISOString();
  const d7  = new Date(todayStart.getTime() -  6 * msDay).toISOString();
  const d1  = todayStart.toISOString();

  // ── Accurate view counts via server-side COUNT (no row limit) ─────────────
  const [
    { count: views30 },
    { count: views7 },
    { count: views1 },
  ] = await Promise.all([
    sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', d30),
    sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', d7),
    sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', d1),
  ]);

  // ── Session counts: fetch only session_id per window (small payload) ──────
  // Each window is queried independently so we don't cap a 30-day fetch at the
  // same row limit used for the 1-day window.
  const [
    { data: sid1 },
    { data: sid7 },
    { data: sid30 },
  ] = await Promise.all([
    sb.from('page_views').select('session_id').gte('created_at', d1).limit(200000),
    sb.from('page_views').select('session_id').gte('created_at', d7).limit(200000),
    sb.from('page_views').select('session_id').gte('created_at', d30).limit(200000),
  ]);

  const sessions1  = new Set((sid1  ?? []).map(r => r.session_id)).size;
  const sessions7  = new Set((sid7  ?? []).map(r => r.session_id)).size;
  const sessions30 = new Set((sid30 ?? []).map(r => r.session_id)).size;

  // ── 14-day chart: per-day COUNT queries (accurate regardless of row volume) ─
  const chartDays = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(todayStart.getTime() - (13 - i) * msDay);
    const end   = new Date(start.getTime() + msDay);
    return { date: start.toISOString().slice(0, 10), start: start.toISOString(), end: end.toISOString() };
  });

  const dailyChart = await Promise.all(chartDays.map(async ({ date, start, end }) => {
    const [{ count: dayViews }, { data: daySids }] = await Promise.all([
      sb.from('page_views').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end),
      sb.from('page_views').select('session_id').gte('created_at', start).lt('created_at', end).limit(50000),
    ]);
    return {
      date,
      views: dayViews ?? 0,
      sessions: new Set((daySids ?? []).map(r => r.session_id)).size,
    };
  }));

  // ── Top pages (30 days) ───────────────────────────────────────────────────
  const { data: pageRows } = await sb
    .from('page_views')
    .select('path, session_id')
    .gte('created_at', d30)
    .limit(200000);

  const pageCounts: Record<string, { views: number; sessions: Set<string> }> = {};
  for (const r of pageRows ?? []) {
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

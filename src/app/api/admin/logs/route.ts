import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const level  = url.searchParams.get('level');
  const source = url.searchParams.get('source');
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 200), 500);

  const sb = getServiceClient();
  let query = sb
    .from('admin_logs')
    .select('id, created_at, level, source, message, details')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (level)  query = query.eq('level', level);
  if (source) query = query.eq('source', source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const olderThanDays = Number(url.searchParams.get('days') ?? 7);
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  const sb = getServiceClient();
  const { error } = await sb.from('admin_logs').delete().lt('created_at', cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

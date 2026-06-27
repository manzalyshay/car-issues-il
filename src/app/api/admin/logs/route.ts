import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbRun } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const level  = url.searchParams.get('level');
  const source = url.searchParams.get('source');
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? 200), 500);

  const conditions: string[] = [];
  const params: (string | number | null)[] = [];
  let sql = 'SELECT id, created_at, level, source, message, details FROM admin_logs';

  if (level)  { conditions.push('level = ?');  params.push(level); }
  if (source) { conditions.push('source = ?'); params.push(source); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const data = await dbAll(sql, ...params);
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const olderThanDays = Number(url.searchParams.get('days') ?? 7);
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  await dbRun('DELETE FROM admin_logs WHERE created_at < ?', cutoff);
  return NextResponse.json({ ok: true });
}

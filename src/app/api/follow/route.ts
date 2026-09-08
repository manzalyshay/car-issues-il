import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbFirst } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, makeSlug, modelSlug } = await req.json();
    if (!userId || !userEmail || !makeSlug || !modelSlug) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await dbRun(
      'INSERT OR IGNORE INTO model_follows (user_id, user_email, make_slug, model_slug) VALUES (?, ?, ?, ?)',
      userId, userEmail, makeSlug, modelSlug,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, makeSlug, modelSlug } = await req.json();
    if (!userId || !makeSlug || !modelSlug) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await dbRun(
      'DELETE FROM model_follows WHERE user_id = ? AND make_slug = ? AND model_slug = ?',
      userId, makeSlug, modelSlug,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId    = searchParams.get('userId');
  const makeSlug  = searchParams.get('makeSlug');
  const modelSlug = searchParams.get('modelSlug');
  if (!userId || !makeSlug || !modelSlug) {
    return NextResponse.json({ following: false });
  }
  const row = await dbFirst(
    'SELECT id FROM model_follows WHERE user_id = ? AND make_slug = ? AND model_slug = ?',
    userId, makeSlug, modelSlug,
  ).catch(() => null);
  return NextResponse.json({ following: !!row });
}

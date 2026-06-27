import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbFirst, dbRun } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const replies = await dbAll(
    'SELECT id, author_name, user_id, body, created_at FROM review_replies WHERE review_id = ? ORDER BY created_at ASC LIMIT 100',
    id,
  ).catch(() => []);
  return NextResponse.json({ replies });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { authorName, userId, replyBody } = body;

    if (!authorName?.trim() || !replyBody?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (replyBody.trim().length > 1000) {
      return NextResponse.json({ error: 'Reply too long' }, { status: 400 });
    }

    const newId = randomUUID();
    const now = new Date().toISOString();
    await dbRun(
      'INSERT INTO review_replies (id, review_id, author_name, user_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      newId, id,
      authorName.trim().slice(0, 50),
      userId ?? null,
      replyBody.trim().slice(0, 1000),
      now,
    );
    const reply = await dbFirst('SELECT id, author_name, user_id, body, created_at FROM review_replies WHERE id = ?', newId);
    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error('[replies POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

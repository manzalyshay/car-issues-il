import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/adminAuth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await getServiceClient()
    .from('review_replies')
    .select('id, author_name, user_id, body, created_at')
    .eq('review_id', id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replies: data ?? [] });
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

    const { data, error } = await getServiceClient()
      .from('review_replies')
      .insert({
        review_id:   id,
        author_name: authorName.trim().slice(0, 50),
        user_id:     userId ?? null,
        body:        replyBody.trim().slice(0, 1000),
      })
      .select('id, author_name, user_id, body, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reply: data }, { status: 201 });
  } catch (err) {
    console.error('[replies POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

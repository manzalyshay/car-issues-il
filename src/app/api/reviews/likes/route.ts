import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ liked: [], disliked: [] });

  const liked = await dbAll<{ review_id: string }>(
    'SELECT review_id FROM review_likes WHERE user_id = ?', userId,
  );
  return NextResponse.json({ liked: liked.map(r => r.review_id), disliked: [] });
}

import { NextResponse } from 'next/server';
import { dbAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const videos = await dbAll<{
    id: string; make_slug: string; model_slug: string;
    youtube_id: string; title: string; channel: string;
    published_at: string; thumbnail_url: string;
  }>('SELECT * FROM car_videos ORDER BY published_at DESC LIMIT 6');

  return NextResponse.json(videos);
}

import { NextRequest, NextResponse } from 'next/server';
import { getLatestNews } from '@/lib/carNews';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '20'), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    const news = await getLatestNews(limit, offset);
    return NextResponse.json({ news }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

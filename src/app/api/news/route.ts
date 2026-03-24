import { NextResponse } from 'next/server';
import { scrapeCarNews, saveNewsCache, getCachedNews } from '@/lib/newsScraper';

export const dynamic = 'force-dynamic';

// GET — return cached news
export async function GET() {
  const news = await getCachedNews();
  return NextResponse.json({ articles: news, count: news.length });
}

// POST — trigger scrape (cron or manual)
export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key');
  const expected = process.env.SCRAPER_API_KEY;
  if (expected && apiKey !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const articles = await scrapeCarNews();
    await saveNewsCache(articles);
    return NextResponse.json({ success: true, scraped: articles.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

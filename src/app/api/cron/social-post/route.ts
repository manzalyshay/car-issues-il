import { NextResponse } from 'next/server';
import { generateDailyPost } from '@/lib/socialPost';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const post = await generateDailyPost();
    if (!post) return NextResponse.json({ ok: true, message: 'no post generated' });
    // TODO: when social accounts are ready, call posting APIs here:
    // await postToFacebook(post);
    // await postToTwitter(post);
    // await postToTelegram(post);
    // await postToInstagram(post);
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error('social-post cron error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

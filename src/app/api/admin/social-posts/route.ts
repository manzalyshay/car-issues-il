import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';
import { generateDailyPost } from '@/lib/socialPost';

function screenshotFilename(imageUrl: string): string | null {
  // URL format: .../storage/v1/object/public/social-screenshots/FILENAME.jpg
  try {
    const parts = new URL(imageUrl).pathname.split('/');
    const idx = parts.indexOf('social-screenshots');
    return idx !== -1 ? parts.slice(idx + 1).join('/') : null;
  } catch { return null; }
}

async function deleteScreenshot(sb: ReturnType<typeof getServiceClient>, imageUrl: string) {
  const filename = screenshotFilename(imageUrl);
  if (filename) await sb.storage.from('social-screenshots').remove([filename]);
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getServiceClient();
  const { data, error } = await sb
    .from('social_posts')
    .select('*')
    .order('scheduled_for', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;
  const sb = getServiceClient();

  if (action === 'generate') {
    const post = await generateDailyPost(body.postType);
    if (!post) return NextResponse.json({ error: 'no post generated' }, { status: 400 });
    return NextResponse.json({ ok: true, post });
  }

  if (action === 'create') {
    const { platform, content_he, content_en, hashtags, scheduled_for } = body;
    const { data, error } = await sb
      .from('social_posts')
      .insert({ platform, content_he, content_en, hashtags, scheduled_for, status: 'pending', metadata: {} })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: data });
  }

  if (action === 'update') {
    const { id, platform, content_he, content_en, hashtags, scheduled_for, status } = body;
    const updates: Record<string, unknown> = {};
    if (platform !== undefined) updates.platform = platform;
    if (content_he !== undefined) updates.content_he = content_he;
    if (content_en !== undefined) updates.content_en = content_en;
    if (hashtags !== undefined) updates.hashtags = hashtags;
    if (scheduled_for !== undefined) updates.scheduled_for = scheduled_for;
    if (status !== undefined) updates.status = status;

    const { error } = await sb.from('social_posts').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = body;
    // Fetch post first to get screenshot URL, then delete both
    const { data: post } = await sb.from('social_posts').select('metadata').eq('id', id).single();
    const imageUrl = (post?.metadata as Record<string, unknown> | null)?.image_url as string | undefined;
    if (imageUrl) await deleteScreenshot(sb, imageUrl);
    const { error } = await sb.from('social_posts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete_screenshot') {
    const { id } = body;
    const { data: post } = await sb.from('social_posts').select('metadata').eq('id', id).single();
    const meta = post?.metadata as Record<string, unknown> | null;
    const imageUrl = meta?.image_url as string | undefined;
    if (imageUrl) await deleteScreenshot(sb, imageUrl);
    const { error } = await sb.from('social_posts').update({
      metadata: { ...meta, image_url: null },
    }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

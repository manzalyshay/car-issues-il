import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';

const API = 'https://graph.facebook.com/v19.0';
const token = () => process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const IG_ID = () => process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const PAGE_ID = () => process.env.FACEBOOK_PAGE_ID!;

async function gql(path: string, method = 'GET', body?: Record<string, unknown>) {
  const url = `${API}/${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify({ ...body, access_token: token() }) } : undefined),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  const SITE_URL = 'https://carissues.co.il';

  function ensureSiteLink(text: string): string {
    return text.includes(SITE_URL) ? text : `${text}\n\n🔗 ${SITE_URL}`;
  }

  // ── Publish to Instagram + Facebook (post + optional story) ──────────────────
  if (action === 'publish') {
    const { imageUrl, caption, hashtags, postId, includeStory = false } = body;
    const fullCaption = ensureSiteLink(`${caption}\n\n${hashtags}`);
    const results: Record<string, unknown> = {};

    // Instagram post: create container → publish
    try {
      const container = await gql(`${IG_ID()}/media`, 'POST', { image_url: imageUrl, caption: fullCaption });
      if (container.error) throw new Error(container.error.message);
      const published = await gql(`${IG_ID()}/media_publish`, 'POST', { creation_id: container.id });
      results.instagram = published;
    } catch (e) {
      results.instagram_error = String(e);
    }

    // Facebook post
    try {
      const fb = await gql(`${PAGE_ID()}/photos`, 'POST', { url: imageUrl, message: fullCaption });
      results.facebook = fb;
    } catch (e) {
      results.facebook_error = String(e);
    }

    // Instagram story
    if (includeStory) {
      try {
        const storyContainer = await gql(`${IG_ID()}/media`, 'POST', {
          image_url: imageUrl,
          media_type: 'STORIES',
          link_sticker: SITE_URL,
        });
        if (storyContainer.error) throw new Error(storyContainer.error.message);
        const storyPublished = await gql(`${IG_ID()}/media_publish`, 'POST', { creation_id: storyContainer.id });
        results.instagram_story = storyPublished;
      } catch (e) {
        results.instagram_story_error = String(e);
      }

      // Facebook story
      try {
        const fbStory = await gql(`${PAGE_ID()}/photo_stories`, 'POST', { url: imageUrl });
        results.facebook_story = fbStory;
      } catch (e) {
        results.facebook_story_error = String(e);
      }
    }

    // Mark post as published
    if (postId) {
      const { getServiceClient } = await import('@/lib/adminAuth');
      const sb = getServiceClient();
      const { data: existing } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
      await sb.from('social_posts').update({
        status: 'posted',
        metadata: { ...(existing?.metadata ?? {}), published_at: new Date().toISOString(), ...results },
      }).eq('id', postId);
    }

    return NextResponse.json({ ok: true, ...results });
  }

  // ── Get Instagram posts ──────────────────────────────────────────────────────
  if (action === 'get_ig_posts') {
    const data = await fetch(
      `${API}/${IG_ID()}/media?fields=id,caption,timestamp,media_url,permalink&limit=12&access_token=${token()}`
    ).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Delete Instagram post ────────────────────────────────────────────────────
  if (action === 'delete_ig_post') {
    const { mediaId } = body;
    const data = await fetch(`${API}/${mediaId}?access_token=${token()}`, { method: 'DELETE' }).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Get Facebook posts ───────────────────────────────────────────────────────
  if (action === 'get_fb_posts') {
    const data = await fetch(
      `${API}/${PAGE_ID()}/posts?fields=id,message,created_time,full_picture&limit=12&access_token=${token()}`
    ).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Delete Facebook post ─────────────────────────────────────────────────────
  if (action === 'delete_fb_post') {
    const { fbPostId } = body;
    const data = await fetch(`${API}/${fbPostId}?access_token=${token()}`, { method: 'DELETE' }).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Update Facebook Page info ────────────────────────────────────────────────
  if (action === 'update_page_info') {
    const { about, description, website } = body;
    const updates: Record<string, string> = {};
    if (about) updates.about = about;
    if (description) updates.description = description;
    if (website) updates.website = website;
    const data = await gql(PAGE_ID(), 'POST', updates);
    return NextResponse.json(data);
  }

  // ── Update Facebook Page profile picture ────────────────────────────────────
  if (action === 'update_profile_picture') {
    const { imageUrl } = body;
    const data = await gql(`${PAGE_ID()}/picture`, 'POST', { url: imageUrl });
    return NextResponse.json(data);
  }

  // ── Get Page info ────────────────────────────────────────────────────────────
  if (action === 'get_page_info') {
    const data = await fetch(
      `${API}/${PAGE_ID()}?fields=name,about,description,website,picture,fan_count&access_token=${token()}`
    ).then(r => r.json());
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

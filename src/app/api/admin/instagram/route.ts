import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

const API = 'https://graph.facebook.com/v19.0';
const IG_ID = () => process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;
const PAGE_ID = () => process.env.FACEBOOK_PAGE_ID!;
const SETTINGS_FILE = 'fb-settings.json';

async function getStoredToken(): Promise<{ token: string; expiresAt: string | null }> {
  try {
    const sb = getServiceClient();
    const { data } = await sb.storage.from('social-screenshots').download(SETTINGS_FILE);
    if (data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch { /* fall through */ }
  return { token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN!, expiresAt: null };
}

async function saveToken(token: string, expiresAt: string) {
  const sb = getServiceClient();
  const content = JSON.stringify({ token, expiresAt });
  await sb.storage.from('social-screenshots').upload(SETTINGS_FILE, Buffer.from(content), {
    contentType: 'application/json', upsert: true,
  });
}

async function getToken() {
  const stored = await getStoredToken();
  return stored.token;
}

async function gql(path: string, method = 'GET', body?: Record<string, unknown>) {
  const t = await getToken();
  const url = `${API}/${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify({ ...body, access_token: t }) } : undefined),
  });
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
  return json;
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
    const { imageUrl, storyImageUrl, caption, hashtags, postId, includeStory = false, storyLink } = body;
    const storyUrl = storyImageUrl ?? imageUrl; // fall back to feed image if no story image
    const storyLinkUrl = storyLink ?? SITE_URL;
    const fullCaption = ensureSiteLink(`${caption}\n\n${hashtags}`);
    const results: Record<string, unknown> = {};

    // Instagram post: create container → publish → fetch media details
    try {
      const container = await gql(`${IG_ID()}/media`, 'POST', { image_url: imageUrl, caption: fullCaption });
      if (container.error) throw new Error(container.error.message);
      const published = await gql(`${IG_ID()}/media_publish`, 'POST', { creation_id: container.id });
      results.instagram = published;
      results.ig_post_id = published.id;
      // Fetch permalink and media_url for the published post
      try {
        const t = await getToken();
        const details = await fetch(`${API}/${published.id}?fields=permalink,media_url&access_token=${t}`).then(r => r.json());
        if (details.permalink) results.ig_permalink = details.permalink;
        if (details.media_url) results.ig_media_url = details.media_url;
      } catch { /* non-fatal */ }
    } catch (e) {
      results.instagram_error = String(e);
    }

    // Facebook post
    try {
      const fb = await gql(`${PAGE_ID()}/photos`, 'POST', { url: imageUrl, message: fullCaption });
      results.facebook = fb;
      const fbId = (fb as Record<string, string>).post_id ?? (fb as Record<string, string>).id;
      if (fbId) {
        results.fb_post_id = fbId;
        results.fb_post_url = `https://www.facebook.com/${fbId}`;
      }
    } catch (e) {
      results.facebook_error = String(e);
    }

    // Instagram story
    if (includeStory) {
      try {
        const storyContainer = await gql(`${IG_ID()}/media`, 'POST', {
          image_url: storyUrl,
          media_type: 'STORIES',
          link_sticker: JSON.stringify({ link_url: storyLinkUrl }),
        });
        if (storyContainer.error) throw new Error(storyContainer.error.message);
        const storyPublished = await gql(`${IG_ID()}/media_publish`, 'POST', { creation_id: storyContainer.id });
        results.instagram_story = storyPublished;
      } catch (e) {
        results.instagram_story_error = String(e);
      }

      // Facebook story — try photo_stories, fall back to video_stories approach
      try {
        const t = await getToken();
        // photo_stories requires multipart or file_url; try both param names
        const rawRes = await fetch(`${API}/${PAGE_ID()}/photo_stories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: storyUrl, file_url: storyUrl, access_token: t }),
        });
        const fbStory = await rawRes.json();
        if (fbStory?.error) throw new Error(`(${fbStory.error.code}) ${fbStory.error.message}`);
        results.facebook_story = fbStory;
      } catch (e) {
        results.facebook_story_error = String(e);
      }
    }

    // Log everything for debugging
    console.error('[publish] results:', JSON.stringify(results));

    // Only mark as posted if we actually got a post ID back (not just absence of errors)
    const igOk = !!results.ig_post_id;
    const fbOk = !!results.fb_post_id;
    const anySuccess = igOk || fbOk;
    console.error('[publish] igOk:', igOk, 'fbOk:', fbOk, 'anySuccess:', anySuccess);

    if (postId) {
      const { getServiceClient } = await import('@/lib/adminAuth');
      const sb = getServiceClient();
      const { data: existing } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
      const existingMeta = (existing?.metadata ?? {}) as Record<string, unknown>;

      // Delete screenshot from storage after successful publish to save space
      if (anySuccess && existingMeta.image_url) {
        try {
          const parts = new URL(existingMeta.image_url as string).pathname.split('/');
          const idx = parts.indexOf('social-screenshots');
          const filename = idx !== -1 ? parts.slice(idx + 1).join('/') : null;
          if (filename) await sb.storage.from('social-screenshots').remove([filename]);
        } catch { /* non-fatal */ }
      }

      // Strip all previous publish result fields so old errors/successes don't bleed through
      const { instagram: _ig, facebook: _fb, instagram_story: _igs, facebook_story: _fbs,
              instagram_error: _ige, facebook_error: _fbe, instagram_story_error: _igse, facebook_story_error: _fbse,
              ig_post_id: _igid, ig_permalink: _igpl, ig_media_url: _igmu,
              fb_post_id: _fbid, fb_post_url: _fburl, published_at: _pa,
              ...coreMeta } = existingMeta;

      await sb.from('social_posts').update({
        status: anySuccess ? 'posted' : 'failed',
        metadata: {
          ...coreMeta,
          ...(anySuccess ? { published_at: new Date().toISOString(), image_url: null } : { image_url: existingMeta.image_url }),
          ...results,
        },
      }).eq('id', postId);
    }

    if (!anySuccess) {
      return NextResponse.json({
        ok: false,
        error: [results.instagram_error, results.facebook_error].filter(Boolean).join(' | '),
        ...results,
      }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...results });
  }

  // ── Clear stored token ───────────────────────────────────────────────────────
  if (action === 'clear_token') {
    const sb = getServiceClient();
    await sb.storage.from('social-screenshots').remove([SETTINGS_FILE]);
    return NextResponse.json({ ok: true });
  }

  // ── Debug: test token + raw API responses ────────────────────────────────────
  if (action === 'debug_publish') {
    const { imageUrl } = body;
    const t = await getToken();
    const debug: Record<string, unknown> = { tokenFirst20: t ? t.slice(0, 20) + '...' : 'MISSING' };
    // Check token permissions
    try {
      const permsRes = await fetch(`${API}/me/permissions?access_token=${t}`).then(r => r.json());
      debug.permissions = (permsRes.data ?? []).filter((p: Record<string, string>) => p.status === 'granted').map((p: Record<string, string>) => p.permission);
    } catch (e) { debug.permissions_error = String(e); }
    // Test token validity
    try {
      const meRes = await fetch(`${API}/me?fields=id,name&access_token=${t}`).then(r => r.json());
      debug.me = meRes;
    } catch (e) { debug.me_error = String(e); }
    // Test IG account
    try {
      const igRes = await fetch(`${API}/${IG_ID()}?fields=id,username&access_token=${t}`).then(r => r.json());
      debug.ig_account = igRes;
    } catch (e) { debug.ig_account_error = String(e); }
    // Test FB page
    try {
      const fbRes = await fetch(`${API}/${PAGE_ID()}?fields=id,name&access_token=${t}`).then(r => r.json());
      debug.fb_page = fbRes;
    } catch (e) { debug.fb_page_error = String(e); }
    // Test IG container creation (if imageUrl provided)
    if (imageUrl) {
      try {
        const url = `${API}/${IG_ID()}/media`;
        const rawRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: imageUrl, caption: 'test', access_token: t }) });
        debug.ig_container_status = rawRes.status;
        debug.ig_container = await rawRes.json();
      } catch (e) { debug.ig_container_error = String(e); }
      try {
        const url = `${API}/${PAGE_ID()}/photos`;
        const rawRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: imageUrl, message: 'test', published: false, access_token: t }) });
        debug.fb_photo_status = rawRes.status;
        debug.fb_photo = await rawRes.json();
      } catch (e) { debug.fb_photo_error = String(e); }
    }
    return NextResponse.json(debug);
  }

  // ── Token status ─────────────────────────────────────────────────────────────
  if (action === 'get_token_status') {
    const stored = await getStoredToken();
    const daysLeft = stored.expiresAt
      ? Math.ceil((new Date(stored.expiresAt).getTime() - Date.now()) / 86400000)
      : null;
    return NextResponse.json({ expiresAt: stored.expiresAt, daysLeft, hasToken: !!stored.token });
  }

  // ── Refresh token (exchange short-lived for 60-day) ──────────────────────────
  if (action === 'refresh_token') {
    const { newToken } = body;
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    if (!appId || !appSecret) return NextResponse.json({ error: 'FB_APP_ID / FB_APP_SECRET חסרים ב-Vercel env vars' }, { status: 500 });
    if (!newToken) return NextResponse.json({ error: 'יש להדביק טוקן חדש מ-Graph API Explorer' }, { status: 400 });

    const res = await fetch(
      `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${newToken}`
    );
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: `Facebook: ${data.error.message}` }, { status: 400 });

    const longLivedUserToken = data.access_token;

    // Exchange long-lived user token for a permanent Page Access Token
    const pageTokenRes = await fetch(`${API}/${PAGE_ID()}?fields=access_token&access_token=${longLivedUserToken}`);
    const pageTokenData = await pageTokenRes.json();
    if (pageTokenData.error) return NextResponse.json({ error: `Page token error: ${pageTokenData.error.message}` }, { status: 400 });

    // Page tokens derived from long-lived user tokens never expire
    const finalToken = pageTokenData.access_token ?? longLivedUserToken;
    const expiresAt = pageTokenData.access_token
      ? new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString() // effectively permanent
      : new Date(Date.now() + (data.expires_in ?? 5184000) * 1000).toISOString();

    await saveToken(finalToken, expiresAt);
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    return NextResponse.json({ ok: true, expiresAt, daysLeft, isPageToken: !!pageTokenData.access_token });
  }

  // ── Get post metrics ─────────────────────────────────────────────────────────
  if (action === 'get_metrics') {
    const { igPostId, fbPostId } = body;
    const t = await getToken();
    const metrics: Record<string, unknown> = {};

    if (igPostId) {
      try {
        // IG media insights: impressions, reach, likes, comments, saves
        const ins = await fetch(`${API}/${igPostId}/insights?metric=impressions,reach,likes,comments,saved&access_token=${t}`).then(r => r.json());
        if (ins.data) {
          for (const m of ins.data) metrics[`ig_${m.name}`] = m.values?.[0]?.value ?? m.value;
        }
      } catch { /* non-fatal */ }
    }

    if (fbPostId) {
      try {
        // FB post insights
        const ins = await fetch(`${API}/${fbPostId}/insights?metric=post_impressions,post_reactions_by_type_total,post_clicks&access_token=${t}`).then(r => r.json());
        if (ins.data) {
          for (const m of ins.data) metrics[`fb_${m.name}`] = m.values?.[0]?.value ?? m.value;
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json(metrics);
  }

  // ── Get Instagram posts ──────────────────────────────────────────────────────
  if (action === 'get_ig_posts') {
    const t = await getToken();
    const data = await fetch(
      `${API}/${IG_ID()}/media?fields=id,caption,timestamp,media_url,permalink&limit=12&access_token=${t}`
    ).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Delete Instagram post ────────────────────────────────────────────────────
  if (action === 'delete_ig_post') {
    const t = await getToken();
    const { mediaId } = body;
    const data = await fetch(`${API}/${mediaId}?access_token=${t}`, { method: 'DELETE' }).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Get Facebook posts ───────────────────────────────────────────────────────
  if (action === 'get_fb_posts') {
    const t = await getToken();
    const data = await fetch(
      `${API}/${PAGE_ID()}/posts?fields=id,message,created_time,full_picture&limit=12&access_token=${t}`
    ).then(r => r.json());
    return NextResponse.json(data);
  }

  // ── Delete Facebook post ─────────────────────────────────────────────────────
  if (action === 'delete_fb_post') {
    const t = await getToken();
    const { fbPostId } = body;
    const data = await fetch(`${API}/${fbPostId}?access_token=${t}`, { method: 'DELETE' }).then(r => r.json());
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
    const t = await getToken();
    const data = await fetch(
      `${API}/${PAGE_ID()}?fields=name,about,description,website,picture,fan_count&access_token=${t}`
    ).then(r => r.json());
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

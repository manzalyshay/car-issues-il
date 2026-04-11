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

  if (action === 'generate_from_prompt') {
    const { prompt } = body;
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

    const SYSTEM_PROMPT = `You are a social media manager for CarIssues IL (carissues.co.il) — the largest Israeli website for car reviews, issues and ratings in Hebrew.

Generate a social media post based on this brief: "${prompt}"

Return ONLY a raw JSON object (no markdown, no code blocks) with these fields:
- content_he: Hebrew caption, engaging, 2-4 short paragraphs, use emojis, end with the website link carissues.co.il. Write naturally for Israeli car owners.
- hashtags: string of relevant Hebrew + English hashtags, space-separated (8-12 tags)
- screenshot_path: best page path to use as post image — choose from: "/" | "/cars" | "/rankings" | "/cars/compare"`;

    async function tryGemini(): Promise<string | null> {
      if (!process.env.GEMINI_API_KEY) return null;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: SYSTEM_PROMPT }] }], generationConfig: { temperature: 0.8 } }) }
        );
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      } catch { return null; }
    }

    async function tryGroq(): Promise<string | null> {
      if (!process.env.GROQ_API_KEY) return null;
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: SYSTEM_PROMPT }], temperature: 0.8 }),
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? null;
      } catch { return null; }
    }

    const raw = (await tryGemini()) ?? (await tryGroq());
    if (!raw) return NextResponse.json({ error: 'All AI providers failed' }, { status: 500 });

    let parsed: { content_he: string; hashtags: string; screenshot_path: string };
    try {
      parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      return NextResponse.json({ error: 'AI parse error', raw }, { status: 500 });
    }

    const post = {
      platform: 'all' as const,
      content_he: parsed.content_he,
      content_en: '',
      hashtags: parsed.hashtags,
      scheduled_for: new Date().toISOString(),
      status: 'pending' as const,
      metadata: { postType: 'custom', screenshot_path: parsed.screenshot_path },
    };

    const { data, error } = await sb.from('social_posts').insert(post).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, post: { ...post, id: data.id }, screenshot_path: parsed.screenshot_path });
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

  if (action === 'reset_post') {
    const { id } = body;
    const { data: post } = await sb.from('social_posts').select('metadata').eq('id', id).single();
    const meta = (post?.metadata ?? {}) as Record<string, unknown>;
    // Strip all publish-related fields, keep postType / carSlug / screenshot_path
    const { published_at: _pa, instagram: _ig, facebook: _fb, instagram_story: _igs, facebook_story: _fbs,
            instagram_error: _ige, facebook_error: _fbe, instagram_story_error: _igse, facebook_story_error: _fbse,
            ig_post_id: _igid, ig_permalink: _igpl, ig_media_url: _igmu, fb_post_id: _fbid, fb_post_url: _fburl,
            ...cleanMeta } = meta;
    const { error } = await sb.from('social_posts').update({ status: 'pending', metadata: cleanMeta }).eq('id', id);
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

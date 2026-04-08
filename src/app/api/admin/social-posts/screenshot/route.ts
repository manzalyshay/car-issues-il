import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, getServiceClient } from '@/lib/adminAuth';

export const maxDuration = 45;
export const dynamic = 'force-dynamic';

async function launchBrowser() {
  if (process.env.NODE_ENV === 'development') {
    const { chromium } = await import('playwright-core');
    return chromium.launch({ channel: 'chrome', headless: true });
  }
  const chromiumMin = (await import('@sparticuz/chromium-min')).default;
  const { chromium } = await import('playwright-core');
  const executablePath = await chromiumMin.executablePath(
    process.env.CHROMIUM_REMOTE_EXEC_PATH ??
    'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar'
  );
  return chromium.launch({
    args: chromiumMin.args,
    executablePath,
    headless: true,
  });
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { postId } = body;
  let path: string = body.path ?? '';

  // If no path given, infer from the post's metadata + postType
  if (!path && postId) {
    const sb = getServiceClient();
    const { data: post } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
    const meta = post?.metadata as Record<string, unknown> | null;
    const postType = meta?.postType as string | undefined;

    if (postType === 'top_rated') path = '/api/og/top-ranked';
    else if (postType === 'most_reviewed') path = '/api/og/top-ranked';
    else if (postType === 'worst_rated' && meta?.carSlug) path = `/api/og/ai-review/${meta.carSlug}`;
    else if (postType === 'new_review' && meta?.carSlug) path = `/api/og/ai-review/${meta.carSlug}`;
    else if (postType === 'car_3d_summary' && meta?.carSlug) path = `/api/og/car-3d/${meta.carSlug}`;
    else if (postType === 'comparison' && typeof meta?.compareUrl === 'string') path = meta.compareUrl;
    else if (meta?.carSlug) path = `/api/og/ai-review/${meta.carSlug}`;
    else path = '/api/og/top-ranked';
  }

  if (!path) path = '/';

  // Build full URL — prefer explicit env var, fall back to request host
  const origin = process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `${req.nextUrl.protocol}//${req.nextUrl.host}`);
  const targetUrl = `${origin}${path}`;

  // Special handling for FB cover — just capture at exact dimensions, no story needed
  if (path === '/api/og/fb-cover') {
    const browser = await launchBrowser();
    let coverBuffer: Buffer;
    try {
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1640, height: 624 });
      await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(800);
      coverBuffer = Buffer.from(await page.screenshot({ type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: 1640, height: 624 } }));
    } finally {
      await browser.close();
    }
    const sb = getServiceClient();
    const filename = `fb-cover-${Date.now()}.jpg`;
    const { error } = await sb.storage.from('social-screenshots').upload(filename, coverBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: { publicUrl } } = sb.storage.from('social-screenshots').getPublicUrl(filename);
    return NextResponse.json({ ok: true, url: publicUrl });
  }

  const hideCookies = `
    [class*="cookie"], [class*="Cookie"], [id*="cookie"], [id*="Cookie"],
    [class*="chat"], [class*="Chat"], [id*="chat"], [id*="Chat"],
    [class*="gdpr"], [class*="GDPR"] { display: none !important; }
  `;

  // Build the story URL — use dedicated 9:16 story template if path is a car OG
  // e.g. /api/og/car-3d/subaru/outback  → /api/og/story/subaru/outback
  //      /api/og/ai-review/toyota/camry → /api/og/story/toyota/camry
  const carSlugMatch = path.match(/\/api\/og\/(?:car-3d|ai-review)\/(.+)/);
  const storyTargetUrl = carSlugMatch
    ? `${origin}/api/og/story/${carSlugMatch[1]}`
    : targetUrl;

  const browser = await launchBrowser();
  let feedBuffer: Buffer = Buffer.alloc(0);
  let storyBuffer: Buffer = Buffer.alloc(0);
  try {
    const page = await browser.newPage();
    await page.addStyleTag({ content: hideCookies });

    // ── Feed: 1200×630 ───────────────────────────────────────────────────────
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    feedBuffer = Buffer.from(await page.screenshot({ type: 'jpeg', quality: 92 }));

    // ── Story: dedicated 1080×1920 template ─────────────────────────────────
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.goto(storyTargetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    storyBuffer = Buffer.from(await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1920 } }));
  } finally {
    await browser.close();
  }

  // Upload both to Supabase Storage
  const sb = getServiceClient();
  const ts = Date.now();
  const slug = path.replace(/[^a-zA-Z0-9]/g, '_');
  const feedFilename = `${ts}${slug}.jpg`;
  const storyFilename = `${ts}${slug}_story.jpg`;

  const { error: uploadError } = await sb.storage
    .from('social-screenshots')
    .upload(feedFilename, feedBuffer, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: storyUploadError } = await sb.storage
    .from('social-screenshots')
    .upload(storyFilename, storyBuffer, { contentType: 'image/jpeg', upsert: false });

  const { data: { publicUrl } } = sb.storage.from('social-screenshots').getPublicUrl(feedFilename);
  const storyUrl = storyUploadError ? null : sb.storage.from('social-screenshots').getPublicUrl(storyFilename).data.publicUrl;

  // Attach both URLs to the post metadata
  if (postId) {
    const { data: existing } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
    await sb.from('social_posts').update({
      metadata: { ...(existing?.metadata ?? {}), image_url: publicUrl, story_image_url: storyUrl },
    }).eq('id', postId);
  }

  return NextResponse.json({ ok: true, url: publicUrl, storyUrl });
}

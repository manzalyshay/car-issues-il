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

  const browser = await launchBrowser();
  let screenshotBuffer: Buffer;
  try {
    const page = await browser.newPage();
    // 1080×1080 square — fits Instagram feed (1:1) and avoids landscape letterboxing.
    // The OG template renders at 1200px wide; we scale it to fit 1080px then pad
    // the remaining height with the same dark background.
    await page.setViewportSize({ width: 1080, height: 1080 });
    // Hide cookie banners, chat widgets, etc.
    await page.addStyleTag({ content: `
      [class*="cookie"], [class*="Cookie"], [id*="cookie"], [id*="Cookie"],
      [class*="chat"], [class*="Chat"], [id*="chat"], [id*="Chat"],
      [class*="gdpr"], [class*="GDPR"] { display: none !important; }
      html { background: #0a0b0f !important; }
      body { transform-origin: top left; transform: scale(0.9); }
    ` });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800); // let animations settle
    screenshotBuffer = Buffer.from(await page.screenshot({ type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1080, height: 1080 } }));
  } finally {
    await browser.close();
  }

  // Upload to Supabase Storage
  const sb = getServiceClient();
  const filename = `${Date.now()}${path.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;

  const { error: uploadError } = await sb.storage
    .from('social-screenshots')
    .upload(filename, screenshotBuffer, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = sb.storage.from('social-screenshots').getPublicUrl(filename);

  // Attach image URL to the post metadata if postId was given
  if (postId) {
    const { data: existing } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
    await sb.from('social_posts').update({
      metadata: { ...(existing?.metadata ?? {}), image_url: publicUrl },
    }).eq('id', postId);
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}

/**
 * Records a 10-second video of the spinning 3D car reel template.
 * Requires: MAKE_SLUG, MODEL_SLUG, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: POST_ID (updates social post metadata), SITE_URL (default: https://carissues.co.il)
 *
 * Needs on the runner: playwright chromium + ffmpeg
 *   npx playwright install chromium --with-deps
 *   (ffmpeg is pre-installed on ubuntu-latest GitHub Actions runners)
 */
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const makeSlug  = process.env.MAKE_SLUG;
const modelSlug = process.env.MODEL_SLUG;
const postId    = process.env.POST_ID || null;
const siteUrl   = process.env.SITE_URL ?? 'https://carissues.co.il';

if (!makeSlug || !modelSlug) {
  console.error('MAKE_SLUG and MODEL_SLUG env vars are required');
  process.exit(1);
}

const reelUrl = `${siteUrl}/api/og/reel/${makeSlug}/${modelSlug}`;
const tmpDir  = join(tmpdir(), 'car-reels');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

const mp4Path = join(tmpDir, `${makeSlug}_${modelSlug}.mp4`);

console.log(`\n🎬 Recording reel: ${makeSlug}/${modelSlug}`);
console.log(`   URL: ${reelUrl}`);

// ── Launch browser ────────────────────────────────────────────────────────────
// Always use local SwiftShader — Browserless (connectOverCDP) drops the CDP
// Screencast stream mid-recording, causing exit code 13 crashes. SwiftShader
// renders at ~5fps which minterpolate then smooths to 30fps in the ffmpeg step.
console.log('   Launching SwiftShader browser...');
const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-webgpu',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ],
});

const context = await browser.newContext({
  recordVideo: {
    dir: tmpDir,
    size: { width: 1080, height: 1920 },
  },
});

const page = await context.newPage();
await page.setViewportSize({ width: 1080, height: 1920 });

console.log('   Loading page...');
// Use 'load' not 'networkidle' — Sketchfab iframe streams 3D assets continuously
// so networkidle is never reached. 'load' fires once the HTML + fonts are ready.
await page.goto(reelUrl, { waitUntil: 'load', timeout: 60000 });

// Wait for Sketchfab to load the 3D model.
console.log('   Waiting for 3D model to load (16s)...');
await page.waitForTimeout(16000);

// Click to give the viewer user-activation (needed for input events).
await page.mouse.click(540, 700);
await page.waitForTimeout(400);

// Scroll to zoom out so the whole car is visible.
console.log('   Zooming out...');
for (let i = 0; i < 15; i++) {
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(800);

// Rotate the model via slow drag. SwiftShader renders at ~5fps, so we drag
// very slowly (24s for ~640px) so each rendered frame shows minimal angle change.
// Small per-frame delta = smooth-looking motion even at low render rate.
console.log('   Rotating model via mouse drag (24s)...');
const DRAG_START_X = 860;
const DRAG_END_X   = 220;
const DRAG_Y       = 700;
const DRAG_STEPS   = 400; // one step every 60ms → 24s total

await page.mouse.move(DRAG_START_X, DRAG_Y);
await page.mouse.down({ button: 'left' });
for (let i = 0; i <= DRAG_STEPS; i++) {
  await page.mouse.move(
    DRAG_START_X + (DRAG_END_X - DRAG_START_X) * (i / DRAG_STEPS),
    DRAG_Y,
  );
  await page.waitForTimeout(Math.round(24000 / DRAG_STEPS));
}
await page.mouse.up({ button: 'left' });

// Grab the path BEFORE closing (closing finalises the file)
const videoPathRaw = await page.video()?.path();
await context.close();
await browser.close();

// Playwright writes the webm to tmpDir with an auto-generated name
// Find it — either use the path returned above, or scan the dir
let webmPath = videoPathRaw;
if (!webmPath || !existsSync(webmPath)) {
  const files = readdirSync(tmpDir).filter(f => f.endsWith('.webm'));
  if (!files.length) { console.error('No .webm file found in', tmpDir); process.exit(1); }
  // Take the most recently modified
  webmPath = join(tmpDir, files.sort((a, b) => {
    const at = readdirSync(tmpDir).indexOf(a);
    const bt = readdirSync(tmpDir).indexOf(b);
    return bt - at;
  })[0]);
}

console.log(`   Raw video: ${webmPath}`);

// ── Convert WebM → MP4 (H.264) ────────────────────────────────────────────────
console.log('   Converting to MP4...');
// Timeline: 0–16s load, 16–17s click+zoom, 17–41s drag rotation.
// -ss 22: skip load + zoom-out phase, start mid-drag where rotation is smooth.
// -t 10:  capture 10s of clean rotating motion.
// minterpolate blend: interpolates between ~5fps SwiftShader frames to produce
// smooth 30fps output. 'blend' mode is fast and works well for slow rotation
// where per-frame movement is small (~5px).
execFileSync('ffmpeg', [
  '-y',
  '-i', webmPath,
  '-ss', '22',
  '-t', '10',
  '-vf', "minterpolate='mi_mode=blend:fps=30'",
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-an',              // no audio
  mp4Path,
], { stdio: 'inherit' });

console.log(`   MP4: ${mp4Path}`);

// ── Upload to Supabase Storage ────────────────────────────────────────────────
console.log('   Uploading to Supabase...');
const mp4Buffer = readFileSync(mp4Path);
const filename  = `reels/${makeSlug}_${modelSlug}.mp4`;

const { error: uploadError } = await sb.storage
  .from('social-screenshots')
  .upload(filename, mp4Buffer, { contentType: 'video/mp4', upsert: true });

if (uploadError) { console.error('Upload error:', uploadError.message); process.exit(1); }

const { data: { publicUrl } } = sb.storage.from('social-screenshots').getPublicUrl(filename);
console.log(`   Public URL: ${publicUrl}`);

// ── Update car_3d_models ──────────────────────────────────────────────────────
await sb.from('car_3d_models')
  .update({ reel_url: publicUrl })
  .eq('make_slug', makeSlug)
  .eq('model_slug', modelSlug);

// ── Update social post with reel URL ─────────────────────────────────────────
if (postId) {
  const { data: post } = await sb.from('social_posts').select('metadata').eq('id', postId).single();
  const meta = (post?.metadata ?? {});
  const { error: updErr } = await sb.from('social_posts')
    .update({ metadata: { ...meta, reel_url: publicUrl, reel_status: 'ready' } })
    .eq('id', postId);
  if (updErr) console.warn(`   Could not update post ${postId}:`, updErr.message);
  else console.log(`   Updated social_posts row ${postId} with reel_url`);
}

console.log(`\n✅ Done! Reel URL:\n   ${publicUrl}\n`);

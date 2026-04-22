/**
 * Records a 10-second video of the spinning 3D car reel template.
 * Requires: MAKE_SLUG, MODEL_SLUG, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: POST_ID (updates social post metadata), SITE_URL (default: https://carissues.co.il)
 *           BROWSERLESS_TOKEN (use Browserless cloud Chrome instead of local SwiftShader)
 *
 * Without BROWSERLESS_TOKEN: needs playwright chromium + ffmpeg on the runner
 *   npx playwright install chromium --with-deps
 * With BROWSERLESS_TOKEN: no local browser needed, just ffmpeg
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
const browserlessToken = process.env.BROWSERLESS_TOKEN;
let browser;

if (browserlessToken) {
  // Browserless cloud Chrome — GPU-accelerated, no SwiftShader lag
  console.log('   Using Browserless cloud browser...');
  browser = await chromium.connectOverCDP(
    `wss://chrome.browserless.io?token=${browserlessToken}&--disable-background-timer-throttling=true&--disable-backgrounding-occluded-windows=true`
  );
} else {
  // Local SwiftShader fallback (slow but works without a token)
  console.log('   Using local SwiftShader browser (set BROWSERLESS_TOKEN for better quality)...');
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
}

const context = await browser.newContext({
  recordVideo: {
    dir: tmpDir,
    size: { width: 1080, height: 1920 },
  },
});

const page = await context.newPage();
await page.setViewportSize({ width: 1080, height: 1920 });

console.log('   Loading page...');
await page.goto(reelUrl, { waitUntil: 'load', timeout: 60000 });

// Wait for Sketchfab iframe to load.
// SwiftShader renders at ~5fps so allow 25s for the model to appear.
console.log('   Waiting for 3D model to load (25s)...');
await page.waitForTimeout(25000);

// Debug: screenshot to verify what's actually on screen
const debugPath = mp4Path.replace('.mp4', '_debug.png');
await page.screenshot({ path: debugPath, fullPage: false });
console.log(`   Debug screenshot: ${debugPath}`);

// Sketchfab autospin requires user interaction to activate.
// Simulate a click in the center of the 3D viewport to unlock it.
console.log('   Simulating user click to activate autospin...');
await page.mouse.click(540, 600);
await page.waitForTimeout(500);
await page.mouse.click(540, 600);

console.log('   Recording rotation (15s)...');
await page.waitForTimeout(15000);

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
// Timeline: 0–25s model load, ~26s click unlocks autospin, 26–41s clean rotation.
// -ss 27: skip load phase + click moment
// -t 12:  capture 12s of clean rotation
// minterpolate blend: smooth 30fps output from ~5fps SwiftShader frames.
execFileSync('ffmpeg', [
  '-y',
  '-i', webmPath,
  '-ss', '27',
  '-t', '12',
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

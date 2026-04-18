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

// ── Launch browser with software WebGL (SwiftShader) ──────────────────────────
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
console.log('   Waiting for 3D model to load (20s)...');
await page.waitForTimeout(20000);

// Click OUTSIDE the iframe (on the page background) to give user-activation
// without disturbing the Sketchfab view. This enables autospin.
await page.mouse.click(540, 60);   // top of page, outside iframe
await page.waitForTimeout(500);

// Click on the iframe center to ensure autospin activates inside it.
await page.mouse.click(540, 700);
await page.waitForTimeout(500);

// Scroll to zoom out — wheel events on the outer page still reach the iframe.
console.log('   Zooming out...');
for (let i = 0; i < 15; i++) {
  await page.mouse.move(540, 700);
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1500);

// Let autospin run. autospin=0.07 = 0.07 rev/s = 4.3°/s.
// At SwiftShader ~5fps, that's only ~0.86° per rendered frame — nearly invisible jump.
// This is far smoother than manual drag (which produced ~7° per frame).
// We record 15s of autospin; ffmpeg will take the middle 10s.
console.log('   Recording autospin (15s)...');
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
// Timeline: 0–20s model load, ~21s zooms (15×120ms + 1.5s = ~3.3s), ~24.3s autospin starts.
// -ss 26: skip load + zoom + 2s autospin ramp-up to avoid initial camera jitter
// -t 10:  capture 10s of clean autospin
// minterpolate blend: smooth 30fps output from ~5fps SwiftShader frames.
//   'blend' mode is fast and produces acceptable smoothing for slow rotation.
execFileSync('ffmpeg', [
  '-y',
  '-i', webmPath,
  '-ss', '26',
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

// ── Clean up social post (optional) ──────────────────────────────────────────
// The reel URL is permanently stored in car_3d_models.reel_url above.
// The social_posts row was only needed to track the recording job — delete it
// now to save space. Anyone wanting to display the reel uses car_3d_models.
if (postId) {
  const { error: delErr } = await sb.from('social_posts').delete().eq('id', postId);
  if (delErr) console.warn(`   Could not delete post ${postId}:`, delErr.message);
  else console.log(`   Deleted social_posts row ${postId} (reel URL saved in car_3d_models)`);
}

console.log(`\n✅ Done! Reel URL:\n   ${publicUrl}\n`);

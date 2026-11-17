/**
 * Shared helpers for `next/og` ImageResponse images that must run on Cloudflare Workers.
 *
 * Why these exist: @vercel/og only bundles a Latin font. Any other glyph (Hebrew, ★, emoji)
 * makes it fetch a font from Google Fonts while rendering; on Workers that fetch returns 400
 * and the image stream never finishes, so the Worker is killed with error 1101. Passing our
 * own fonts (public/fonts, Hebrew + Latin) avoids that fetch entirely.
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';

type FontWeight = 400 | 800;
export interface OgFont { name: string; data: ArrayBuffer; weight: FontWeight; style: 'normal' }

const FONT_FILES: { file: string; weight: FontWeight }[] = [
  { file: 'Heebo-Regular.ttf', weight: 400 },
  { file: 'Heebo-ExtraBold.ttf', weight: 800 },
];

let fontsPromise: Promise<OgFont[]> | null = null;

async function readPublicFile(path: string): Promise<ArrayBuffer> {
  // Production (Workers): static files are served by the ASSETS binding.
  try {
    const { env } = await getCloudflareContext({ async: true });
    const assets = (env as unknown as { ASSETS?: { fetch: (u: string) => Promise<Response> } }).ASSETS;
    if (assets) {
      const res = await assets.fetch(`https://assets.local${path}`);
      if (res.ok) return await res.arrayBuffer();
    }
  } catch { /* not on Workers - fall through */ }
  // `next dev` / Node: read straight from public/.
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const buf = await readFile(join(process.cwd(), 'public', path));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Heebo 400/800 (covers Hebrew + Latin + digits). Cached per isolate. */
export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ file, weight }) => ({
      name: 'Heebo',
      data: await readPublicFile(`/fonts/${file}`),
      weight,
      style: 'normal' as const,
    })),
  ).catch(err => { fontsPromise = null; throw err; });
  return fontsPromise;
}

/**
 * Fetch a remote image and return it as a data URL, or null on any failure.
 * Done up front (not via <img src=url>) so we can send a User-Agent - Wikimedia, where most
 * car photos live, rejects anonymous requests - and so a slow/broken image can't stall the render.
 */
export async function fetchImageDataUrl(url: string | null | undefined, timeoutMs = 4000): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CarIssuesBot/1.0 (+https://carissues.co.il)', Accept: 'image/jpeg,image/png,image/*' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    // Satori decodes PNG/JPEG/GIF/SVG only (no WebP/AVIF).
    if (!/^image\/(png|jpe?g|gif|svg\+xml)$/.test(type)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

const HEBREW = /[֐-׿]/;

/**
 * Satori lays text out left-to-right only. Convert a logical Hebrew string into visual order:
 * reverse the word order and the letters of Hebrew words, leaving Latin/number tokens
 * (e.g. "CX-5") as they are. Good enough for short single-line labels like car names.
 */
export function rtlVisual(text: string): string {
  if (!HEBREW.test(text)) return text;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map(w => (HEBREW.test(w) ? [...w].reverse().join('') : w))
    .join(' ');
}

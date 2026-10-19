/**
 * Fetch Wikimedia Commons images for a car model and insert into D1.
 * Runs inside the Worker so it can reach Wikimedia without IP restrictions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { dbAll, dbRun } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface WikiSearch {
  query?: { search?: Array<{ title: string }> };
}
interface WikiImageInfo {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{
        url?: string;
        thumburl?: string;
        width?: number;
        height?: number;
        extmetadata?: {
          Artist?: { value?: string };
          LicenseShortName?: { value?: string };
        };
      }>;
    }>;
  };
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { makeSlug, modelSlug, query, year } = await req.json() as {
    makeSlug: string; modelSlug: string; query?: string; year?: number;
  };
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'Missing makeSlug/modelSlug' }, { status: 400 });

  const searchQuery = query ?? (year ? `${makeSlug} ${modelSlug} ${year}` : `${makeSlug} ${modelSlug}`);

  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&srlimit=12&format=json`;
  const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'CarIssuesBot/1.0 (carissues.co.il)' } });
  const searchData = await searchRes.json() as WikiSearch;
  const hits = searchData?.query?.search ?? [];

  let inserted = 0;
  const errors: string[] = [];

  for (const hit of hits) {
    const title = hit.title;
    if (!title.match(/\.(jpe?g|png|webp)$/i)) continue;

    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=800&format=json`;
    try {
      const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': 'CarIssuesBot/1.0 (carissues.co.il)' } });
      const infoData = await infoRes.json() as WikiImageInfo;
      const pages = infoData?.query?.pages ?? {};
      for (const page of Object.values(pages)) {
        const ii = page.imageinfo?.[0];
        if (!ii?.url) continue;
        const w = ii.width ?? 0;
        const h = ii.height ?? 0;
        if (w < 400) continue;

        const artist = (ii.extmetadata?.Artist?.value ?? '').replace(/<[^>]*>/g, '').slice(0, 200);
        const license = (ii.extmetadata?.LicenseShortName?.value ?? '').slice(0, 100);

        await dbRun(
          `INSERT OR IGNORE INTO car_images (id, make_slug, model_slug, year, url, thumbnail_url, title, author, license, source, width, height)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'wikimedia', ?, ?)`,
          randomUUID(), makeSlug, modelSlug,
          year ?? null,
          ii.url, ii.thumburl ?? ii.url,
          title.replace(/^File:/, ''),
          artist, license, w, h,
        );
        inserted++;
      }
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message.slice(0, 80) : 'unknown');
    }
  }

  if (inserted > 0) {
    await dbRun(
      `UPDATE car_models SET leading_image_url = (
         SELECT url FROM car_images
         WHERE make_slug = car_models.make_slug AND model_slug = car_models.slug
         ORDER BY width DESC LIMIT 1
       )
       WHERE make_slug = ? AND slug = ? AND (leading_image_url IS NULL OR leading_image_url = '')`,
      makeSlug, modelSlug,
    );
  }

  const count = await dbAll<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM car_images WHERE make_slug = ? AND model_slug = ?',
    makeSlug, modelSlug,
  );

  return NextResponse.json({ inserted, total: count[0]?.cnt ?? 0, errors });
}

export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const makeSlug = searchParams.get('make');
  const modelSlug = searchParams.get('model');
  if (!makeSlug || !modelSlug) return NextResponse.json({ error: 'Missing make/model' }, { status: 400 });

  const rows = await dbAll<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM car_images WHERE make_slug = ? AND model_slug = ?',
    makeSlug, modelSlug,
  );
  return NextResponse.json({ make: makeSlug, model: modelSlug, count: rows[0]?.cnt ?? 0 });
}

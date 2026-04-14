import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getVideosForCar } from '@/lib/youtubeVideos';
import { getImagesForCar } from '@/lib/carImages';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';

export const dynamic = 'force-dynamic';

// Fetch year-specific images from Wikimedia on demand (not stored in DB)
const getYearImages = unstable_cache(
  async (makeEn: string, modelEn: string, year: number) => {
    const query = `${makeEn} ${modelEn} ${year}`;
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
    url.searchParams.set('gsrlimit', '20');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size|extmetadata');
    url.searchParams.set('iiurlwidth', '800');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');

    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'CarIssuesIL/1.0 (carissues.co.il)' },
        next: { revalidate: 86400 },
      });
      const data = await res.json();
      const pages = data?.query?.pages ?? {};
      const images = [];

      for (const page of Object.values(pages) as any[]) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (info.width && info.width < 400) continue;
        if (info.height && info.height < 200) continue;
        const mime = info.extmetadata?.MIMEType?.value ?? '';
        if (mime && !mime.startsWith('image/jpeg') && !mime.startsWith('image/png') && !mime.startsWith('image/webp')) continue;
        const title = (page.title ?? '').toLowerCase();
        if (/logo|badge|icon|emblem|coat|flag|sign|symbol|map/.test(title)) continue;

        images.push({
          id: page.pageid?.toString() ?? page.title,
          make_slug: '',
          model_slug: '',
          url: info.url,
          thumbnail_url: info.thumburl ?? info.url,
          title: info.extmetadata?.ObjectName?.value ?? page.title?.replace('File:', '') ?? '',
          author: (info.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 200),
          license: info.extmetadata?.LicenseShortName?.value ?? '',
          source: 'wikimedia',
          width: info.width ?? null,
          height: info.height ?? null,
        });
      }
      return images;
    } catch {
      return [];
    }
  },
  ['year-images'],
  { revalidate: 86400, tags: ['car-media'] },
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const makeSlug = searchParams.get('make');
  const modelSlug = searchParams.get('model');
  const type = searchParams.get('type');
  const yearParam = searchParams.get('year');

  if (!makeSlug || !modelSlug || !type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  if (type === 'videos') {
    const videos = await getVideosForCar(makeSlug, modelSlug);
    return NextResponse.json(videos);
  }

  if (type === 'images') {
    // Year page: fetch year-specific images from Wikimedia
    if (yearParam) {
      const year = parseInt(yearParam);
      const make = await getMakeBySlug(makeSlug);
      const model = make ? await getModelBySlug(makeSlug, modelSlug) : null;
      if (make && model) {
        const yearImgs = await getYearImages(make.nameEn, model.nameEn, year);
        // Fall back to general images if no year-specific ones found
        if (yearImgs.length > 0) return NextResponse.json(yearImgs);
      }
    }
    const images = await getImagesForCar(makeSlug, modelSlug);
    return NextResponse.json(images);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

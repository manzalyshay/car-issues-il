import { NextRequest, NextResponse } from 'next/server';
import { getVideosForCar } from '@/lib/youtubeVideos';
import { getImagesForCar, getImagesForYear } from '@/lib/carImages';

export const dynamic = 'force-dynamic';

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
    if (yearParam) {
      const images = await getImagesForYear(makeSlug, modelSlug, parseInt(yearParam));
      return NextResponse.json(images);
    }
    const images = await getImagesForCar(makeSlug, modelSlug);
    return NextResponse.json(images);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

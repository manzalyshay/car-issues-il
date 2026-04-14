import { NextRequest, NextResponse } from 'next/server';
import { getVideosForCar } from '@/lib/youtubeVideos';
import { getImagesForCar } from '@/lib/carImages';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const type = searchParams.get('type');

  if (!make || !model || !type) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  if (type === 'videos') {
    const videos = await getVideosForCar(make, model);
    return NextResponse.json(videos);
  }

  if (type === 'images') {
    const images = await getImagesForCar(make, model);
    return NextResponse.json(images);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';

export interface CarImage {
  id: string;
  make_slug: string;
  model_slug: string;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  author: string | null;
  license: string | null;
  source: string;
  width: number | null;
  height: number | null;
}

export const getImagesForCar = unstable_cache(
  async (makeSlug: string, modelSlug: string): Promise<CarImage[]> => {
    const sb = getServiceClient();
    const { data } = await sb
      .from('car_images')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .order('created_at', { ascending: true })
      .limit(20);
    return (data ?? []) as CarImage[];
  },
  ['car-images'],
  {
    revalidate: 86400, // 24h fallback
    tags: ['car-media'],
  },
);

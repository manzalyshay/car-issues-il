import { unstable_cache } from 'next/cache';
import { getServiceClient } from './adminAuth';

export interface CarImage {
  id: string;
  make_slug: string;
  model_slug: string;
  year: number | null;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  author: string | null;
  license: string | null;
  source: string;
  width: number | null;
  height: number | null;
  hidden: boolean | null;
  hidden_reason: string | null;
}

export const getImagesForCar = unstable_cache(
  async (makeSlug: string, modelSlug: string): Promise<CarImage[]> => {
    const sb = getServiceClient();
    const { data } = await sb
      .from('car_images')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .is('year', null)
      .not('hidden', 'is', true)
      .order('created_at', { ascending: true })
      .limit(20);
    return (data ?? []) as CarImage[];
  },
  ['car-images'],
  {
    revalidate: 86400,
    tags: ['car-media'],
  },
);

export const getImagesForYear = unstable_cache(
  async (makeSlug: string, modelSlug: string, year: number): Promise<CarImage[]> => {
    const sb = getServiceClient();
    // Try year-specific first
    const { data: yearData } = await sb
      .from('car_images')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .eq('year', year)
      .not('hidden', 'is', true)
      .order('created_at', { ascending: true })
      .limit(20);
    if (yearData && yearData.length > 0) return yearData as CarImage[];
    // Fall back to general images
    return getImagesForCar(makeSlug, modelSlug);
  },
  ['car-images-year'],
  {
    revalidate: 86400,
    tags: ['car-media'],
  },
);

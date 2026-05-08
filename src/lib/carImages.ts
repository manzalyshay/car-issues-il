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

// Reject images whose title explicitly mentions a year >5 years off from requested year.
// Prevents e.g. "1968 Toyota Corolla" appearing on a 2025 page.
function titleYearOk(title: string | null, requestedYear: number): boolean {
  if (!title) return true;
  const found = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/g);
  if (!found) return true;
  return found.some(y => Math.abs(parseInt(y) - requestedYear) <= 5);
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
  { revalidate: 86400, tags: ['car-media'] },
);

export const getImagesForYear = unstable_cache(
  async (makeSlug: string, modelSlug: string, year: number): Promise<CarImage[]> => {
    const sb = getServiceClient();
    // Fetch a wider window around the requested year (±3 years) to find the best match
    const { data: nearby } = await sb
      .from('car_images')
      .select('*')
      .eq('make_slug', makeSlug)
      .eq('model_slug', modelSlug)
      .gte('year', year - 3)
      .lte('year', year + 1)
      .not('hidden', 'is', true)
      .order('year', { ascending: false })
      .limit(20);

    const filtered = (nearby ?? []).filter(img => titleYearOk(img.title, year));
    if (filtered.length > 0) return filtered as CarImage[];

    // Fall back to general model images (year=null), applying same title filter
    const general = await getImagesForCar(makeSlug, modelSlug);
    return general.filter(img => titleYearOk(img.title, year));
  },
  ['car-images-year'],
  { revalidate: 86400, tags: ['car-media'] },
);

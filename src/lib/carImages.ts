import { dbAll } from './db';

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
function titleYearOk(title: string | null, requestedYear: number): boolean {
  if (!title) return true;
  const found = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/g);
  if (!found) return true;
  return found.some(y => Math.abs(parseInt(y) - requestedYear) <= 5);
}

export async function getImagesForCar(makeSlug: string, modelSlug: string): Promise<CarImage[]> {
  return dbAll<CarImage>(
    `SELECT * FROM car_images WHERE make_slug = ? AND model_slug = ? AND year IS NULL AND (hidden IS NULL OR hidden != 1) ORDER BY created_at ASC LIMIT 20`,
    makeSlug, modelSlug,
  );
}

export async function getImagesForYear(makeSlug: string, modelSlug: string, year: number): Promise<CarImage[]> {
  const nearby = await dbAll<CarImage>(
    `SELECT * FROM car_images WHERE make_slug = ? AND model_slug = ? AND year >= ? AND year <= ? AND (hidden IS NULL OR hidden != 1) ORDER BY year DESC LIMIT 20`,
    makeSlug, modelSlug, year - 3, year + 1,
  );
  const filtered = nearby.filter(img => titleYearOk(img.title, year));
  if (filtered.length > 0) return filtered;

  // Fall back to general model images (year=null)
  const general = await getImagesForCar(makeSlug, modelSlug);
  return general.filter(img => titleYearOk(img.title, year));
}

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

// Extract the most recent year mentioned in an image title
function extractTitleYear(title: string | null): number | null {
  if (!title) return null;
  const found = title.match(/\b(19[5-9]\d|20[0-3]\d)\b/g);
  if (!found) return null;
  return Math.max(...found.map(y => parseInt(y)));
}

export async function getImagesForCar(makeSlug: string, modelSlug: string): Promise<CarImage[]> {
  // Only show images from the last 10 years (year column) + null-year images.
  // For null-year images, extract year from title and reject if > 10 years old.
  const cutoff = new Date().getFullYear() - 10;
  const rows = await dbAll<CarImage>(
    `SELECT * FROM car_images
     WHERE make_slug = ? AND model_slug = ?
       AND (year IS NULL OR year >= ?)
       AND (hidden IS NULL OR hidden != 1)
     ORDER BY year DESC NULLS LAST, created_at ASC
     LIMIT 40`,
    makeSlug, modelSlug, cutoff,
  );
  // Filter null-year rows whose title reveals an old year
  const images = rows
    .filter(img => {
      if (img.year !== null) return true;
      const titleYear = extractTitleYear(img.title);
      return titleYear === null || titleYear >= cutoff;
    });

  if (makeSlug === 'mini' && modelSlug === 'mini-electric') {
    // The D1 image set for this model accidentally includes Honda e,
    // Countryman, and concept-car photos. Keep production Cooper SE images.
    const miniElectricImages = images.filter(img =>
      /electric|cooper\s+se/i.test(img.title ?? '') &&
      !/countryman|honda\s+e|concept/i.test(img.title ?? ''),
    );
    const leadImageRank = (img: CarImage) => {
      const title = img.title ?? '';
      if (/mini hatch \(f56\) electric img 2679/i.test(title)) return 0;
      if (/mini cooper se electric/i.test(title)) return 1;
      if (/mini hatch \(f56\) electric at iaa 2019/i.test(title)) return 2;
      if (/mini hatch \(f56\) electric/i.test(title)) return 3;
      return 4;
    };
    miniElectricImages.sort((a, b) => leadImageRank(a) - leadImageRank(b));
    return miniElectricImages.slice(0, 20);
  }

  return images.slice(0, 20);
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

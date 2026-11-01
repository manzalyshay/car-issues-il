import { dbAll } from './db';
import { sizedImageUrl, scaledHeight, snapToThumbnailStep } from './imageSizing';

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
  is_main: number | null;
  // Hebrew caption; falls back to `title` when absent.
  title_he?: string | null;
  source_url: string | null;
}

// Exclude clearly misassigned lead/gallery images found during the catalog audit.
// Keep these rules title-based so they apply consistently to model and year pages.
const MISASSIGNED_IMAGE_TITLES: Record<string, RegExp[]> = {
  'audi/q4-etron': [/\bAudi\s+e-tron\b/i],
  'bmw/series1': [/\bBMW\s+5[ -]?Series\b/i],
  'bmw/series3': [/\b5\s*series\b/i],
  'byd/atto3': [/\bBYD\s+Seal\b/i],
  'chevrolet/spark': [/\bChery\s+Eastar\b/i],
  'fiat/doblo': [/\bJeep\s+Renegade\b/i],
  'jeep/renegade': [/\bMitsubishi\s+Pajero\s+Sport\b/i],
  'lexus/is': [/\bRZ\b/i],
  'maxus/edeliver9': [/\be[ -]?deliver\s*7\b/i],
  'mazda/cx3': [/\bCX[ -]?5\b/i],
  'mazda/cx5': [/\bCX[ -]?30\b/i],
  'mazda/cx30': [/\bCX[ -]?5\b/i],
  'mercedes/a-class': [/\b(?:C|V|E|S)[ -]?Class\b/i],
  'mercedes/b-class': [/\b(?:C|E|S|V)[ -]?Class\b/i, /\bC[ -]?Klasse\b/i],
  'mercedes/g-class': [/\bC\s?220\b/i, /\bC[ -]?Class\b/i],
  'mercedes/glc': [/\bGLA[ -]?Class\b/i],
  'mercedes/ml-class': [/\bGLE[ -]?Class\s+timeline\b/i],
  'mercedes/v-class': [/\bW206\b/i, /\bC[ -]?Class\b/i],
  'mitsubishi/asx': [/\bOutlander\b/i, /\bSpace\s+Star\b/i],
  'mitsubishi/eclipse-cross': [/\bRenault\s+Scenic\b/i],
  'nissan/note': [/\bQashqai\b/i],
  'opel/mokka': [/\bAstra\b/i],
  'peugeot/3008': [/\b5008\b/i],
  'skoda/karoq': [/\bKodiaq\b/i],
  'tesla/model-s': [/\bModel\s*3\b/i],
  'tesla/model-x': [/\bModel\s*3\b/i],
  // Corolla Cross is a separate SUV model, not a sedan trim - confirmed by
  // visually opening the flagged files (raised ride height, black cladding).
  'toyota/corolla': [/\bCorolla\s+Cross\b/i],
  'volkswagen/id4': [/\bID[ .-]?[35]\b/i],
  'volkswagen/id5': [/\bID[ .-]?[34]\b/i],
  'hyundai/ioniq-6': [/\bIONIQ\s*5\b/i],
  'hyundai/ioniq-9': [/\bIONIQ\s*5\b/i],
  'omoda/omoda9': [/\bOmoda\s+C7\b/i],
};

// Title-text signals for interior/part/detail shots - never disqualifying (they
// stay in the gallery for the Photos tab), only demoted from the main/hero/OG
// position, which must be a same-model, same-generation exterior. Kept as a
// title-pattern check, the same established idiom as isUnsuitableImage below,
// rather than inventing a second classification mechanism.
// "seats" (not the singular "seat", which collides with the SEAT brand name).
const INTERIOR_OR_PART_TITLE = /\b(interior|dashboard|cockpit|console|engine|seats|headlight|taillight|wheel\s*rim|badge|logo|emblem|trunk|boot|steering\s*wheel)\b/i;

function isMainEligible(title: string | null): boolean {
  if (!title) return true;
  return !INTERIOR_OR_PART_TITLE.test(title);
}

/**
 * Puts eligible (exterior) images first so index 0 - the hero/OG/card pick -
 * is always one of them, then caps the result WITHOUT letting that cap push
 * demoted interior/part photos out of the array entirely: eligible images get
 * up to mainCap slots, demoted ones get their own separate demotedBudget on
 * top, so they stay visible in the Photos tab even when a model has 20+
 * exteriors already filling the main cap. If nothing is eligible, order and
 * cap are left as a plain slice (fail closed to the existing neutral fallback
 * rather than guessing).
 */
function withMainEligibleFirst(images: CarImage[], mainCap = 20, demotedBudget = 10): CarImage[] {
  const eligible = images.filter(img => isMainEligible(img.title));
  const demoted = images.filter(img => !isMainEligible(img.title));
  if (eligible.length === 0) return images.slice(0, mainCap);
  return [...eligible.slice(0, mainCap), ...demoted.slice(0, demotedBudget)];
}

function isUnsuitableImage(makeSlug: string, modelSlug: string, title: string | null): boolean {
  if (!title) return false;
  // These are law-enforcement vehicles rather than ordinary consumer examples.
  if (/\b(?:police|polizia|polizei|carabinieri)\b/i.test(title)) return true;
  return (MISASSIGNED_IMAGE_TITLES[`${makeSlug}/${modelSlug}`] ?? []).some(pattern => pattern.test(title));
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
  // Exception: if NONE of a model's images are within that window (the whole
  // model is discontinued/historic), the cutoff would empty the gallery for no
  // benefit, so it's skipped entirely in that case.
  const cutoff = new Date().getFullYear() - 10;
  const rows = await dbAll<CarImage>(
    `SELECT * FROM car_images
     WHERE make_slug = ? AND model_slug = ?
       AND (hidden IS NULL OR hidden != 1)
     ORDER BY is_main DESC, year DESC NULLS LAST, created_at ASC
     LIMIT 60`,
    makeSlug, modelSlug,
  );
  const suitable = rows.filter(img => !isUnsuitableImage(makeSlug, modelSlug, img.title));
  const isRecent = (img: CarImage) => {
    if (img.year !== null) return img.year >= cutoff;
    const titleYear = extractTitleYear(img.title);
    return titleYear === null || titleYear >= cutoff;
  };
  const hasRecentImage = suitable.some(isRecent);
  const images = hasRecentImage ? suitable.filter(isRecent) : suitable;

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
    return withMainEligibleFirst(miniElectricImages);
  }

  return withMainEligibleFirst(images);
}

export async function getImagesForYear(makeSlug: string, modelSlug: string, year: number): Promise<CarImage[]> {
  const nearby = await dbAll<CarImage>(
    `SELECT * FROM car_images WHERE make_slug = ? AND model_slug = ? AND year >= ? AND year <= ? AND (hidden IS NULL OR hidden != 1) ORDER BY is_main DESC, year DESC LIMIT 20`,
    makeSlug, modelSlug, year - 3, year + 1,
  );
  const filtered = nearby.filter(img =>
    !isUnsuitableImage(makeSlug, modelSlug, img.title) && titleYearOk(img.title, year),
  );
  if (filtered.length > 0) return withMainEligibleFirst(filtered);

  // Fall back to general model images (year=null) - already main-eligible-first
  // from getImagesForCar, re-applied here since the year filter can change which
  // images remain.
  const general = await getImagesForCar(makeSlug, modelSlug);
  return withMainEligibleFirst(general.filter(img => titleYearOk(img.title, year)));
}

export interface OgImage { url: string; width: number; height: number }

/**
 * Resolves the og:image for a model (or year) page from the exact same photo
 * the page itself shows as its default (getImagesForCar/getImagesForYear's
 * first result) - never car_models.leading_image_url, which is a separate,
 * independently-set field that can drift out of sync with the real default.
 * Sized to OG_WIDTH with accurate width/height declared (Commons preserves
 * aspect ratio), instead of a fixed 1200x630 that doesn't match what's served.
 */
const OG_WIDTH = 1200;

export async function getOgImage(makeSlug: string, modelSlug: string, year?: number): Promise<OgImage | null> {
  const images = year
    ? await getImagesForYear(makeSlug, modelSlug, year).catch(() => [])
    : await getImagesForCar(makeSlug, modelSlug).catch(() => []);
  const img = images[0];
  if (!img) return null;
  const actualWidth = snapToThumbnailStep(OG_WIDTH);
  const url = sizedImageUrl(img.thumbnail_url ?? img.url, OG_WIDTH) ?? img.url;
  const height = (img.width && img.height) ? scaledHeight(img.width, img.height, actualWidth) : 630;
  return { url, width: actualWidth, height };
}

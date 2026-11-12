import type { Metadata } from 'next';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getReviewsForModel, getAverageRating } from '@/lib/reviewsDb';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getOgImage } from '@/lib/carImages';
import ModelPageView from './ModelPageView';

export const revalidate = 900; // cache 15 minutes

interface Props {
  params: Promise<{ make: string; model: string }>;
  searchParams: Promise<{ tab?: string }>;
}

/**
 * "<model> — חוות דעת, בעיות נפוצות ומחיר", kept to 60 characters where possible
 * (no "| CarIssues" suffix). "ומחיר" only when the model has an Israeli trim price.
 * If the full name pushes it over 60, the make is dropped from the front.
 */
function hebrewModelTitle(makeHe: string, modelHe: string, yearSuffix: string, hasPrice: boolean): string {
  const tail = hasPrice ? 'חוות דעת, בעיות נפוצות ומחיר' : 'חוות דעת ובעיות נפוצות';
  const full = `${makeHe} ${modelHe}${yearSuffix} — ${tail}`;
  if (full.length <= 60) return full;
  const short = `${modelHe}${yearSuffix} — ${tail}`;
  return short.length < full.length && modelHe.length >= 3 ? short : full;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make || !model) return {};
  const base = getBaseUrl(locale);
  const url = `${base}/cars/${make.slug}/${model.slug}`;
  const [avgRating, reviews, trims] = await Promise.all([
    getAverageRating(makeSlug, modelSlug).catch(() => null),
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
  ]);
  // min-max, not first/last: car_models.years is not always sorted newest-first.
  const yearRange = model.years.length > 1
    ? `${Math.min(...model.years)}-${Math.max(...model.years)}`
    : model.years.length === 1 ? `${model.years[0]}` : '';
  const yearSuffix = yearRange ? ` ${yearRange}` : '';
  // Same photo the page itself shows as its default (getImagesForCar's first
  // result) - not the separate, independently-set leading_image_url field,
  // which can drift out of sync with what's actually displayed.
  const ogImage = await getOgImage(makeSlug, modelSlug).catch(() => null);
  const ogImages = ogImage
    ? [{ url: ogImage.url, width: ogImage.width, height: ogImage.height }]
    : [{ url: '/og-default.png', width: 1200, height: 630 }];

  if (locale === 'en') {
    const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
    const reviewPart = reviews.length > 0
      ? `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
      : 'Reviews & Common Problems';
    return {
      title: `${make.nameEn} ${model.nameEn}${yearSuffix}: ${reviewPart} | Pros & Cons`,
      description: `${reviews.length > 0 ? `${reviews.length} real owner ${reviews.length === 1 ? 'review' : 'reviews'}` : 'Real owner reviews'} for the ${make.nameEn} ${model.nameEn}${yearRange ? ` (${yearRange})` : ''}${avgRating ? `. Average rating ${avgRating.toFixed(1)}/5` : ''}. Common problems, pros, cons and reliability from real car owners.`.slice(0, 160),
      alternates: { canonical: url, languages: { he: `https://carissues.co.il/cars/${make.slug}/${model.slug}`, en: url, 'x-default': url } },
      openGraph: {
        title: `${make.nameEn} ${model.nameEn}${ratingStr} | CarIssues`,
        description: `Owner reviews & common problems: ${make.nameEn} ${model.nameEn}${yearSuffix}`,
        url,
        images: ogImages,
      },
    };
  }

  const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
  const countStr = reviews.length > 0 ? ` · ${reviews.length} ביקורות` : '';
  const trimsWithPrice = trims.filter(t => t.priceIls);
  const minPrice = trimsWithPrice.length > 0 ? Math.min(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const maxPrice = trimsWithPrice.length > 0 ? Math.max(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const priceDesc = minPrice && maxPrice && minPrice !== maxPrice
    ? ` מחיר: ₪${Math.round(minPrice / 1000)}K-₪${Math.round(maxPrice / 1000)}K.`
    : minPrice ? ` מחיר מומלץ: ₪${minPrice.toLocaleString('he-IL')}.` : '';
  const trimNames = trims.slice(0, 6).map(t => t.name).join(', ');
  const trimDesc = trimNames ? ` גימורים: ${trimNames}${trims.length > 6 ? ' ועוד' : ''}.` : '';
  const recentYears = model.years.slice(0, 4).join(', ');
  return {
    title: { absolute: hebrewModelTitle(make.nameHe, model.nameHe, yearSuffix, minPrice != null) },
    description: `${reviews.length > 0 ? `${reviews.length} ביקורות אמיתיות` : 'ביקורות אמיתיות'} על ${make.nameHe} ${model.nameHe} (${make.nameEn} ${model.nameEn})${yearRange ? ` שנים ${yearRange}` : ''}${avgRating ? `. דירוג ממוצע ${avgRating.toFixed(1)}/5` : ''}.${priceDesc}${recentYears ? ` חוות דעת ${recentYears}.` : ''}${trimDesc} יתרונות, חסרונות ובעיות נפוצות מבעלי רכב בישראל.`.slice(0, 160),
    alternates: { canonical: url, languages: { he: url, en: `https://carissues.net/cars/${make.slug}/${model.slug}`, 'x-default': `https://carissues.net/cars/${make.slug}/${model.slug}` } },
    openGraph: {
      title: `${make.nameHe} ${model.nameHe}${ratingStr}${countStr} | CarIssues IL`,
      description: `ביקורות ובעיות נפוצות: ${make.nameHe} ${model.nameHe}${yearSuffix}`,
      url,
      images: ogImages,
    },
  };
}

export default async function ModelPage({ params, searchParams }: Props) {
  const [{ make: makeSlug, model: modelSlug }, { tab: initialTab }] = await Promise.all([params, searchParams]);
  return <ModelPageView makeSlug={makeSlug} modelSlug={modelSlug} initialTab={initialTab} />;
}

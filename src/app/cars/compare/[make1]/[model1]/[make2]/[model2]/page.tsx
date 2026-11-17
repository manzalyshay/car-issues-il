import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { getRecallsFromCache } from '@/lib/recallsDb';
import { compareSnippet } from '@/lib/compareFacts';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getComparePolicy } from '@/lib/seoIndexing';
import { RU_COMPARE_PATHS } from '@/data/ru-compare-pairs';
import ComparePageView from '@/components/compare/ComparePageView';

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make1, model1, make2, model2 } = await params;
  const [locale, mA, mB] = await Promise.all([getHostLocale(), getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) return {};
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) return {};
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const canonical = `${base}/cars/compare/${c1}/${c2}`;
  const nameA = isEn ? `${mA.nameEn} ${modA.nameEn}` : `${mA.nameHe} ${modA.nameHe}`;
  const nameB = isEn ? `${mB.nameEn} ${modB.nameEn}` : `${mB.nameHe} ${modB.nameHe}`;

  // Snippet = the page's own concrete differences (price, fuel, recalls), not star ratings
  // from one or two reviews (see lib/compareFacts). Same data the page body renders.
  const [reviewsA, reviewsB, trimsA, trimsB, recallsA, recallsB, indexable] = await Promise.all([
    getReviewsForModel(make1, model1).catch(() => []),
    getReviewsForModel(make2, model2).catch(() => []),
    getTrimSpecs(make1, model1).catch(() => []),
    getTrimSpecs(make2, model2).catch(() => []),
    getRecallsFromCache(mA.nameEn, modA.nameEn).catch(() => []),
    getRecallsFromCache(mB.nameEn, modB.nameEn).catch(() => []),
    // Pairs outside the sitemap are noindex (same rule, see lib/seoIndexing).
    // Fail open so a D1 error never caches a stray noindex.
    getComparePolicy().then(p => p.isIndexable(c1, c2)).catch(() => true),
  ]);
  const side = (name: string, trims: typeof trimsA, recalls: unknown[], reviews: { rating: number }[]) => ({
    name, trims, recalls: recalls.length, reviewCount: reviews.length,
    reviewAvg: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
  });

  const title = isEn
    ? `${nameA} vs ${nameB}: Which Is Better? (2026)`
    : `${nameA} מול ${nameB} - מי עדיף? השוואה 2026`;
  const description = compareSnippet(side(nameA, trimsA, recallsA, reviewsA), side(nameB, trimsB, recallsB, reviewsB), isEn);
  return {
    title,
    description,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        he: `https://carissues.co.il/cars/compare/${c1}/${c2}`,
        // Russian pilot page exists for the 50 pairs in RU_COMPARE_PAIRS
        ...(RU_COMPARE_PATHS.has(`/cars/compare/${c1}/${c2}`) ? { 'ru-IL': `https://carissues.co.il/ru/cars/compare/${c1}/${c2}` } : {}),
        en: `https://carissues.net/cars/compare/${c1}/${c2}`,
        'x-default': `https://carissues.net/cars/compare/${c1}/${c2}`,
      },
    },
    openGraph: { title, description, url: canonical, images: [{ url: '/og-default.png', width: 1200, height: 630 }] },
  };
}

export const revalidate = 3600; // cache 1 hour


export default async function ComparePage({ params }: Props) {
  const { make1, model1, make2, model2 } = await params;

  // Block comparing a model to itself
  if (make1 === make2 && model1 === model2) {
    redirect(`/cars/${make1}/${model1}`);
  }

  // Enforce canonical slug order (alphabetical) to avoid duplicate pages
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  if (`${make1}/${model1}` !== c1) {
    redirect(`/cars/compare/${c1}/${c2}`);
  }

  return <ComparePageView make1={make1} model1={model1} make2={make2} model2={model2} locale={await getHostLocale()} />;
}

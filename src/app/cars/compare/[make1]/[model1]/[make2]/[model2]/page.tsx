import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
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

  // Pull real ratings into the snippet - matches the Product/AggregateRating schema
  // on the page itself, and gives the SERP something concrete instead of generic copy.
  const [reviewsA, reviewsB, expertA, expertB, indexable] = await Promise.all([
    getReviewsForModel(make1, model1).catch(() => []),
    getReviewsForModel(make2, model2).catch(() => []),
    getExpertReviews(make1, model1).catch(() => []),
    getExpertReviews(make2, model2).catch(() => []),
    // Pairs outside the sitemap are noindex (same rule, see lib/seoIndexing).
    // Fail open so a D1 error never caches a stray noindex.
    getComparePolicy().then(p => p.isIndexable(c1, c2)).catch(() => true),
  ]);
  const avgA = reviewsA.length ? reviewsA.reduce((s, r) => s + r.rating, 0) / reviewsA.length : null;
  const avgB = reviewsB.length ? reviewsB.reduce((s, r) => s + r.rating, 0) / reviewsB.length : null;
  const scoreA = expertA[0]?.topScore ?? null;
  const scoreB = expertB[0]?.topScore ?? null;
  const hasStats = avgA !== null || avgB !== null;

  const statTag = (avg: number | null, count: number, score: number | null) =>
    avg !== null ? `${avg.toFixed(1)}★ (${count})` : score !== null ? (isEn ? `AI ${score.toFixed(1)}/10` : `ציון AI ${score.toFixed(1)}/10`) : null;
  const tagA = statTag(avgA, reviewsA.length, scoreA);
  const tagB = statTag(avgB, reviewsB.length, scoreB);

  const title = isEn
    ? `${nameA} vs ${nameB}: Which Is Better? (2026)`
    : `${nameA} מול ${nameB} - מי עדיף? השוואה 2026`;
  const description = hasStats
    ? isEn
      ? `${nameA}${tagA ? ` (${tagA})` : ''} vs ${nameB}${tagB ? ` (${tagB})` : ''} - full comparison: pros & cons, reliability, price history 2016-2026. See who wins.`
      : `${nameA}${tagA ? ` (${tagA})` : ''} מול ${nameB}${tagB ? ` (${tagB})` : ''} - השוואה מלאה: יתרונות וחסרונות, אמינות, היסטוריית מחיר 2016-2026. מי מנצח?`
    : isEn
      ? `${nameA} or ${nameB}? Full comparison: AI scores, owner reviews, pros & cons, price history 2016-2026 - CarIssues`
      : `${nameA} או ${nameB}? השוואה מלאה: ציונים, ביקורות בעלי רכב, יתרונות וחסרונות, היסטוריית מחיר 2016-2026 - CarIssues IL`;
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

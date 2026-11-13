import type { Metadata } from 'next';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getRecallsForPage } from '@/lib/recallsForPage';
import { summarizeIlRecalls, buildIssuesDescription } from '@/lib/issuesSummary';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import ModelPageView from '../ModelPageView';

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string }> }

/**
 * /cars/<make>/<model>/issues is the model page opened on its problems tab
 * (ModelPageView with view="issues"): same design, its own title and heading, and the
 * recall list rendered on the server.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make || !model) return {};
  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const url = `${base}/cars/${make.slug}/${model.slug}/issues`;

  const [recalls, expertReviews, reviews] = await Promise.all([
    getRecallsForPage(make.nameEn, model.nameEn, model.years, locale).catch(() => []),
    getExpertReviews(make.slug, model.slug).catch(() => []),
    getReviewsForModel(make.slug, model.slug).catch(() => []),
  ]);
  const il = summarizeIlRecalls(recalls.filter((r) => r.source === 'il')
    .map((r) => ({ year: r.ilRecallYear ?? null, faultType: r.component, recallType: r.recallType ?? null })));
  const usRecallCount = recalls.filter((r) => r.source === 'us').length;
  // carissues.net: an issues page with no English problem data (no expert-review cons or
  // summary, no owner reviews, no recalls) is a template shell - keep it out of the index.
  const e = expertReviews[0];
  const thinEn = isEn && !(e?.consEn?.length || e?.localSummaryEn) && reviews.length === 0 && usRecallCount === 0;
  const dataDescription = buildIssuesDescription({
    makeName: isEn ? make.nameEn : make.nameHe,
    modelName: isEn ? model.nameEn : model.nameHe,
    il, usRecallCount, cons: [],
  }, locale);

  return {
    ...(thinEn ? { robots: { index: false, follow: true } } : {}),
    title: isEn
      ? `${make.nameEn} ${model.nameEn} - Common Problems & Issues`
      : il.total > 0
        ? `${make.nameHe} ${model.nameHe} - תקלות נפוצות, ריקולים ובעיות`
        : `${make.nameHe} ${model.nameHe} - בעיות נפוצות ותקלות`,
    description: dataDescription ?? (isEn
      ? `What are the common problems with the ${make.nameEn} ${model.nameEn}? Recalls, reported weaknesses and owner reviews.`
      : `אילו בעיות נפוצות יש ל${make.nameHe} ${model.nameHe}? ריקולים, חסרונות מדווחים וחוות דעת בעלים בישראל.`),
    alternates: {
      canonical: url,
      languages: {
        he: `https://carissues.co.il/cars/${make.slug}/${model.slug}/issues`,
        en: `https://carissues.net/cars/${make.slug}/${model.slug}/issues`,
        'x-default': `https://carissues.net/cars/${make.slug}/${model.slug}/issues`,
      },
    },
    openGraph: {
      title: isEn
        ? `${make.nameEn} ${model.nameEn} - Common Problems`
        : `${make.nameHe} ${model.nameHe} - בעיות נפוצות`,
      description: isEn
        ? `Recalls and common issues - ${make.nameEn} ${model.nameEn}`
        : `תקלות, ריקולים וחסרונות - ${make.nameHe} ${model.nameHe}`,
      url,
    },
  };
}

export default async function IssuesPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  return <ModelPageView makeSlug={makeSlug} modelSlug={modelSlug} view="issues" />;
}

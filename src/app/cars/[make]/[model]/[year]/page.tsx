import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel } from '@/lib/carsDb';
import { getReviewsForCar, getAverageRating } from '@/lib/reviewsDb';
import { getExpertReviewsForYear, getExpertReviews } from '@/lib/expertReviews';
import StarRating from '@/components/StarRating';
import ExpertReviewsSection from '@/components/ExpertReviewsSection';
import CarYearClient from './CarYearClient';
import MakeLogo from '@/components/MakeLogo';
import ShareButtons from '@/components/ShareButtons';
import RecallsSection from '@/components/RecallsSection';
import RecallsBadge from '@/components/RecallsBadge';
import YearHero from './YearHero';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ make: string; model: string; year: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug, year } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) return {};
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) return {};
  const yearNum = parseInt(year);
  const [avgRating, reviews] = await Promise.all([
    getAverageRating(makeSlug, modelSlug),
    getReviewsForCar(makeSlug, modelSlug, yearNum),
  ]);

  const url = `https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`;
  return {
    title: `${make.nameHe} ${model.nameHe} ${year} — בעיות וביקורות`,
    description: `בעיות נפוצות ב${make.nameHe} ${model.nameHe} ${year} (${make.nameEn} ${model.nameEn}). ${reviews.length > 0 ? `${reviews.length} ביקורות מבעלי רכב בישראל.` : 'ביקורות מבעלי רכב בישראל.'}${avgRating ? ` דירוג ממוצע: ${avgRating.toFixed(1)}/5.` : ''}`,
    alternates: { canonical: url },
    openGraph: {
      title: `${make.nameHe} ${model.nameHe} ${year} | CarIssues IL`,
      description: `ביקורות ובעיות נפוצות — ${make.nameHe} ${model.nameHe} ${year}`,
      url,
      images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
    },
  };
}

export default async function CarYearPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug, year } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) notFound();
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) notFound();
  const yearNum = parseInt(year);
  if (!model.years.includes(yearNum)) notFound();

  const [reviews, { review: yearReview, isYearSpecific }, generalReviewsList] = await Promise.all([
    getReviewsForCar(makeSlug, modelSlug, yearNum),
    getExpertReviewsForYear(makeSlug, modelSlug, yearNum),
    getExpertReviews(makeSlug, modelSlug),
  ]);
  const generalReview = generalReviewsList[0] ?? null;

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const ratingDist = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: `${make.nameEn} ${model.nameEn} ${year}`,
        brand: { '@type': 'Brand', name: make.nameEn },
        url: `https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`,
        ...(avgRating !== null && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
        }),
        review: reviews.slice(0, 5).map((r) => ({
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
          name: r.title,
          reviewBody: r.body,
          author: { '@type': 'Person', name: r.authorName },
          datePublished: r.createdAt.split('T')[0],
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'בית', item: 'https://carissues.co.il' },
          { '@type': 'ListItem', position: 2, name: 'יצרנים', item: 'https://carissues.co.il/cars' },
          { '@type': 'ListItem', position: 3, name: make.nameHe, item: `https://carissues.co.il/cars/${make.slug}` },
          { '@type': 'ListItem', position: 4, name: model.nameHe, item: `https://carissues.co.il/cars/${make.slug}/${model.slug}` },
          { '@type': 'ListItem', position: 5, name: String(year), item: `https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}` },
        ],
      },
      ...(yearReview && (yearReview.pros.length > 0 || yearReview.cons.length > 0) ? [{
        '@type': 'FAQPage',
        mainEntity: [
          yearReview.pros.length > 0 && {
            '@type': 'Question',
            name: `מה היתרונות של ${make.nameHe} ${model.nameHe} ${year}?`,
            acceptedAnswer: { '@type': 'Answer', text: yearReview.pros.join('. ') },
          },
          yearReview.cons.length > 0 && {
            '@type': 'Question',
            name: `מה החסרונות של ${make.nameHe} ${model.nameHe} ${year}?`,
            acceptedAnswer: { '@type': 'Answer', text: yearReview.cons.join('. ') },
          },
          yearReview.localSummaryHe && {
            '@type': 'Question',
            name: `מה אומרים בעלי ${make.nameHe} ${model.nameHe} ${year} בישראל?`,
            acceptedAnswer: { '@type': 'Answer', text: yearReview.localSummaryHe },
          },
          avgRating !== null && reviews.length > 0 && {
            '@type': 'Question',
            name: `מה הדירוג של ${make.nameHe} ${model.nameHe} ${year}?`,
            acceptedAnswer: { '@type': 'Answer', text: `${make.nameHe} ${model.nameHe} ${year} מקבל דירוג ממוצע של ${avgRating.toFixed(1)} מתוך 5 על בסיס ${reviews.length} ביקורות של בעלי רכב.` },
          },
        ].filter(Boolean),
      }] : []),
    ],
  };

  return (
    <div className="page-section">
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>יצרנים</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{make.nameHe}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}/${model.slug}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{model.nameHe}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>{year}</span>
        </div>

        {/* Hero image */}
        <YearHero
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          year={yearNum}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
          makeNameEn={make.nameEn}
          modelNameEn={model.nameEn}
        />

        {/* Page header — logo + share + recalls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={40} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {make.nameEn} {model.nameEn} · {getCategoryLabel(model.category)}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ShareButtons title={`${make.nameHe} ${model.nameHe} ${year} — ביקורות ובעיות נפוצות | CarIssues IL`} url={`https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`} />
            <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />
          </div>
        </div>

        {/* Expert reviews — year-specific first, right after hero */}
        {isYearSpecific && yearReview && (
          <div style={{ marginBottom: 20 }}>
            {/* Subtle year-specific label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(230,57,70,0.1)', color: 'var(--brand-red)',
                fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em',
                padding: '3px 12px', borderRadius: 20,
              }}>
                סיכום שנת {yearNum}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <ExpertReviewsSection
              review={yearReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              year={yearNum}
              isYearSpecific={true}
              userAvgRating={avgRating}
              userReviewCount={reviews.length}
            />
          </div>
        )}

        {/* General model review — always show, labeled when both exist */}
        {generalReview && (
          <div style={{ marginBottom: 32 }}>
            {isYearSpecific && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'var(--bg-muted)', color: 'var(--text-muted)',
                  fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.04em',
                  padding: '3px 12px', borderRadius: 20,
                }}>
                  סיכום כללי
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            )}
            <ExpertReviewsSection
              review={generalReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              year={isYearSpecific ? undefined : yearNum}
              isYearSpecific={false}
              userAvgRating={isYearSpecific ? null : avgRating}
              userReviewCount={isYearSpecific ? 0 : reviews.length}
            />
          </div>
        )}

        {/* Fallback: show year-specific review when no general exists */}
        {!generalReview && !isYearSpecific && yearReview && (
          <ExpertReviewsSection
            review={yearReview}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
            year={yearNum}
            isYearSpecific={false}
            userAvgRating={avgRating}
            userReviewCount={reviews.length}
          />
        )}

        {/* Rating distribution — below AI summaries */}
        {avgRating !== null && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 32 }}>
            <div className="rating-dist">
              <div style={{ textAlign: 'center', minWidth: 90, flexShrink: 0 }}>
                <div style={{ fontSize: '2.75rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {avgRating.toFixed(1)}
                </div>
                <StarRating rating={avgRating} size={18} />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 5 }}>
                  {reviews.length} ביקורות
                </div>
              </div>
              <div className="rating-dist-bars">
                {ratingDist.map(({ stars, count }) => (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 28, color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', flexShrink: 0 }}>{stars}★</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{
                        width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%',
                        height: '100%',
                        background: stars >= 4 ? '#16a34a' : stars === 3 ? '#ca8a04' : 'var(--brand-red)',
                        borderRadius: 9999,
                      }} />
                    </div>
                    <span style={{ width: 20, color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left', flexShrink: 0 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Client component handles reviews list + review form + on-demand AI generation + video tab */}
        <CarYearClient
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          year={yearNum}
          initialReviews={reviews}
          isYearSpecific={isYearSpecific}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
        />

        {/* Recalls for this year */}
        <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </div>
  );
}

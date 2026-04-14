import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel } from '@/lib/carsDb';
import { getReviewsForCar, getAverageRating } from '@/lib/reviewsDb';
import { getExpertReviewsForYear } from '@/lib/expertReviews';
import StarRating from '@/components/StarRating';
import ExpertReviewsSection from '@/components/ExpertReviewsSection';
import CarYearClient from './CarYearClient';
import MakeLogo from '@/components/MakeLogo';
import ShareButtons from '@/components/ShareButtons';
import RecallsSection from '@/components/RecallsSection';
import RecallsBadge from '@/components/RecallsBadge';

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

  const [reviews, { review: yearReview, isYearSpecific }] = await Promise.all([
    getReviewsForCar(makeSlug, modelSlug, yearNum),
    getExpertReviewsForYear(makeSlug, modelSlug, yearNum),
  ]);

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
    <div style={{ padding: '48px 0 80px' }}>
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

        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={52} />
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, lineHeight: 1.15 }}>
                {make.nameHe} {model.nameHe} {year}
              </h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                {make.nameEn} {model.nameEn} · {getCategoryLabel(model.category)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <ShareButtons title={`${make.nameHe} ${model.nameHe} ${year} — ביקורות ובעיות נפוצות | CarIssues IL`} url={`https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`} />
            <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />
          </div>
        </div>

        {/* Rating overview + reviews client component */}
        {avgRating !== null && (
          <div className="card" style={{ padding: '28px 28px', marginBottom: 40 }}>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Big rating */}
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {avgRating.toFixed(1)}
                </div>
                <StarRating rating={avgRating} size={22} />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 6 }}>
                  {reviews.length} ביקורות
                </div>
              </div>

              {/* Distribution */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {ratingDist.map(({ stars, count }) => (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 36, color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', flexShrink: 0 }}>
                      {stars}★
                    </span>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%',
                          height: '100%',
                          background: stars >= 4 ? '#16a34a' : stars === 3 ? '#ca8a04' : 'var(--brand-red)',
                          borderRadius: 9999,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <span style={{ width: 24, color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'left', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI summary — year-specific if real data exists, otherwise general */}
        {yearReview && (
          <ExpertReviewsSection
            review={yearReview}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
            year={yearNum}
            isYearSpecific={isYearSpecific}
            userAvgRating={avgRating}
            userReviewCount={reviews.length}
          />
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

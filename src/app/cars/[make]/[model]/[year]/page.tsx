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
    <div>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 55%, #16213e 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* dot grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(230,57,70,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative' }}>
          {/* Breadcrumb */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem',
            padding: '18px 0 0', flexWrap: 'wrap',
          }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.35)' }}>בית</Link>
            <span>›</span>
            <Link href="/cars" style={{ color: 'rgba(255,255,255,0.35)' }}>יצרנים</Link>
            <span>›</span>
            <Link href={`/cars/${make.slug}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{make.nameHe}</Link>
            <span>›</span>
            <Link href={`/cars/${make.slug}/${model.slug}`} style={{ color: 'rgba(255,255,255,0.5)' }}>{model.nameHe}</Link>
            <span>›</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{year}</span>
          </div>

          {/* Hero content */}
          <div style={{
            display: 'flex', gap: 24, alignItems: 'center',
            flexWrap: 'wrap', padding: '20px 0 28px',
          }}>
            {/* Left: identity + actions */}
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: 8, flexShrink: 0,
                }}>
                  <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={36} />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', letterSpacing: '0.05em', margin: 0 }}>
                    {make.nameEn} {model.nameEn} · {getCategoryLabel(model.category)}
                  </p>
                  <h1 style={{
                    color: '#fff', fontWeight: 900, lineHeight: 1.05, margin: 0,
                    fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                  }}>
                    {make.nameHe} {model.nameHe}{' '}
                    <span style={{ color: 'var(--brand-red)' }}>{year}</span>
                  </h1>
                </div>
              </div>

              {/* Meta + rating */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {avgRating !== null && (
                  <span style={{
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fcd34d', fontSize: '0.75rem', fontWeight: 700,
                    padding: '4px 12px', borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    ★ {avgRating.toFixed(1)}
                    <span style={{ opacity: 0.6, fontWeight: 400 }}>({reviews.length})</span>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <ShareButtons
                  title={`${make.nameHe} ${model.nameHe} ${year} — ביקורות ובעיות נפוצות | CarIssues IL`}
                  url={`https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`}
                />
                <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />
              </div>
            </div>

            {/* Right: hero image */}
            <div style={{ flex: '1 1 320px', minWidth: 280 }}>
              <div style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
              }}>
                <YearHero
                  makeSlug={makeSlug}
                  modelSlug={modelSlug}
                  year={yearNum}
                  makeNameHe={make.nameHe}
                  modelNameHe={model.nameHe}
                  makeNameEn={make.nameEn}
                  modelNameEn={model.nameEn}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT — AI first ─────────────────────────────────────────── */}
      <div style={{ padding: '32px 0 80px' }}>
        <div className="container">

          {/* Year-specific AI summary */}
          {isYearSpecific && yearReview && (
            <ExpertReviewsSection
              review={yearReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              year={yearNum}
              isYearSpecific={true}
              userAvgRating={avgRating}
              userReviewCount={reviews.length}
            />
          )}

          {/* General model summary */}
          {generalReview && (
            <ExpertReviewsSection
              review={generalReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              year={isYearSpecific ? undefined : yearNum}
              isYearSpecific={false}
              userAvgRating={isYearSpecific ? null : avgRating}
              userReviewCount={isYearSpecific ? 0 : reviews.length}
            />
          )}

          {/* Fallback */}
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

          {/* Rating distribution */}
          {avgRating !== null && (
            <div className="card" style={{ padding: '16px 20px', marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <StarRating rating={avgRating} size={16} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                    {reviews.length} ביקורות
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  {ratingDist.map(({ stars, count }) => (
                    <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ width: 24, color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', flexShrink: 0 }}>{stars}★</span>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{
                          width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%',
                          height: '100%',
                          background: stars >= 4 ? '#16a34a' : stars === 3 ? '#ca8a04' : 'var(--brand-red)',
                          borderRadius: 9999,
                        }} />
                      </div>
                      <span style={{ width: 18, color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'left', flexShrink: 0 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reviews + form + AI generation + video tab */}
          <CarYearClient
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            year={yearNum}
            initialReviews={reviews}
            isYearSpecific={isYearSpecific}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
          />

          {/* Recalls */}
          <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />

          {/* JSON-LD */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </div>
      </div>
    </div>
  );
}

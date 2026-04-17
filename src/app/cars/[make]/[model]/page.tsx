import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { findCarModel } from '@/lib/sketchfab';
import { getExpertReviews } from '@/lib/expertReviews';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';
import Car3DViewer from '@/components/Car3DViewer';
import ExpertReviewsSection from '@/components/ExpertReviewsSection';
import ModelReviewsSection from './ModelReviewsSection';
import FirstReviewCta from './FirstReviewCta';
import SharePopup from '@/components/SharePopup';
import RecallsSection from '@/components/RecallsSection';
import RecallsBadge from '@/components/RecallsBadge';
import CarPageTabs from './CarPageTabs';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ make: string; model: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) return {};
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) return {};
  const url = `https://carissues.co.il/cars/${make.slug}/${model.slug}`;
  return {
    title: `${make.nameHe} ${model.nameHe} — בעיות וביקורות`,
    description: `בעיות נפוצות ב${make.nameHe} ${model.nameHe} (${make.nameEn} ${model.nameEn}). ביקורות אמיתיות מבעלי רכב בישראל, דירוגים, יתרונות וחסרונות.`,
    alternates: { canonical: url },
    openGraph: { title: `${make.nameHe} ${model.nameHe} | CarIssues IL`, description: `ביקורות ובעיות נפוצות — ${make.nameHe} ${model.nameHe}`, url, images: [{ url: '/og-default.svg', width: 1200, height: 630 }] },
  };
}

export default async function ModelPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) notFound();
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) notFound();

  const [allReviews, expertReviewsList, sketchfabModel] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug),
    getExpertReviews(makeSlug, modelSlug),
    findCarModel(makeSlug, modelSlug),
  ]);
  const expertReview = expertReviewsList[0] ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  const yearMin = model.years[model.years.length - 1];
  const yearMax = model.years[0];

  return (
    <div>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 55%, #16213e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* dot grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* red glow orb */}
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
            padding: '20px 0 0', flexWrap: 'wrap',
          }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s' }}>בית</Link>
            <span>›</span>
            <Link href="/cars" style={{ color: 'rgba(255,255,255,0.35)' }}>יצרנים</Link>
            <span>›</span>
            <Link href={`/cars/${make.slug}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{make.nameHe}</Link>
            <span>›</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{model.nameHe}</span>
          </div>

          {/* Hero grid */}
          <div style={{
            display: 'flex', gap: 32, alignItems: 'center',
            flexWrap: 'wrap', padding: '28px 0 36px',
          }}>
            {/* Left: identity */}
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              {/* Brand row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, padding: 10, flexShrink: 0,
                }}>
                  <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={44} />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: 2 }}>
                    {make.nameEn} {model.nameEn}
                  </p>
                  <h1 style={{
                    color: '#fff', fontWeight: 900, lineHeight: 1.05,
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: 0,
                  }}>
                    {make.nameHe} {model.nameHe}
                  </h1>
                </div>
              </div>

              {/* Meta pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <span style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600,
                  padding: '4px 12px', borderRadius: 99,
                }}>
                  {getCategoryLabel(model.category)}
                </span>
                <span style={{
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                  color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600,
                  padding: '4px 12px', borderRadius: 99,
                }}>
                  {yearMin}–{yearMax}
                </span>
                {avgRating !== null && (
                  <span style={{
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fcd34d', fontSize: '0.75rem', fontWeight: 700,
                    padding: '4px 12px', borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    ★ {avgRating.toFixed(1)} <span style={{ opacity: 0.6, fontWeight: 400 }}>({allReviews.length})</span>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <SharePopup
                  title={`${make.nameHe} ${model.nameHe} — ביקורות ובעיות נפוצות | CarIssues IL`}
                  url={`https://carissues.co.il/cars/${make.slug}/${model.slug}`}
                />
                <Link
                  href={`/cars/compare?car1=${make.slug}/${model.slug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 36, padding: '0 14px', borderRadius: 99,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: 'rgba(255,255,255,0.75)', fontSize: '0.8125rem', fontWeight: 600,
                    textDecoration: 'none', transition: 'background 0.15s',
                  }}
                >
                  ⚖️ השווה לרכב אחר
                </Link>
                <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
              </div>
            </div>

            {/* Right: 3D viewer */}
            {sketchfabModel ? (
              <div style={{ flex: '1 1 340px', minWidth: 280 }}>
                <div style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}>
                  <Car3DViewer
                    uid={sketchfabModel.uid}
                    modelName={`${make.nameHe} ${model.nameHe}`}
                    makeSlug={makeSlug}
                    modelSlug={modelSlug}
                  />
                </div>
                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginTop: 6, textAlign: 'center' }}>
                  <a href={sketchfabModel.viewerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    &ldquo;{sketchfabModel.name}&rdquo; by {sketchfabModel.author} · Sketchfab (CC BY 4.0)
                  </a>
                </p>
              </div>
            ) : (
              /* No 3D model — show rating summary instead */
              avgRating !== null && (
                <div style={{ flex: '0 0 auto', textAlign: 'center', padding: '24px 32px' }}>
                  <div style={{ fontSize: '4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <StarRating rating={avgRating} size={20} />
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: 6 }}>
                    {allReviews.length} ביקורות
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── YEAR RAIL ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '2px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div className="container">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 0', overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            <span style={{
              color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              שנת ייצור
            </span>
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            {model.years.map((y, i) => (
              <Link
                key={y}
                href={`/cars/${make.slug}/${model.slug}/${y}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  height: 34, padding: '0 16px', borderRadius: 8,
                  border: i === 0 ? '1.5px solid var(--brand-red)' : '1.5px solid var(--border)',
                  background: i === 0 ? 'rgba(230,57,70,0.06)' : 'transparent',
                  color: i === 0 ? 'var(--brand-red)' : 'var(--text-secondary)',
                  fontSize: '0.875rem', fontWeight: i === 0 ? 700 : 500,
                  textDecoration: 'none', flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {y}
                {i === 0 && (
                  <span style={{
                    marginRight: 5, fontSize: '0.58rem', fontWeight: 800,
                    color: 'var(--brand-red)', letterSpacing: '0.03em',
                  }}>
                    חדש
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ padding: '40px 0 80px' }}>
        <div className="container">

          {/* General AI summary */}
          <ExpertReviewsSection
            review={expertReview}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
            userAvgRating={avgRating}
            userReviewCount={allReviews.length}
          />

          {/* Tabbed: Reviews | Videos | Images */}
          <CarPageTabs
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
          >
            <div>
              {allReviews.length === 0 && (
                <FirstReviewCta makeNameHe={make.nameHe} modelNameHe={model.nameHe} />
              )}
              <div id="write-review" style={{ marginBottom: 48 }}>
                <ModelReviewsSection
                  makeSlug={makeSlug}
                  modelSlug={modelSlug}
                  years={model.years}
                  trims={model.trims}
                  initialReviews={allReviews}
                />
              </div>
              <div style={{ marginTop: 48 }}>
                <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
              </div>
            </div>
          </CarPageTabs>
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              ...(avgRating !== null || expertReview?.topScore != null ? [{
                '@type': 'Product',
                name: `${make.nameEn} ${model.nameEn}`,
                brand: { '@type': 'Brand', name: make.nameEn },
                url: `https://carissues.co.il/cars/${make.slug}/${model.slug}`,
                ...(avgRating !== null ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: avgRating.toFixed(1),
                    reviewCount: allReviews.length,
                    bestRating: 5,
                    worstRating: 1,
                  },
                } : {
                  review: {
                    '@type': 'Review',
                    author: { '@type': 'Organization', name: 'CarIssues AI' },
                    reviewRating: {
                      '@type': 'Rating',
                      ratingValue: expertReview!.topScore!.toFixed(1),
                      bestRating: 10,
                      worstRating: 0,
                    },
                  },
                }),
              }] : []),
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'בית', item: 'https://carissues.co.il' },
                  { '@type': 'ListItem', position: 2, name: 'יצרנים', item: 'https://carissues.co.il/cars' },
                  { '@type': 'ListItem', position: 3, name: make.nameHe, item: `https://carissues.co.il/cars/${make.slug}` },
                  { '@type': 'ListItem', position: 4, name: model.nameHe, item: `https://carissues.co.il/cars/${make.slug}/${model.slug}` },
                ],
              },
              ...(expertReview && (expertReview.pros.length > 0 || expertReview.cons.length > 0) ? [{
                '@type': 'FAQPage',
                mainEntity: [
                  expertReview.pros.length > 0 && {
                    '@type': 'Question',
                    name: `מה היתרונות של ${make.nameHe} ${model.nameHe}?`,
                    acceptedAnswer: { '@type': 'Answer', text: expertReview.pros.join('. ') },
                  },
                  expertReview.cons.length > 0 && {
                    '@type': 'Question',
                    name: `מה החסרונות של ${make.nameHe} ${model.nameHe}?`,
                    acceptedAnswer: { '@type': 'Answer', text: expertReview.cons.join('. ') },
                  },
                  expertReview.localSummaryHe && {
                    '@type': 'Question',
                    name: `מה אומרים בעלי ${make.nameHe} ${model.nameHe} בישראל?`,
                    acceptedAnswer: { '@type': 'Answer', text: expertReview.localSummaryHe },
                  },
                  expertReview.globalSummaryHe && {
                    '@type': 'Question',
                    name: `מה חוות הדעת הבינלאומית על ${make.nameHe} ${model.nameHe}?`,
                    acceptedAnswer: { '@type': 'Answer', text: expertReview.globalSummaryHe },
                  },
                  expertReview.topScore !== null && {
                    '@type': 'Question',
                    name: `מה הציון של ${make.nameHe} ${model.nameHe}?`,
                    acceptedAnswer: { '@type': 'Answer', text: `${make.nameHe} ${model.nameHe} קיבל ציון ${expertReview.topScore?.toFixed(1)} מתוך 10 בסיכום AI המבוסס על חוות דעת בעלי רכב בישראל ובעולם.` },
                  },
                ].filter(Boolean),
              }] : []),
            ],
          }),
        }}
      />
    </div>
  );
}

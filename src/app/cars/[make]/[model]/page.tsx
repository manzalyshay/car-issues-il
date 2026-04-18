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
          <span style={{ color: 'var(--text-primary)' }}>{model.nameHe}</span>
        </div>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2rem)', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{make.nameHe} {model.nameHe}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '2px 0 8px' }}>{make.nameEn} {model.nameEn}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-gray">{getCategoryLabel(model.category)}</span>
              <span className="badge badge-blue">{model.years[model.years.length - 1]}–{model.years[0]}</span>
              <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
              {avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <StarRating rating={avgRating} size={15} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({allReviews.length})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <SharePopup title={`${make.nameHe} ${model.nameHe} — ביקורות ובעיות נפוצות | CarIssues IL`} url={`https://carissues.co.il/cars/${make.slug}/${model.slug}`} />
          <Link href={`/cars/compare?car1=${make.slug}/${model.slug}`} className="btn btn-outline" style={{ height: 36, padding: '0 16px', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ⚖️ השווה לרכב אחר
          </Link>
        </div>

        {/* Unified panel — AI summary + 3D viewer, equal height */}
        {sketchfabModel ? (
          <div className="model-unified-panel">
            {/* Left: AI insights (inline — no nested card) */}
            <div className="model-unified-panel-ai">
              <ExpertReviewsSection
                review={expertReview}
                makeNameHe={make.nameHe}
                modelNameHe={model.nameHe}
                userAvgRating={avgRating}
                userReviewCount={allReviews.length}
                inline
              />
            </div>
            {/* Right: 3D viewer fills full height */}
            <div className="model-unified-panel-viewer">
              <div className="model-unified-panel-viewer-inner">
                <Car3DViewer uid={sketchfabModel.uid} modelName={`${make.nameHe} ${model.nameHe}`} makeSlug={makeSlug} modelSlug={modelSlug} />
                {/* Mobile-only: car name overlay (magazine-cover style) */}
                <div className="viewer-hero-overlay" aria-hidden="true">
                  <div>
                    <div className="viewer-hero-make">{make.nameHe}</div>
                    <div className="viewer-hero-model">{model.nameHe}</div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, padding: '5px 10px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <a href={sketchfabModel.viewerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                  &ldquo;{sketchfabModel.name}&rdquo; by {sketchfabModel.author} · CC BY 4.0
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <ExpertReviewsSection
              review={expertReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              userAvgRating={avgRating}
              userReviewCount={allReviews.length}
            />
          </div>
        )}

        {/* Year selector */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            בחר שנה לביקורת מפורטת
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {model.years.map((y) => (
              <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} className="year-pill">{y}</Link>
            ))}
          </div>
        </div>

        {/* Tabbed: Reviews | Videos */}
        <CarPageTabs
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
        >
          {/* Reviews tab content */}
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

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                // Only emit Product schema when we have the required aggregateRating or review
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
                    // No user reviews — use expert AI score as a single Review to satisfy Google's requirement
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
    </div>
  );
}

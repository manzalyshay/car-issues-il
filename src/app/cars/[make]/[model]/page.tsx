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
import SharePopup from '@/components/SharePopup';
import RecallsSection from '@/components/RecallsSection';
import RecallsBadge from '@/components/RecallsBadge';

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
    openGraph: { title: `${make.nameHe} ${model.nameHe} | CarIssues IL`, description: `ביקורות ובעיות נפוצות — ${make.nameHe} ${model.nameHe}`, url },
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
          <span style={{ color: 'var(--text-primary)' }}>{model.nameHe}</span>
        </div>

        {/* Model header + 3D viewer */}
        <div className="card" style={{ padding: '28px', marginBottom: 40, display: 'flex', gap: 32, alignItems: 'stretch', flexWrap: 'wrap' }}>
          {/* Left: title + badges */}
          <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={48} />
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{make.nameHe} {model.nameHe}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{make.nameEn} {model.nameEn}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-gray">{getCategoryLabel(model.category)}</span>
              <span className="badge badge-blue">{model.years[model.years.length - 1]}–{model.years[0]}</span>
              <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
              {avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StarRating rating={avgRating} size={16} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {avgRating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    ({allReviews.length} ביקורות)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: 3D viewer */}
          {sketchfabModel && (
            <div style={{ flex: '1 1 320px', minWidth: 280 }}>
              <Car3DViewer uid={sketchfabModel.uid} modelName={`${make.nameHe} ${model.nameHe}`} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                <a href={sketchfabModel.viewerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                  &ldquo;{sketchfabModel.name}&rdquo; by {sketchfabModel.author} · Sketchfab (CC BY 4.0)
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Share + Compare */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
          <SharePopup title={`${make.nameHe} ${model.nameHe} — ביקורות ובעיות נפוצות | CarIssues IL`} url={`https://carissues.co.il/cars/${make.slug}/${model.slug}`} />
          <Link href={`/cars/compare?car1=${make.slug}/${model.slug}`} className="btn btn-outline" style={{ height: 36, padding: '0 16px', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ⚖️ השווה לרכב אחר
          </Link>
        </div>

        {/* General AI summary — combined score includes user reviews */}
        <ExpertReviewsSection
          review={expertReview}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
          userAvgRating={avgRating}
          userReviewCount={allReviews.length}
        />

        {/* First-review CTA — only when no reviews yet */}
        {allReviews.length === 0 && (
          <div className="card" style={{ marginBottom: 28, padding: '24px 28px', background: 'linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(230,57,70,0.04) 100%)', border: '1px solid rgba(230,57,70,0.25)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 40, flexShrink: 0 }}>⭐</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>
                היה הראשון לדרג את {make.nameHe} {model.nameHe}!
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                אין עדיין ביקורות לדגם הזה. הניסיון שלך יעזור לאלפי בעלי רכב בישראל.
              </div>
            </div>
            <a
              href="#write-review"
              className="btn btn-primary"
              style={{ height: 42, padding: '0 24px', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
            >
              ✏️ כתוב ביקורת
            </a>
          </div>
        )}

        {/* Inline reviews with year filter */}
        <div id="write-review" style={{ marginBottom: 48 }}>
          <ModelReviewsSection
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={model.years}
            initialReviews={allReviews}
          />
        </div>

        {/* Recalls */}
        <div style={{ marginTop: 48 }}>
          <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
        </div>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Product',
                  name: `${make.nameEn} ${model.nameEn}`,
                  brand: { '@type': 'Brand', name: make.nameEn },
                  url: `https://carissues.co.il/cars/${make.slug}/${model.slug}`,
                  ...(avgRating !== null && {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: avgRating.toFixed(1),
                      reviewCount: allReviews.length,
                      bestRating: 5,
                      worstRating: 1,
                    },
                  }),
                },
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

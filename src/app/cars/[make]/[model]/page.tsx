import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels } from '@/lib/carsDb';
import { getReviewsForModel, getAverageRating } from '@/lib/reviewsDb';
import { findCarModel } from '@/lib/sketchfab';
import { getExpertReviews } from '@/lib/expertReviews';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
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
import RepairCostsSection from '@/components/RepairCostsSection';

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) return {};
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) return {};
  const url = `https://carissues.co.il/cars/${make.slug}/${model.slug}`;
  const [avgRating, reviews, trims] = await Promise.all([
    getAverageRating(makeSlug, modelSlug),
    getReviewsForModel(makeSlug, modelSlug),
    getTrimSpecs(makeSlug, modelSlug),
  ]);
  const yearRange = model.years.length > 1
    ? `${model.years[model.years.length - 1]}–${model.years[0]}`
    : `${model.years[0]}`;
  const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
  const countStr = reviews.length > 0 ? ` · ${reviews.length} ביקורות` : '';
  const trimsWithPrice = trims.filter(t => t.priceIls);
  const minPrice = trimsWithPrice.length > 0 ? Math.min(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const maxPrice = trimsWithPrice.length > 0 ? Math.max(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const priceDesc = minPrice && maxPrice && minPrice !== maxPrice
    ? ` מחיר: ₪${Math.round(minPrice / 1000)}K–₪${Math.round(maxPrice / 1000)}K.`
    : minPrice ? ` מחיר מומלץ: ₪${minPrice.toLocaleString('he-IL')}.` : '';
  const trimNames = trims.slice(0, 6).map(t => t.name).join(', ');
  const trimDesc = trimNames ? ` גימורים: ${trimNames}${trims.length > 6 ? ' ועוד' : ''}.` : '';
  const reviewPart = reviews.length > 0
    ? `${reviews.length} ביקורות אמיתיות${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
    : 'ביקורות ובעיות נפוצות';
  return {
    title: `${make.nameHe} ${model.nameHe} ${yearRange} — ${reviewPart} | יתרונות וחסרונות`,
    description: `${reviews.length > 0 ? `${reviews.length} ביקורות אמיתיות` : 'ביקורות אמיתיות'} על ${make.nameHe} ${model.nameHe} (${make.nameEn} ${model.nameEn}) שנים ${yearRange}${avgRating ? `. דירוג ממוצע ${avgRating.toFixed(1)}/5` : ''}.${priceDesc}${trimDesc} יתרונות, חסרונות ובעיות נפוצות מבעלי רכב בישראל.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${make.nameHe} ${model.nameHe}${ratingStr}${countStr} | CarIssues IL`,
      description: `ביקורות ובעיות נפוצות — ${make.nameHe} ${model.nameHe} ${yearRange}`,
      url,
      images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
    },
  };
}

export default async function ModelPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) notFound();
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) notFound();

  const [allReviews, expertReviewsList, sketchfabModel, similarModels] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug),
    getExpertReviews(makeSlug, modelSlug),
    findCarModel(makeSlug, modelSlug),
    getSimilarModels(makeSlug, modelSlug, model.category, 8),
  ]);
  const expertReview = expertReviewsList[0] ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── MODEL HERO ─────────────────────────────────────── */}
      <div className="model-page-hero">
        <div className="model-ghost-name" aria-hidden>{make.nameEn.toUpperCase()} {model.nameEn.toUpperCase()}</div>
        <div className="container" style={{ position: 'relative' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 24, flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>בית</Link>
            <span style={{ color: 'var(--brand-red)', opacity: 0.5 }}>›</span>
            <Link href="/cars" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>יצרנים</Link>
            <span style={{ color: 'var(--brand-red)', opacity: 0.5 }}>›</span>
            <Link href={`/cars/${make.slug}`} style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>{make.nameHe}</Link>
            <span style={{ color: 'var(--brand-red)', opacity: 0.5 }}>›</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{model.nameHe}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,3vw,36px)', flexWrap: 'wrap' }}>
            {/* Make logo */}
            <div style={{ width: 'clamp(52px,8vw,72px)', height: 'clamp(52px,8vw,72px)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={48} />
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                {make.nameEn} · {make.nameHe}
              </p>
              <h1 style={{ fontFamily: "'Bebas Neue', var(--font-display)", fontSize: 'clamp(2.5rem,7vw,6rem)', fontWeight: 400, lineHeight: 0.92, letterSpacing: '0.01em', color: '#fff', marginBottom: 12 }}>
                {model.nameHe}
                <span style={{ color: 'var(--brand-red)', marginInlineStart: 12 }}>{model.nameEn}</span>
              </h1>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ padding: '4px 12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}>
                  {getCategoryLabel(model.category)}
                </span>
                <span style={{ padding: '4px 12px', border: '1px solid rgba(129,140,248,0.2)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#818cf8', background: 'rgba(129,140,248,0.06)' }}>
                  {model.years[model.years.length - 1]}–{model.years[0]}
                </span>
                <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
                {avgRating !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StarRating rating={avgRating} size={14} />
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', fontWeight: 400, color: 'var(--brand-red)', lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>({allReviews.length})</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <SharePopup title={`${make.nameHe} ${model.nameHe} — ביקורות ובעיות נפוצות | CarIssues IL`} url={`https://carissues.co.il/cars/${make.slug}/${model.slug}`} />
                <Link href={`/cars/${make.slug}/${model.slug}/issues`} className="btn btn-outline" style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  ⚠️ בעיות נפוצות
                </Link>
                <Link href={`/cars/compare?car1=${make.slug}/${model.slug}`} className="btn btn-outline" style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  ⚖️ השווה לרכב אחר
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>

        {/* Tabs — right after header so they're visible without scrolling */}
        <CarPageTabs
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
          defaultYear={model.years[0]}
        >
          {/* Reviews tab content: AI panel + year selector + reviews + repair costs + recalls */}
          <div>
            {/* Unified panel — AI summary + 3D viewer */}
            {sketchfabModel ? (
              <div className="model-unified-panel">
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
                <div className="model-unified-panel-viewer">
                  <div className="model-unified-panel-viewer-inner">
                    <Car3DViewer uid={sketchfabModel.uid} modelName={`${make.nameHe} ${model.nameHe}`} makeSlug={makeSlug} modelSlug={modelSlug} />
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
            <div style={{ marginBottom: 28, marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                שנה ›
              </span>
              <div style={{ display: 'flex', overflowX: 'auto', gap: 6, paddingBottom: 2, flex: 1 }}>
                {model.years.map((y) => (
                  <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} className="year-pill" style={{ flexShrink: 0 }}>{y}</Link>
                ))}
              </div>
            </div>

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

            <RepairCostsSection
              makeSlug={makeSlug}
              modelSlug={modelSlug}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              category={model.category}
            />

            <div style={{ marginTop: 48 }}>
              <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
            </div>
          </div>
        </CarPageTabs>

        {/* Similar models — browse + compare */}
        {similarModels.length > 0 && (
          <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 18 }}>
              דגמים דומים בקטגוריה
            </h2>
            {/* Browse links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {similarModels.map(({ makeSlug: ms, makeNameHe, model: m }) => (
                <Link
                  key={`browse-${ms}/${m.slug}`}
                  href={`/cars/${ms}/${m.slug}`}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    fontSize: '0.85rem',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    border: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {makeNameHe} {m.nameHe}
                </Link>
              ))}
            </div>
            {/* Compare links */}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
              ⚖️ השוו {make.nameHe} {model.nameHe} מול:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {similarModels.slice(0, 6).map(({ makeSlug: ms, makeNameHe, model: m }) => {
                const [s1, s2] = [`${makeSlug}/${modelSlug}`, `${ms}/${m.slug}`].sort();
                return (
                  <Link
                    key={`cmp-${ms}/${m.slug}`}
                    href={`/cars/compare/${s1}/${s2}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: '0.8rem',
                      background: 'transparent',
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      border: '1px solid var(--accent)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {makeNameHe} {m.nameHe}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

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

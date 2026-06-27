import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels } from '@/lib/carsDb';
import { getReviewsForModel, getAverageRating } from '@/lib/reviewsDb';
import { findCarModel } from '@/lib/sketchfab';
import { getExpertReviews } from '@/lib/expertReviews';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';
import Car3DViewer from '@/components/Car3DViewer';
import ExpertReviewsSection from '@/components/ExpertReviewsSection';
import ModelReviewsSection from './ModelReviewsSection';
import FirstReviewCta from './FirstReviewCta';
import SharePopup from '@/components/SharePopup';
import RecallsSection from '@/components/RecallsSection';
import RecallsBadge from '@/components/RecallsBadge';
import CarSidebarLayout from './CarSidebarLayout';
import RepairCostsSection from '@/components/RepairCostsSection';
import { getImagesForCar } from '@/lib/carImages';

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make || !model) return {};
  const base = getBaseUrl(locale);
  const url = `${base}/cars/${make.slug}/${model.slug}`;
  const [avgRating, reviews, trims] = await Promise.all([
    getAverageRating(makeSlug, modelSlug),
    getReviewsForModel(makeSlug, modelSlug),
    getTrimSpecs(makeSlug, modelSlug),
  ]);
  const yearRange = model.years.length > 1
    ? `${model.years[model.years.length - 1]}–${model.years[0]}`
    : `${model.years[0]}`;

  if (locale === 'en') {
    const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
    const reviewPart = reviews.length > 0
      ? `${reviews.length} reviews${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
      : 'Reviews & Common Problems';
    return {
      title: `${make.nameEn} ${model.nameEn} ${yearRange} — ${reviewPart} | Pros & Cons`,
      description: `${reviews.length > 0 ? `${reviews.length} real owner reviews` : 'Real owner reviews'} for the ${make.nameEn} ${model.nameEn} (${yearRange})${avgRating ? `. Average rating ${avgRating.toFixed(1)}/5` : ''}. Common problems, pros, cons and reliability from real car owners.`,
      alternates: { canonical: url, languages: { he: `https://carissues.co.il/cars/${make.slug}/${model.slug}`, en: url } },
      openGraph: {
        title: `${make.nameEn} ${model.nameEn}${ratingStr} | CarIssues`,
        description: `Owner reviews & common problems — ${make.nameEn} ${model.nameEn} ${yearRange}`,
        url,
        images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
      },
    };
  }

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
    alternates: { canonical: url, languages: { he: url, en: `https://carissues.net/cars/${make.slug}/${model.slug}` } },
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
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make) notFound();
  if (!model) notFound();

  const [allReviews, expertReviewsList, sketchfabModel, similarModels, carImages] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    findCarModel(makeSlug, modelSlug).catch(() => null),
    getSimilarModels(makeSlug, modelSlug, model.category, 8).catch(() => []),
    getImagesForCar(makeSlug, modelSlug).catch(() => []),
  ]);
  const expertReview = expertReviewsList[0] ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  const isEn = locale === 'en';
  const cp = translations[locale].carPage;
  const cpOwners = cp.ownersLabel;
  const cpYearLabel = cp.yearLabel;
  const cpNoReviews = cp.noReviewsBeFirst;
  const cpOwnerSuffix = cp.ownerReviewsSuffix;
  const cpExternalReviews = cp.externalReviews;
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── MODEL HERO — light layout matching handoff ─── */}
      <div className="wrap" style={{ paddingBottom: 32 }}>

        {/* Breadcrumb */}
        <nav className="model-breadcrumb">
          <Link href="/">{translations[locale].carsPage.home}</Link>
          <span>›</span>
          <Link href="/cars">{translations[locale].carsPage.makes}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`}>{makeName}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{modelName}</span>
        </nav>

        {/* Gallery + summary grid */}
        <div className="model-hero">

          {/* Left: gallery */}
          <div>
            <div className="gallery-main">
              {sketchfabModel ? (
                <Car3DViewer uid={sketchfabModel.uid} modelName={`${make.nameHe} ${model.nameHe}`} makeSlug={makeSlug} modelSlug={modelSlug} />
              ) : carImages.length > 0 ? (
                /* Real photo as main gallery image */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={carImages[0].thumbnail_url ?? carImages[0].url}
                  alt={`${make.nameEn} ${model.nameEn}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #dde6f1, #b9c7da)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <svg viewBox="0 0 120 60" fill="none" style={{ width: '52%', color: 'rgba(255,255,255,.75)' }}>
                    <path d="M8 42 L18 26 C20 22 24 20 29 20 L74 20 C80 20 85 22 90 27 L102 39" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 42 L112 42 C114 42 115 41 115 39 L114 35 C113.5 33 112 32 110 32 L98 32" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M30 20 L36 32 L70 32 L72 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
                    <circle cx="34" cy="44" r="9" stroke="currentColor" strokeWidth="3"/>
                    <circle cx="86" cy="44" r="9" stroke="currentColor" strokeWidth="3"/>
                  </svg>
                  <span style={{ position: 'absolute', bottom: 10, insetInlineStart: 12, fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', background: 'rgba(20,32,46,.28)', padding: '3px 9px', borderRadius: 999, backdropFilter: 'blur(3px)' }}>
                    {make.nameEn} {model.nameEn}
                  </span>
                </div>
              )}
            </div>
            {/* Thumbnail strip — real images or gradient placeholders */}
            {carImages.length > 1 && (
              <div className="gallery-thumbs">
                {carImages.slice(0, 4).map((img, i) => (
                  <div key={img.id} className={`gallery-thumb${i === 0 ? ' active' : ''}`} style={{ background: '#dde6f1' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.thumbnail_url ?? img.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: model summary card */}
          <div className="model-summary">
            <div className="yr">
              {model.years.length > 1 ? `${model.years[model.years.length - 1]}–${model.years[0]}` : `${model.years[0]}`}
              {' · '}{getCategoryLabel(model.category, locale)}
            </div>
            <h1>{isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`}</h1>
            {!isEn && <p style={{ fontSize: 14, color: 'var(--text-faint)', marginTop: 2 }}>{make.nameEn} {model.nameEn}</p>}

            {/* Make logo + meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 28, height: 28, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={20} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{translations[locale].carsPage.countryNames[make.country] ?? make.country}</span>
              <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
              <SharePopup title={`${makeName} ${modelName} — ${cp.shareTitle}`} url={`${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}`} />
            </div>

            {/* Score columns */}
            <div className="score-cols">
              <div className="score-col">
                <div className="cap">{isEn ? 'Expert Score' : 'ציון מומחה'}</div>
                <div className="big" style={{ color: expertReview?.topScore != null ? 'var(--accent)' : 'var(--text-faint)' }}>
                  {expertReview?.topScore != null ? expertReview.topScore.toFixed(1) : '—'}
                </div>
                <div className="cnt">{isEn ? 'out of 10' : 'מתוך 10'}</div>
              </div>
              <div className="score-col">
                <div className="cap">{isEn ? 'Owner Rating' : 'דירוג בעלים'}</div>
                <div className="big">{avgRating !== null ? avgRating.toFixed(1) : '—'}</div>
                <div className="cnt">
                  {avgRating !== null
                    ? <><StarRating rating={avgRating} size={11} />{` · ${allReviews.length} ${isEn ? 'reviews' : 'ביקורות'}`}</>
                    : (isEn ? 'No reviews yet' : 'עדיין אין ביקורות')}
                </div>
              </div>
            </div>

            {/* Year pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{cp.yearLabel}:</span>
              {model.years.slice(0, 8).map(y => (
                <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} className="year-pill" style={{ fontSize: '0.65rem', padding: '2px 8px', minWidth: 'auto' }}>{y}</Link>
              ))}
            </div>

            {/* Action buttons */}
            <div className="model-hero-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href={`/cars/compare?car1=${make.slug}/${model.slug}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 14 }}>
                {isEn ? 'Compare' : '⚖️ השוואה'}
              </Link>
              <a href="#reviews" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 14 }}>
                {isEn ? 'Reviews' : 'ביקורות'}
              </a>
              <Link href={`/cars/${make.slug}/${model.slug}/issues`} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 14 }}>
                {cp.issuesLink}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIDEBAR + CONTENT ────────── */}
      <CarSidebarLayout
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={make.nameHe}
        modelNameHe={model.nameHe}
        defaultYear={model.years[0]}
      >
        {/* Two-column: user reviews left, external sources right */}
        <style>{`
          .model-reviews-split { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; margin-bottom: 40px; }
          @media (max-width: 800px) { .model-reviews-split { grid-template-columns: 1fr !important; gap: 16px; } }
        `}</style>
        <div className="model-reviews-split">
          {/* Left: user reviews */}
          <div id="reviews">
            {/* Owner score summary */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                {cpOwners}
              </div>
              {avgRating !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1, fontFamily: "var(--font-display)" }}>{avgRating.toFixed(1)}</div>
                  <div>
                    <StarRating rating={avgRating} size={15} />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{allReviews.length} {cpOwnerSuffix}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{cpNoReviews}</div>
              )}
              {/* Compact year selector */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{cpYearLabel}</span>
                {model.years.map((y) => (
                  <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} className="year-pill" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>{y}</Link>
                ))}
              </div>
            </div>

            {allReviews.length === 0 && (
              <FirstReviewCta makeNameHe={make.nameHe} modelNameHe={model.nameHe} makeNameEn={make.nameEn} modelNameEn={model.nameEn} />
            )}
            <ModelReviewsSection
              makeSlug={makeSlug}
              modelSlug={modelSlug}
              years={model.years}
              trims={isEn ? undefined : model.trims}
              initialReviews={allReviews}
            />
          </div>

          {/* Right: external source summaries */}
          <div id="expert">
            <ExpertReviewsSection
              review={expertReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              makeNameEn={make.nameEn}
              modelNameEn={model.nameEn}
              userAvgRating={avgRating}
              userReviewCount={allReviews.length}
              inline={!!sketchfabModel}
              label={cpExternalReviews}
              hideTitle
            />
          </div>
        </div>

        <div id="repair" />
        <RepairCostsSection
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
          makeNameEn={make.nameEn}
          modelNameEn={model.nameEn}
          category={model.category}
        />

        <div id="recalls" style={{ marginTop: 48 }}>
          <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} years={model.years} />
        </div>

        {/* Similar models */}
        {similarModels.length > 0 && (
          <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 18 }}>
              {cp.similarModels}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {similarModels.map(({ makeSlug: ms, makeNameHe, makeNameEn, model: m }) => (
                <Link
                  key={`browse-${ms}/${m.slug}`}
                  href={`/cars/${ms}/${m.slug}`}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: '0.85rem',
                    background: 'var(--surface-2)', color: 'var(--text)',
                    textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}
                >
                  {isEn ? `${makeNameEn} ${m.nameEn}` : `${makeNameHe} ${m.nameHe}`}
                </Link>
              ))}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
              {cp.compareWith} {makeName} {modelName} {cp.compareVs}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {similarModels.slice(0, 6).map(({ makeSlug: ms, makeNameHe, makeNameEn, model: m }) => {
                const [s1, s2] = [`${makeSlug}/${modelSlug}`, `${ms}/${m.slug}`].sort();
                return (
                  <Link
                    key={`cmp-${ms}/${m.slug}`}
                    href={`/cars/compare/${s1}/${s2}`}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem',
                      background: 'transparent', color: 'var(--accent)',
                      textDecoration: 'none', border: '1px solid var(--accent)', whiteSpace: 'nowrap',
                    }}
                  >
                    {isEn ? `${makeNameEn} ${m.nameEn}` : `${makeNameHe} ${m.nameHe}`}
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
      </CarSidebarLayout>
    </div>
  );
}

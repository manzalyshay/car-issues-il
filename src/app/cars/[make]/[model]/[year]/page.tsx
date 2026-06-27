import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { getReviewsForCar, getAverageRating } from '@/lib/reviewsDb';
import { getExpertReviewsForYear } from '@/lib/expertReviews';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { findCarModel } from '@/lib/sketchfab';
import { getImagesForCar } from '@/lib/carImages';
import StarRating from '@/components/StarRating';
import ExpertReviewsSection from '@/components/ExpertReviewsSection';
import CarYearClient from './CarYearClient';
import MakeLogo from '@/components/MakeLogo';
import SharePopup from '@/components/SharePopup';
import RecallsSection from '@/components/RecallsSection';
import RecallsBadge from '@/components/RecallsBadge';
import RepairCostsSection from '@/components/RepairCostsSection';
import Car3DViewer from '@/components/Car3DViewer';
import CarSidebarLayout from '../CarSidebarLayout';
import FirstReviewCta from '../FirstReviewCta';

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string; year: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug, year } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make || !model) return {};
  const yearNum = parseInt(year);
  const base = getBaseUrl(locale);
  const url = `${base}/cars/${make.slug}/${model.slug}/${year}`;

  const [avgRating, reviews, trims, { review: metaExpertReview }] = await Promise.all([
    getAverageRating(makeSlug, modelSlug),
    getReviewsForCar(makeSlug, modelSlug, yearNum),
    getTrimSpecs(makeSlug, modelSlug, yearNum),
    getExpertReviewsForYear(makeSlug, modelSlug, yearNum),
  ]);

  const trimsWithPrice = trims.filter(t => t.priceIls);
  const minPrice = trimsWithPrice.length > 0 ? Math.min(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const maxPrice = trimsWithPrice.length > 0 ? Math.max(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const priceDesc = minPrice && maxPrice && minPrice !== maxPrice
    ? ` מחיר: ₪${Math.round(minPrice / 1000)}K–₪${Math.round(maxPrice / 1000)}K.`
    : minPrice ? ` מחיר מומלץ: ₪${minPrice.toLocaleString('he-IL')}.` : '';
  const trimNames = trims.slice(0, 4).map(t => t.name).join(', ');
  const trimDesc = trimNames ? ` גימורים: ${trimNames}${trims.length > 4 ? ' ועוד' : ''}.` : '';

  const expertDesc = reviews.length === 0 && metaExpertReview
    ? (() => {
        const parts = [metaExpertReview.pros[0], metaExpertReview.cons[0]].filter(Boolean).join(' · ');
        return parts ? ` ${parts}.` : '';
      })()
    : '';

  if (locale === 'en') {
    const reviewPart = reviews.length > 0
      ? `${reviews.length} reviews${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
      : 'Reviews & Common Problems';
    return {
      title: `${make.nameEn} ${model.nameEn} ${year} — ${reviewPart} | Pros & Cons`,
      description: `${reviews.length > 0 ? `${reviews.length} real owner reviews` : 'Real owner reviews'} for the ${make.nameEn} ${model.nameEn} ${year}${avgRating ? `. Average rating ${avgRating.toFixed(1)}/5` : ''}. Common problems, pros, cons and reliability.`,
      alternates: { canonical: url, languages: { he: `https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`, en: url } },
      openGraph: {
        title: `${make.nameEn} ${model.nameEn} ${year} | CarIssues`,
        description: `Owner reviews & common problems — ${make.nameEn} ${model.nameEn} ${year}`,
        url,
        images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
      },
    };
  }

  const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
  const reviewPart = reviews.length > 0
    ? `${reviews.length} ביקורות אמיתיות${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
    : 'ביקורות ובעיות נפוצות';
  return {
    title: `${make.nameHe} ${model.nameHe} ${year} — ${reviewPart} | יתרונות וחסרונות`,
    description: `${reviews.length > 0 ? `${reviews.length} ביקורות אמיתיות על` : 'חוות דעת על'} ${make.nameHe} ${model.nameHe} ${year} (${make.nameEn} ${model.nameEn})${avgRating ? ` — דירוג ממוצע ${avgRating.toFixed(1)}/5` : ''}.${expertDesc}${priceDesc}${trimDesc} יתרונות, חסרונות ובעיות נפוצות מבעלי רכב בישראל.`,
    alternates: { canonical: url, languages: { he: url, en: `https://carissues.net/cars/${make.slug}/${model.slug}/${year}` } },
    openGraph: {
      title: `${make.nameHe} ${model.nameHe} ${year}${ratingStr} | CarIssues IL`,
      description: `ביקורות ובעיות נפוצות — ${make.nameHe} ${model.nameHe} ${year}`,
      url,
      images: [{ url: '/og-default.svg', width: 1200, height: 630 }],
    },
  };
}

export default async function CarYearPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug, year } = await params;
  const [locale, make, model] = await Promise.all([
    getHostLocale(), getMakeBySlug(makeSlug), getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make) notFound();
  if (!model) notFound();

  const yearNum = parseInt(year);
  if (!model.years.includes(yearNum)) notFound();

  const [reviews, { review: yearReview, isYearSpecific }, sketchfabModel, similarModels, carImages] = await Promise.all([
    getReviewsForCar(makeSlug, modelSlug, yearNum),
    getExpertReviewsForYear(makeSlug, modelSlug, yearNum),
    findCarModel(makeSlug, modelSlug).catch(() => null),
    getSimilarModels(makeSlug, modelSlug, model.category, 8).catch(() => []),
    getImagesForCar(makeSlug, modelSlug).catch(() => []),
  ]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const isEn = locale === 'en';
  const cp = translations[locale].carPage;
  const yp = translations[locale].yearPage;
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: `${make.nameEn} ${model.nameEn} ${year}`,
        brand: { '@type': 'Brand', name: make.nameEn },
        url: `${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}/${year}`,
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
            acceptedAnswer: { '@type': 'Answer', text: `${make.nameHe} ${model.nameHe} ${year} מקבל דירוג ממוצע של ${avgRating.toFixed(1)} מתוך 5 על בסיס ${reviews.length} ביקורות.` },
          },
        ].filter(Boolean),
      }] : []),
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── YEAR HERO — same look as model page ── */}
      <div className="wrap" style={{ paddingBottom: 32 }}>

        {/* Breadcrumb */}
        <nav className="model-breadcrumb">
          <Link href="/">{translations[locale].carsPage.home}</Link>
          <span>›</span>
          <Link href="/cars">{translations[locale].carsPage.makes}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}`}>{makeName}</Link>
          <span>›</span>
          <Link href={`/cars/${make.slug}/${model.slug}`}>{modelName}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{year}</span>
        </nav>

        {/* Gallery + summary grid */}
        <div className="model-hero">

          {/* Left: gallery */}
          <div>
            <div className="gallery-main">
              {sketchfabModel ? (
                <Car3DViewer uid={sketchfabModel.uid} modelName={`${make.nameHe} ${model.nameHe}`} makeSlug={makeSlug} modelSlug={modelSlug} />
              ) : carImages.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={carImages[0].thumbnail_url ?? carImages[0].url}
                  alt={`${make.nameEn} ${model.nameEn} ${year}`}
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
                    {make.nameEn} {model.nameEn} {year}
                  </span>
                </div>
              )}
            </div>
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

          {/* Right: summary card */}
          <div className="model-summary">
            <div className="yr">
              {year}{' · '}{getCategoryLabel(model.category, locale)}
            </div>
            <h1>{isEn ? `${make.nameEn} ${model.nameEn} ${year}` : `${make.nameHe} ${model.nameHe} ${year}`}</h1>
            {!isEn && <p style={{ fontSize: 14, color: 'var(--text-faint)', marginTop: 2 }}>{make.nameEn} {model.nameEn} {year}</p>}

            {/* Make logo + meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 28, height: 28, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={20} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{translations[locale].carsPage.countryNames[make.country] ?? make.country}</span>
              <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />
              <SharePopup title={`${makeName} ${modelName} ${year} — ${cp.shareTitle}`} url={`${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}/${year}`} />
            </div>

            {/* Score columns */}
            <div className="score-cols">
              <div className="score-col">
                <div className="cap">{isEn ? 'Expert Score' : 'ציון מומחה'}</div>
                <div className="big" style={{ color: yearReview?.topScore != null ? 'var(--accent)' : 'var(--text-faint)' }}>
                  {yearReview?.topScore != null ? yearReview.topScore.toFixed(1) : '—'}
                </div>
                <div className="cnt">{isEn ? 'out of 10' : 'מתוך 10'}</div>
              </div>
              <div className="score-col">
                <div className="cap">{isEn ? 'Owner Rating' : 'דירוג בעלים'}</div>
                <div className="big">{avgRating !== null ? avgRating.toFixed(1) : '—'}</div>
                <div className="cnt">
                  {avgRating !== null
                    ? <><StarRating rating={avgRating} size={11} />{` · ${reviews.length} ${isEn ? 'reviews' : 'ביקורות'}`}</>
                    : (isEn ? 'No reviews yet' : 'עדיין אין ביקורות')}
                </div>
              </div>
            </div>

            {/* Year pills — highlight current year */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{cp.yearLabel}:</span>
              {model.years.slice(0, 8).map(y => (
                y === yearNum ? (
                  <Link key={y} href={`/cars/${make.slug}/${model.slug}`} className="year-pill" style={{ fontSize: '0.65rem', padding: '2px 8px', minWidth: 'auto', background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>{y}</Link>
                ) : (
                  <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} className="year-pill" style={{ fontSize: '0.65rem', padding: '2px 8px', minWidth: 'auto' }}>{y}</Link>
                )
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

      {/* ── SIDEBAR + CONTENT ── */}
      <CarSidebarLayout
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={make.nameHe}
        modelNameHe={model.nameHe}
        defaultYear={yearNum}
      >
        <style>{`
          .model-reviews-split { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; margin-bottom: 40px; }
          @media (max-width: 800px) { .model-reviews-split { grid-template-columns: 1fr !important; gap: 16px; } }
        `}</style>
        <div className="model-reviews-split">
          {/* Left: year reviews */}
          <div id="reviews">
            {/* Owner score summary */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                {cp.ownersLabel} · {year}
              </div>
              {avgRating !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>{avgRating.toFixed(1)}</div>
                  <div>
                    <StarRating rating={avgRating} size={15} />
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviews.length} {cp.ownerReviewsSuffix}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{cp.noReviewsBeFirst}</div>
              )}
              {/* Year selector */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{cp.yearLabel}</span>
                {model.years.map((y) => (
                  y === yearNum ? (
                    <Link key={y} href={`/cars/${make.slug}/${model.slug}`} className="year-pill" style={{ fontSize: '0.68rem', padding: '1px 7px', background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>{y}</Link>
                  ) : (
                    <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} className="year-pill" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>{y}</Link>
                  )
                ))}
              </div>
            </div>

            {reviews.length === 0 && (
              <FirstReviewCta makeNameHe={make.nameHe} modelNameHe={model.nameHe} makeNameEn={make.nameEn} modelNameEn={model.nameEn} />
            )}

            <CarYearClient
              makeSlug={makeSlug}
              modelSlug={modelSlug}
              year={yearNum}
              initialReviews={reviews}
              isYearSpecific={isYearSpecific}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
            />
          </div>

          {/* Right: expert review for this year */}
          <div id="expert">
            <ExpertReviewsSection
              review={yearReview}
              makeNameHe={make.nameHe}
              modelNameHe={model.nameHe}
              makeNameEn={make.nameEn}
              modelNameEn={model.nameEn}
              year={yearNum}
              isYearSpecific={isYearSpecific}
              userAvgRating={avgRating}
              userReviewCount={reviews.length}
              inline={!!sketchfabModel}
              label={cp.externalReviews}
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
          <RecallsSection makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </CarSidebarLayout>
    </div>
  );
}

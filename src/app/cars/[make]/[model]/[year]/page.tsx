import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { findCarModel } from '@/lib/sketchfab';
import { getImagesForYear } from '@/lib/carImages';
import { getModelRepairCosts } from '@/lib/repairCostsDb';
import { getRecallsFromCache } from '@/lib/recallsDb';
import { isModelYearIndexable } from '@/lib/seoIndexing';
import SharePopup from '@/components/SharePopup';
import RecallsBadge from '@/components/RecallsBadge';
import HeroMedia from '@/components/HeroMedia';
import CarSidebarLayout from '../CarSidebarLayout';
import ModelReviewsSection from '../ModelReviewsSection';
import VerdictCard from '@/components/VerdictCard';
import RepairCostsSection from '@/components/RepairCostsSection';
import SellerPriceChart from '@/components/SellerPriceChart';
import RecallsBarChart from '@/components/RecallsBarChart';
import FollowButton from '@/components/FollowButton';

export const revalidate = 86400;

interface Props { params: Promise<{ make: string; model: string; year: string }> }

// New-car list prices below this are bad scraped data (e.g. monthly lease figures)
const MIN_PLAUSIBLE_PRICE_ILS = 20000;

function getPriceRange(trims: { priceIls?: number | null }[]): { minPrice: number | null; maxPrice: number | null } {
  const prices = trims
    .map(t => t.priceIls)
    .filter((p): p is number => typeof p === 'number' && p >= MIN_PLAUSIBLE_PRICE_ILS);
  if (prices.length === 0) return { minPrice: null, maxPrice: null };
  return { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
}

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

  const [allReviews, trims, metaExpertReviewsList, metaRecalls] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug, yearNum).catch(() => []),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    getRecallsFromCache(make.nameEn, model.nameEn).catch(() => []),
  ]);

  const metaExpertReview = Array.isArray(metaExpertReviewsList) ? (metaExpertReviewsList[0] ?? null) : null;

  const yearReviews = allReviews.filter(r => r.year === yearNum);
  const avgRating = yearReviews.length
    ? yearReviews.reduce((s, r) => s + r.rating, 0) / yearReviews.length
    : null;

  const { minPrice, maxPrice } = getPriceRange(trims);
  const priceHook = minPrice
    ? ` · ₪${Math.round(minPrice / 1000)}K${maxPrice && maxPrice !== minPrice ? `–₪${Math.round(maxPrice / 1000)}K` : ''}`
    : '';
  const priceDesc = minPrice && maxPrice && minPrice !== maxPrice
    ? ` מחיר: ₪${Math.round(minPrice / 1000)}K–₪${Math.round(maxPrice / 1000)}K.`
    : minPrice ? ` מחיר מומלץ: ₪${minPrice.toLocaleString('he-IL')}.` : '';
  const trimNames = trims.slice(0, 4).map(t => t.name).join(', ');
  const trimDesc = trimNames ? ` גימורים: ${trimNames}${trims.length > 4 ? ' ועוד' : ''}.` : '';
  const indexable = await isModelYearIndexable(makeSlug, modelSlug, yearNum, model.years ?? []);

  if (locale === 'en') {
    const ratingStr = avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : '';
    const reviewPart = yearReviews.length > 0
      ? `${yearReviews.length} owner reviews${ratingStr}`
      : 'Reviews & Reliability';
    const expertPart = metaExpertReview?.topScore != null ? ` Expert score: ${metaExpertReview.topScore.toFixed(1)}/10.` : '';
    const prosPart = metaExpertReview?.prosEn?.[0] ? ` Pros: ${metaExpertReview.prosEn[0]}.` : '';
    const consPart = metaExpertReview?.consEn?.[0] ? ` Cons: ${metaExpertReview.consEn[0]}.` : '';
    const recallPart = metaRecalls.length > 0 ? ` ${metaRecalls.length} recall${metaRecalls.length > 1 ? 's' : ''}.` : '';
    return {
      title: `${make.nameEn} ${model.nameEn} ${year} — ${reviewPart} | Specs & Price`,
      description: `${yearReviews.length > 0 ? `${yearReviews.length} real owner reviews` : 'Real owner reviews'} for the ${make.nameEn} ${model.nameEn} ${year}${avgRating ? `. Average rating ${avgRating.toFixed(1)}/5` : ''}.${expertPart}${prosPart}${consPart}${recallPart} Common problems and reliability.`,
      robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
      alternates: { canonical: url, languages: { he: `https://carissues.co.il/cars/${make.slug}/${model.slug}/${year}`, en: url, 'x-default': url } },
      openGraph: { title: `${make.nameEn} ${model.nameEn} ${year} | CarIssues`, description: `Owner reviews & reliability — ${make.nameEn} ${model.nameEn} ${year}`, url, images: [{ url: '/og-default.png', width: 1200, height: 630 }] },
    };
  }

  const ratingStr = avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : '';
  const reviewPart = yearReviews.length > 0
    ? `${yearReviews.length} ביקורות בעלים${ratingStr}`
    : 'חוות דעת ואמינות';
  const recallPartHe = metaRecalls.length > 0 ? ` ${metaRecalls.length} ריקולים.` : '';
  return {
    title: `${make.nameHe} ${model.nameHe} ${year}${priceHook} — ${reviewPart} | מחיר, מפרט ואמינות`,
    description: `${yearReviews.length > 0 ? `${yearReviews.length} ביקורות אמיתיות על` : 'כל מה שצריך לדעת על'} ${make.nameHe} ${model.nameHe} ${year} (${make.nameEn} ${model.nameEn})${avgRating ? ` — דירוג ממוצע ${avgRating.toFixed(1)}/5` : ''}.${priceDesc}${trimDesc}${recallPartHe} יתרונות, חסרונות ובעיות נפוצות מבעלי רכב בישראל.`,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical: url, languages: { he: url, en: `https://carissues.net/cars/${make.slug}/${model.slug}/${year}`, 'x-default': `https://carissues.net/cars/${make.slug}/${model.slug}/${year}` } },
    openGraph: { title: `${make.nameHe} ${model.nameHe} ${year}${ratingStr} | CarIssues IL`, description: `ביקורות ואמינות — ${make.nameHe} ${model.nameHe} ${year}`, url, images: [{ url: '/og-default.png', width: 1200, height: 630 }] },
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

  const [allReviews, expertReviewsList, sketchfabModel, similarModels, carImages, modelRepairCosts, trimSpecs] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    findCarModel(makeSlug, modelSlug, yearNum).catch(() => null),
    getSimilarModels(makeSlug, modelSlug, model.category, 4).catch(() => []),
    getImagesForYear(makeSlug, modelSlug, yearNum).catch(() => []),
    getModelRepairCosts(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug, yearNum).catch(() => []),
  ]);
  const { minPrice: schemaMinPrice, maxPrice: schemaMaxPrice } = getPriceRange(trimSpecs);

  const expertReview = Array.isArray(expertReviewsList) ? (expertReviewsList[0] ?? null) : null;

  // Year-specific stats for the hero — model page shows all-time avg
  const yearReviews = allReviews.filter(r => r.year === yearNum);
  const avgRating = yearReviews.length
    ? yearReviews.reduce((s, r) => s + r.rating, 0) / yearReviews.length
    : null;
  // All-time avg for VerdictCard (consistent with model page)
  const allAvgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const cp = translations[locale].carPage;
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  // 3D relevance: if year_from/year_to set, the lookup already returned the right model;
  // fall back to name-based year check for legacy entries without year range
  const relevantSketchfabModel = (() => {
    if (!sketchfabModel) return null;
    if (sketchfabModel.yearFrom != null) return sketchfabModel; // year-aware lookup handled it
    const m = sketchfabModel.name.match(/\b(19|20)\d{2}\b/);
    if (!m) return sketchfabModel;
    const fab3dYear = parseInt(m[0]);
    if (fab3dYear < yearNum - 12) return null;
    return sketchfabModel;
  })();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── MODEL HERO — same dark navy as model page ── */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(180deg,#0d1b2f,#12294a)',
        color: '#fff',
        padding: '8px clamp(16px,3vw,32px) 14px',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .5, background: 'radial-gradient(60% 70% at 82% 0%, rgba(23,64,143,.9), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9db1d4', paddingBottom: 8, flexWrap: 'wrap', direction: isEn ? 'ltr' : 'rtl' }}>
            <Link href="/" style={{ color: '#9db1d4', textDecoration: 'none' }}>{translations[locale].carsPage.home}</Link>
            <span>›</span>
            <Link href="/cars" style={{ color: '#9db1d4', textDecoration: 'none' }}>{translations[locale].carsPage.makes}</Link>
            <span>›</span>
            <Link href={`/cars/${make.slug}`} style={{ color: '#9db1d4', textDecoration: 'none' }}>{makeName}</Link>
            <span>›</span>
            <Link href={`/cars/${make.slug}/${model.slug}`} style={{ color: '#9db1d4', textDecoration: 'none' }}>{modelName}</Link>
            <span>›</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{year}</span>
          </nav>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 'clamp(14px,2vw,26px)', alignItems: 'center' }}>

            {/* Info column */}
            <div>
              <div style={{ fontSize: 12.5, color: '#9db1d4', fontWeight: 600 }}>
                {year} · {getCategoryLabel(model.category, locale)} · {translations[locale].carsPage.countryNames[make.country] ?? make.country}
              </div>
              <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(21px,2.2vw,30px)', lineHeight: 1.1, letterSpacing: '-.04em', margin: '4px 0 2px', color: '#fff' }}>
                {isEn ? `${make.nameEn} ${model.nameEn} ${year}` : `${make.nameHe} ${model.nameHe} ${year}`}
              </h1>
              {!isEn && <div style={{ fontSize: 13.5, color: '#9db1d4' }}>{make.nameEn} {model.nameEn} {year}</div>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 9, flexWrap: 'wrap' }}>
                {avgRating !== null && (
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 27, letterSpacing: '-.05em', lineHeight: 1, color: '#fff' }}>
                      {(avgRating * 2).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 12.5, color: '#9db1d4', fontWeight: 700 }}>/10</span>
                  </span>
                )}
                {avgRating !== null && avgRating >= 4 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2f', background: '#3ddc84', padding: '4px 11px', borderRadius: 999 }}>
                    {isEn ? 'Recommended' : 'מומלץ'}
                  </span>
                )}
                <span style={{ fontSize: 12.5, color: '#9db1d4' }}>
                  {yearReviews.length} {isEn ? `owner reviews (${year})` : `ביקורות בעלים (${year})`}
                </span>
                <RecallsBadge makeEn={make.nameEn} modelEn={model.nameEn} year={yearNum} />
              </div>

              {/* Year selector pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                <span style={{ fontSize: 11, color: '#9db1d4', fontWeight: 600 }}>{cp.yearLabel}:</span>
                {model.years.slice(0, 10).map(y => (
                  y === yearNum ? (
                    <span key={y} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#fff', color: '#0d1b2f', fontWeight: 700 }}>{y}</span>
                  ) : (
                    <Link key={y} href={`/cars/${make.slug}/${model.slug}/${y}`} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,.28)', color: '#9db1d4', textDecoration: 'none' }}>{y}</Link>
                  )
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                <FollowButton makeSlug={make.slug} modelSlug={model.slug} isEn={isEn} dark />
                <Link
                  href={`/cars/compare?car1=${make.slug}/${model.slug}`}
                  style={{ border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.08)', color: '#fff', fontWeight: 700, fontSize: 13.5, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  {isEn ? 'Compare' : 'השוואה'}
                </Link>
                <SharePopup title={`${makeName} ${modelName} ${year} — ${cp.shareTitle}`} url={`${base}/cars/${make.slug}/${model.slug}/${year}`} dark />
              </div>
            </div>

            {/* Hero media */}
            <HeroMedia
              images={carImages}
              sketchfabModel={relevantSketchfabModel}
              makeSlug={make.slug}
              modelSlug={model.slug}
              makeNameEn={make.nameEn}
              modelNameEn={model.nameEn}
              yearRange={year}
              categoryLabel={getCategoryLabel(model.category, locale)}
            />
          </div>
        </div>
      </section>

      {/* ── SIDEBAR + CONTENT ── */}
      <CarSidebarLayout
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={make.nameHe}
        modelNameHe={model.nameHe}
        makeNameEn={make.nameEn}
        modelNameEn={model.nameEn}
        makeEn={make.nameEn}
        modelEn={model.nameEn}
        modelYears={model.years}
        defaultYear={yearNum}
        hasSpecs={trimSpecs.length > 0}
        hasImages={carImages.length > 0 || relevantSketchfabModel !== null}
        hasRepairCosts={modelRepairCosts.length > 0}
        sketchfabModel={relevantSketchfabModel}
        year={yearNum}
      >
        {/* ── Owner reviews — pre-filtered to this year ── */}
        <div id="reviews" style={{ paddingTop: 0 }}>
          <ModelReviewsSection
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={model.years}
            trims={isEn ? undefined : model.trims}
            initialReviews={allReviews}
            initialYear={yearNum}
          />
        </div>

        {/* ── AI Verdict Card ── */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, color: '#8595a6', background: '#f0f4f8', border: '1px solid #dde3ea', borderRadius: 8, padding: '6px 12px', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>ℹ️</span>
            <span>{isEn ? `AI summary covers the full ${make.nameEn} ${model.nameEn} model range, not ${year} only.` : `סיכום ה-AI מתייחס לדגם ${make.nameHe} ${model.nameHe} בכלל, לא רק לשנת ${year}.`}</span>
          </div>
          <VerdictCard
            expertReview={expertReview as Parameters<typeof VerdictCard>[0]['expertReview']}
            repairCosts={modelRepairCosts}
            trimSpecs={trimSpecs}
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
            makeNameEn={make.nameEn}
            modelNameEn={model.nameEn}
            isEn={isEn}
            avgRating={allAvgRating}
            reviewCount={allReviews.length}
          />
        </div>

        {/* ── Market value + Recalls bar charts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 480px))', gap: 16, marginTop: 40, marginBottom: 28 }}>
          <SellerPriceChart
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            makeEn={make.nameEn}
            modelEn={model.nameEn}
            isEn={isEn}
          />
          <RecallsBarChart
            makeEn={make.nameEn}
            modelEn={model.nameEn}
            years={model.years}
            isEn={isEn}
          />
        </div>

        {/* ── Repair costs ── */}
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

        {/* Similar models */}
        {similarModels.length > 0 && (
          <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
              {cp.similarModels}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {similarModels.map(({ makeSlug: ms, makeNameHe, makeNameEn, model: m }) => (
                <Link
                  key={`browse-${ms}/${m.slug}`}
                  href={`/cars/${ms}/${m.slug}`}
                  style={{ padding: '7px 14px', borderRadius: 20, fontSize: '0.85rem', background: 'var(--surface-2)', color: 'var(--text)', textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}
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
                    style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', background: 'transparent', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', whiteSpace: 'nowrap' }}
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
                // Google rejects Product without offers, review or aggregateRating
                ...((schemaMinPrice !== null || yearReviews.length > 0) ? [{
                  '@type': 'Product',
                  name: `${make.nameEn} ${model.nameEn} ${year}`,
                  brand: { '@type': 'Brand', name: make.nameEn },
                  url: `${base}/cars/${make.slug}/${model.slug}/${year}`,
                  ...(schemaMinPrice !== null && schemaMaxPrice !== null && {
                    offers: {
                      '@type': 'AggregateOffer',
                      priceCurrency: 'ILS',
                      lowPrice: schemaMinPrice,
                      highPrice: schemaMaxPrice,
                      offerCount: trimSpecs.filter(t => (t.priceIls ?? 0) >= MIN_PLAUSIBLE_PRICE_ILS).length,
                    },
                  }),
                  ...(avgRating !== null && {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: avgRating.toFixed(1),
                      reviewCount: yearReviews.length,
                      bestRating: 5,
                      worstRating: 1,
                    },
                  }),
                  review: yearReviews.slice(0, 5).map(r => ({
                    '@type': 'Review',
                    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
                    name: isEn ? (r.titleEn ?? r.title) : r.title,
                    reviewBody: isEn ? (r.bodyEn ?? r.body) : r.body,
                    author: { '@type': 'Person', name: r.authorName },
                    datePublished: r.createdAt.split('T')[0],
                  })),
                }] : []),
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: base },
                    { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${base}/cars` },
                    { '@type': 'ListItem', position: 3, name: makeName, item: `${base}/cars/${make.slug}` },
                    { '@type': 'ListItem', position: 4, name: modelName, item: `${base}/cars/${make.slug}/${model.slug}` },
                    { '@type': 'ListItem', position: 5, name: String(year), item: `${base}/cars/${make.slug}/${model.slug}/${year}` },
                  ],
                },
              ],
            }),
          }}
        />
      </CarSidebarLayout>
    </div>
  );
}

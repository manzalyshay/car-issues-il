import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels } from '@/lib/carsDb';
import { getReviewsForModel, getAverageRating } from '@/lib/reviewsDb';
import ReviewNudge from '@/components/ReviewNudge';
import { findCarModel } from '@/lib/sketchfab';
import { getExpertReviews } from '@/lib/expertReviews';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { getModelRepairCosts } from '@/lib/repairCostsDb';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';
import ModelReviewsSection from './ModelReviewsSection';
import SharePopup from '@/components/SharePopup';
import CarSidebarLayout from './CarSidebarLayout';
import RepairCostsSection from '@/components/RepairCostsSection';
import { getImagesForCar } from '@/lib/carImages';
import SellerPriceChart from '@/components/SellerPriceChart';
import RecallsBarChart from '@/components/RecallsBarChart';
import FuelComparisonChart from '@/components/FuelComparisonChart';
import VerdictCard from '@/components/VerdictCard';
import FollowButton from '@/components/FollowButton';
import HeroMedia from '@/components/HeroMedia';
import ModelFaq from '@/components/ModelFaq';
import HeroYearPicker from '@/components/HeroYearPicker';
import { getRecallsFromCache } from '@/lib/recallsDb';


export const revalidate = 900; // cache 15 minutes

interface Props {
  params: Promise<{ make: string; model: string }>;
  searchParams: Promise<{ tab?: string }>;
}

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
    getAverageRating(makeSlug, modelSlug).catch(() => null),
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
  ]);
  const yearRange = model.years.length > 1
    ? `${model.years[model.years.length - 1]}-${model.years[0]}`
    : model.years.length === 1 ? `${model.years[0]}` : '';
  const yearSuffix = yearRange ? ` ${yearRange}` : '';

  if (locale === 'en') {
    const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
    const reviewPart = reviews.length > 0
      ? `${reviews.length} reviews${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
      : 'Reviews & Common Problems';
    return {
      title: `${make.nameEn} ${model.nameEn}${yearSuffix}: ${reviewPart} | Pros & Cons`,
      description: `${reviews.length > 0 ? `${reviews.length} real owner reviews` : 'Real owner reviews'} for the ${make.nameEn} ${model.nameEn}${yearRange ? ` (${yearRange})` : ''}${avgRating ? `. Average rating ${avgRating.toFixed(1)}/5` : ''}. Price history 2016-2026, common problems, pros, cons and reliability from real car owners.`,
      alternates: { canonical: url, languages: { he: `https://carissues.co.il/cars/${make.slug}/${model.slug}`, en: url, 'x-default': url } },
      openGraph: {
        title: `${make.nameEn} ${model.nameEn}${ratingStr} | CarIssues`,
        description: `Owner reviews & common problems: ${make.nameEn} ${model.nameEn}${yearSuffix}`,
        url,
        images: [{ url: '/og-default.png', width: 1200, height: 630 }],
      },
    };
  }

  const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
  const countStr = reviews.length > 0 ? ` · ${reviews.length} ביקורות` : '';
  const trimsWithPrice = trims.filter(t => t.priceIls);
  const minPrice = trimsWithPrice.length > 0 ? Math.min(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const maxPrice = trimsWithPrice.length > 0 ? Math.max(...trimsWithPrice.map(t => t.priceIls!)) : null;
  const priceDesc = minPrice && maxPrice && minPrice !== maxPrice
    ? ` מחיר: ₪${Math.round(minPrice / 1000)}K-₪${Math.round(maxPrice / 1000)}K.`
    : minPrice ? ` מחיר מומלץ: ₪${minPrice.toLocaleString('he-IL')}.` : '';
  const trimNames = trims.slice(0, 6).map(t => t.name).join(', ');
  const trimDesc = trimNames ? ` גימורים: ${trimNames}${trims.length > 6 ? ' ועוד' : ''}.` : '';
  const reviewPart = reviews.length > 0
    ? `${reviews.length} חוות דעת${avgRating ? ` ⭐ ${avgRating.toFixed(1)}` : ''}`
    : 'חוות דעת ובעיות נפוצות';
  const recentYears = model.years.slice(0, 4).join(', ');
  return {
    title: `${make.nameHe} ${model.nameHe}${yearSuffix}: ${reviewPart} | יתרונות וחסרונות`,
    description: `${reviews.length > 0 ? `${reviews.length} ביקורות אמיתיות` : 'ביקורות אמיתיות'} על ${make.nameHe} ${model.nameHe} (${make.nameEn} ${model.nameEn})${yearRange ? ` שנים ${yearRange}` : ''}${avgRating ? `. דירוג ממוצע ${avgRating.toFixed(1)}/5` : ''}.${priceDesc}${recentYears ? ` חוות דעת ${recentYears}.` : ''}${trimDesc} יתרונות, חסרונות ובעיות נפוצות מבעלי רכב בישראל.`,
    alternates: { canonical: url, languages: { he: url, en: `https://carissues.net/cars/${make.slug}/${model.slug}`, 'x-default': `https://carissues.net/cars/${make.slug}/${model.slug}` } },
    openGraph: {
      title: `${make.nameHe} ${model.nameHe}${ratingStr}${countStr} | CarIssues IL`,
      description: `ביקורות ובעיות נפוצות: ${make.nameHe} ${model.nameHe}${yearSuffix}`,
      url,
      images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
  };
}

export default async function ModelPage({ params, searchParams }: Props) {
  const [{ make: makeSlug, model: modelSlug }, { tab: initialTab }] = await Promise.all([params, searchParams]);
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make) notFound();
  if (!model) notFound();

  const [allReviews, expertReviewsList, sketchfabModel, similarModels, carImages, modelRepairCosts, trimSpecs, recalls] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    findCarModel(makeSlug, modelSlug).catch(() => null),
    getSimilarModels(makeSlug, modelSlug, model.category, 4).catch(() => []),
    getImagesForCar(makeSlug, modelSlug).catch(() => []),
    getModelRepairCosts(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
    getRecallsFromCache(make.nameEn, model.nameEn).catch(() => []),
  ]);
  const [similarRatings, similarImages] = await Promise.all([
    Promise.all(similarModels.map(({ makeSlug: ms, model: m }) => getAverageRating(ms, m.slug).catch(() => null))),
    Promise.all(similarModels.map(({ makeSlug: ms, model: m }) => getImagesForCar(ms, m.slug).catch(() => []))),
  ]);
  const expertReview = expertReviewsList[0] ?? null;
  const curatedModelData = expertReview?.curatedModelData ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  const isEn = locale === 'en';
  const cp = translations[locale].carPage;
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  const yearRange = model.years.length > 1
    ? `${model.years[model.years.length - 1]}-${model.years[0]}`
    : model.years.length === 1 ? `${model.years[0]}` : '';

  // 3D model relevance: year-aware lookup already handles year_from/year_to entries;
  // fall back to name-based check for legacy entries
  const relevantSketchfabModel = (() => {
    if (!sketchfabModel) return null;
    // Some search results are multi-asset packs rather than a model of this car.
    if (/\basset(?:s|'s)?\s+pack\b/i.test(sketchfabModel.name)) return null;
    if (sketchfabModel.yearFrom != null) return sketchfabModel;
    const m = sketchfabModel.name.match(/\b(19|20)\d{2}\b/);
    if (!m) return sketchfabModel;
    const fab3dYear = parseInt(m[0]);
    const newestCarYear = model.years[0] ?? new Date().getFullYear();
    if (fab3dYear < newestCarYear - 12) return null;
    return sketchfabModel;
  })();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── MODEL HERO — dark navy ─── */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(180deg,#0d1b2f,#12294a)',
        color: '#fff',
        padding: '8px clamp(16px,3vw,32px) 14px',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .5, background: 'radial-gradient(60% 70% at 82% 0%, rgba(23,64,143,.9), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>

          {/* Breadcrumb inside hero */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9db1d4', paddingBottom: 8, flexWrap: 'wrap', direction: isEn ? 'ltr' : 'rtl' }}>
            <Link href="/" style={{ color: '#9db1d4', textDecoration: 'none' }}>{translations[locale].carsPage.home}</Link>
            <span>›</span>
            <Link href="/cars" style={{ color: '#9db1d4', textDecoration: 'none' }}>{translations[locale].carsPage.makes}</Link>
            <span>›</span>
            <Link href={`/cars/${make.slug}`} style={{ color: '#9db1d4', textDecoration: 'none' }}>{makeName}</Link>
            <span>›</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{modelName}</span>
          </nav>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 'clamp(14px,2vw,26px)', alignItems: 'center' }}>

            {/* Info column */}
            <div>
              <div style={{ fontSize: 12.5, color: '#9db1d4', fontWeight: 600 }}>
                {yearRange ? `${yearRange} · ` : ''}{getCategoryLabel(model.category, locale)} · {translations[locale].carsPage.countryNames[make.country] ?? make.country}
              </div>
              <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(21px,2.2vw,30px)', lineHeight: 1.1, letterSpacing: '-.04em', margin: '4px 0 2px', color: '#fff' }}>
                {isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`}
              </h1>
              {!isEn && <div style={{ fontSize: 13.5, color: '#9db1d4' }}>{make.nameEn} {model.nameEn}</div>}

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
                {allReviews.length > 0 && (
                  <span style={{ fontSize: 12.5, color: '#9db1d4' }}>
                    {allReviews.length} {isEn ? 'owner reviews' : 'ביקורות בעלים'}
                  </span>
                )}
              </div>

              {model.activeVehiclesIl != null && model.activeVehiclesIl > 0 && (
                <div style={{ marginTop: 7, fontSize: 12, color: '#9db1d4' }}>
                  <span style={{ fontWeight: 700, color: '#c8d8f0' }}>
                    {model.activeVehiclesIl.toLocaleString('he-IL')}
                  </span>
                  {' '}{isEn ? 'active vehicles in Israel' : 'רכבים פעילים בישראל'}
                  <span style={{ opacity: 0.65, marginInlineStart: 4 }}>
                    ({isEn ? 'Oct 2026' : 'אוק׳ 2026'})
                  </span>
                </div>
              )}
              {model.activeVehiclesIl === 0 && curatedModelData?.on_sale_il !== false && (
                <div style={{ marginTop: 7, fontSize: 12, color: '#f0a050' }}>
                  {isEn ? 'Not currently marketed in Israel' : 'לא משווק כיום בישראל'}
                </div>
              )}
              {curatedModelData?.on_sale_il === false && curatedModelData.status_note && (
                <div style={{ marginTop: 7, fontSize: 12.5, color: '#f0a050', fontWeight: 700 }}>
                  {curatedModelData.status_note}
                </div>
              )}
              {curatedModelData?.on_sale_il === true && typeof curatedModelData.price_from_ils === 'number' && (
                <div style={{ marginTop: 7, fontSize: 12.5, color: '#9db1d4' }}>
                  <span style={{ color: '#c8d8f0', fontWeight: 700 }}>
                    {isEn ? `From ₪${curatedModelData.price_from_ils.toLocaleString('en-US')}` : `החל מ-${curatedModelData.price_from_ils.toLocaleString('he-IL')} ₪`}
                  </span>
                  {curatedModelData.price_note ? ` · ${curatedModelData.price_note}` : ''}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                <FollowButton makeSlug={make.slug} modelSlug={model.slug} isEn={isEn} dark />
                <Link
                  href={`/cars/compare?car1=${make.slug}/${model.slug}`}
                  style={{ border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.08)', color: '#fff', fontWeight: 700, fontSize: 13.5, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  {isEn ? 'Compare' : 'השוואה'}
                </Link>
                <SharePopup title={`${makeName} ${modelName}: ${cp.shareTitle}`} url={`${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}`} dark />
              </div>

              {/* Year quick-picker — filters images/videos in place */}
              {model.years.length > 1 && (
                <HeroYearPicker years={model.years} makeSlug={make.slug} modelSlug={model.slug} />
              )}
            </div>

            {/* Hero media — interactive with clickable thumbnails + year/trim badge */}
            <HeroMedia
              images={carImages}
              sketchfabModel={relevantSketchfabModel}
              makeSlug={make.slug}
              modelSlug={model.slug}
              makeNameEn={make.nameEn}
              modelNameEn={model.nameEn}
              yearRange={yearRange}
              categoryLabel={getCategoryLabel(model.category, locale)}
            />
          </div>
        </div>
      </section>


      {/* ── SIDEBAR + CONTENT ────────── */}
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
        defaultYear={model.years[0]}
        hasSpecs={trimSpecs.length > 0}
        hasTrimEquipment={trimSpecs.some(trim => trim.features.length > 0)}
        hasImages={carImages.length > 0 || relevantSketchfabModel !== null}
        hasRepairCosts={modelRepairCosts.length > 0}
        sketchfabModel={relevantSketchfabModel}
        initialTab={initialTab}
        safetyHe={expertReview?.safetyHe}
        techComfortHe={expertReview?.techComfortHe}
      >
        {/* ── Owner reviews — write review at top ── */}
        <div id="reviews" style={{ paddingTop: 0 }}>
          <ModelReviewsSection
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={model.years}
            trims={isEn ? undefined : model.trims}
            initialReviews={allReviews}
          />
        </div>

        {/* ── AI Verdict Card ── */}
        <div style={{ marginTop: 28 }}>
          <VerdictCard
            expertReview={expertReview}
            repairCosts={modelRepairCosts}
            trimSpecs={trimSpecs}
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            makeNameHe={make.nameHe}
            modelNameHe={model.nameHe}
            makeNameEn={make.nameEn}
            modelNameEn={model.nameEn}
            isEn={isEn}
            avgRating={avgRating}
            reviewCount={allReviews.length}
          />
        </div>

        {/* ── FAQ ── */}
        <ModelFaq
          trimSpecs={trimSpecs}
          expertReview={expertReview}
          avgRating={avgRating}
          reviewCount={allReviews.length}
          recallCount={recalls.length}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
          makeNameEn={make.nameEn}
          modelNameEn={model.nameEn}
          category={model.category}
          isEn={isEn}
        />

        {/* ── Market value + Recalls bar charts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 40, marginBottom: 28 }}>
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
          <FuelComparisonChart
            makeSlug={makeSlug}
            modelSlug={modelSlug}
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
            <style>{`
              .sim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
              @media (max-width: 480px) { .sim-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
              .sim-card { transition: transform 0.18s, box-shadow 0.18s; cursor: pointer; }
              .sim-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.13); }
            `}</style>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
              {cp.similarModels}
            </h2>
            <div className="sim-grid">
              {similarModels.map(({ makeSlug: ms, makeNameHe, makeNameEn, logoUrl, model: m }, idx) => {
                const rating = similarRatings[idx];
                const simImg = similarImages[idx]?.[0] ?? null;
                const yearRange = m.years.length > 1 ? `${m.years[m.years.length - 1]}-${m.years[0]}` : m.years.length === 1 ? `${m.years[0]}` : '';
                const carName = isEn ? `${makeNameEn} ${m.nameEn}` : `${makeNameHe} ${m.nameHe}`;
                return (
                  <Link key={`${ms}/${m.slug}`} href={`/cars/${ms}/${m.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="card sim-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {/* Image header */}
                      <div style={{
                        background: 'linear-gradient(150deg, var(--surface-2) 0%, var(--bg-muted) 100%)',
                        height: 90, overflow: 'hidden', position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {simImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={simImg.thumbnail_url ?? simImg.url} alt={carName} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <MakeLogo logoUrl={logoUrl} nameEn={makeNameEn} size={52} />
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ padding: '10px 12px 13px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 2, lineHeight: 1.3 }}>{carName}</div>
                        {!isEn && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5 }}>{makeNameEn} {m.nameEn}</div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 7 }}>
                          {yearRange && <span style={{ fontSize: '0.63rem', fontWeight: 600, background: 'var(--bg-muted)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 999 }}>{yearRange}</span>}
                          <span style={{ fontSize: '0.63rem', fontWeight: 600, background: 'var(--bg-muted)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 999 }}>{getCategoryLabel(m.category, locale)}</span>
                        </div>
                        {rating !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <StarRating rating={rating} size={10} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.67rem', color: 'var(--text-faint)' }}>{isEn ? 'No reviews yet' : 'אין ביקורות'}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* View more link */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Link
                href={`/cars?category=${model.category}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, padding: '7px 16px', borderRadius: 20, border: '1px solid var(--accent)' }}
              >
                {isEn ? 'View all in category' : 'כל הרכבים בקטגוריה'}
                <span style={{ fontSize: '1rem' }}>→</span>
              </Link>
            </div>

            {/* Compare chips */}
            <div style={{ marginTop: 20 }}>
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
            </div>
          </section>
        )}

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify((() => {
              const base = getBaseUrl(locale);
              const faqPros = isEn ? (expertReview?.prosEn ?? []) : (expertReview?.pros ?? []);
              const faqCons = isEn ? (expertReview?.consEn ?? []) : (expertReview?.cons ?? []);
              const faqLocalSummary = isEn ? expertReview?.localSummaryEn : expertReview?.localSummaryHe;
              const faqGlobalSummary = isEn ? expertReview?.globalSummaryEn : expertReview?.globalSummaryHe;
              const hasFaq = expertReview && (faqPros.length > 0 || faqCons.length > 0);
              return {
                '@context': 'https://schema.org',
                '@graph': [
                  // Only emit Product schema when real owner reviews give us an aggregateRating.
                  // The AI expert score is not marked up as a Review: Google's review-snippet
                  // policy disallows self-authored/AI ratings.
                  ...(avgRating !== null && allReviews.length > 0 ? [{
                    '@type': 'Product',
                    name: `${make.nameEn} ${model.nameEn}`,
                    brand: { '@type': 'Brand', name: make.nameEn },
                    url: `${base}/cars/${make.slug}/${model.slug}`,
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: avgRating.toFixed(1),
                      reviewCount: allReviews.length,
                      bestRating: 5,
                      worstRating: 1,
                    },
                  }] : []),
                  {
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                      { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: base },
                      { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${base}/cars` },
                      { '@type': 'ListItem', position: 3, name: makeName, item: `${base}/cars/${make.slug}` },
                      { '@type': 'ListItem', position: 4, name: modelName, item: `${base}/cars/${make.slug}/${model.slug}` },
                    ],
                  },
                  ...(hasFaq ? [{
                    '@type': 'FAQPage',
                    mainEntity: [
                      faqPros.length > 0 && {
                        '@type': 'Question',
                        name: isEn
                          ? `What are the pros of the ${make.nameEn} ${model.nameEn}?`
                          : `מה היתרונות של ${make.nameHe} ${model.nameHe}?`,
                        acceptedAnswer: { '@type': 'Answer', text: faqPros.join('. ') },
                      },
                      faqCons.length > 0 && {
                        '@type': 'Question',
                        name: isEn
                          ? `What are the cons of the ${make.nameEn} ${model.nameEn}?`
                          : `מה החסרונות של ${make.nameHe} ${model.nameHe}?`,
                        acceptedAnswer: { '@type': 'Answer', text: faqCons.join('. ') },
                      },
                      faqLocalSummary && {
                        '@type': 'Question',
                        name: isEn
                          ? `What do ${make.nameEn} ${model.nameEn} owners say?`
                          : `מה אומרים בעלי ${make.nameHe} ${model.nameHe} בישראל?`,
                        acceptedAnswer: { '@type': 'Answer', text: faqLocalSummary },
                      },
                      faqGlobalSummary && {
                        '@type': 'Question',
                        name: isEn
                          ? `What is the global expert opinion on the ${make.nameEn} ${model.nameEn}?`
                          : `מה חוות הדעת הבינלאומית על ${make.nameHe} ${model.nameHe}?`,
                        acceptedAnswer: { '@type': 'Answer', text: faqGlobalSummary },
                      },
                      expertReview?.topScore !== null && {
                        '@type': 'Question',
                        name: isEn
                          ? `What is the AI score of the ${make.nameEn} ${model.nameEn}?`
                          : `מה הציון של ${make.nameHe} ${model.nameHe}?`,
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: isEn
                            ? `The ${make.nameEn} ${model.nameEn} received an AI score of ${expertReview?.topScore?.toFixed(1)} out of 10, based on owner reviews from Israel and worldwide.`
                            : `${make.nameHe} ${model.nameHe} קיבל ציון ${expertReview?.topScore?.toFixed(1)} מתוך 10 בסיכום AI המבוסס על חוות דעת בעלי רכב בישראל ובעולם.`,
                        },
                      },
                    ].filter(Boolean),
                  }] : []),
                ],
              };
            })()),
          }}
        />
      </CarSidebarLayout>

      <ReviewNudge
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={make.nameHe}
        modelNameHe={model.nameHe}
        makeNameEn={make.nameEn}
        modelNameEn={model.nameEn}
      />
    </div>
  );
}

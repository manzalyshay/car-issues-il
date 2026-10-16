import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels, getAllMakes } from '@/lib/carsDb';
import { comparePairsForModel } from '@/lib/comparePairs';
import { getKnownIssues, knownIssueSourceLabel } from '@/lib/knownIssuesDb';
import { aiSourceLabel, isOwnerPostBased } from '@/lib/aiSource';
import { summarizeTrims, fmtIls } from '@/lib/specSummary';
import FirstReviewCta from './FirstReviewCta';

/** Meta description within 70–160 chars: cut at a word boundary. */
function clampDesc(s: string, max = 160): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
/** Title with the " | CarIssues" suffix only if it stays within ~65 chars. */
function fitTitle(t: string): string | { absolute: string } {
  return t.length + ' | CarIssues'.length <= 65 ? t : { absolute: t };
}
import { getReviewsForModel, getAverageRating } from '@/lib/reviewsDb';
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
import Car3DViewer from '@/components/Car3DViewer';
import VerdictCard from '@/components/VerdictCard';
import FollowButton from '@/components/FollowButton';


export const revalidate = 900; // cache 15 minutes

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
    getAverageRating(makeSlug, modelSlug).catch(() => null),
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
  ]);
  const yearRange = model.years.length > 1
    ? `${model.years[model.years.length - 1]}–${model.years[0]}`
    : `${model.years[0]}`;

  const spec = summarizeTrims(trims);
  if (locale === 'en') {
    const ratingStr = avgRating ? ` · ${avgRating.toFixed(1)}★` : '';
    const reviewsEn = reviews.length > 0 ? `${reviews.length} owner review${reviews.length > 1 ? 's' : ''}${avgRating ? ` (${avgRating.toFixed(1)}/5)` : ''}, ` : '';
    return {
      title: fitTitle(`${make.nameEn} ${model.nameEn} — Reviews, Common Problems & Price`),
      description: clampDesc(`${make.nameEn} ${model.nameEn} (${yearRange}): ${reviewsEn}common problems, recalls, trims and specs${spec.priceMin ? ` — from ${fmtIls(spec.priceMin)} in Israel` : ''}.`),
      alternates: { canonical: url, languages: { he: `https://carissues.co.il/cars/${make.slug}/${model.slug}`, en: url, 'x-default': url } },
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
  const reviewsHePart = reviews.length > 0 ? `${reviews.length === 1 ? 'ביקורת בעלים אחת' : `${reviews.length} ביקורות בעלים`}${avgRating ? ` (${avgRating.toFixed(1)}/5)` : ''}, ` : '';
  return {
    title: fitTitle(`${make.nameHe} ${model.nameHe} — חוות דעת, בעיות נפוצות ומחיר`),
    description: clampDesc(`${make.nameHe} ${model.nameHe} (${make.nameEn} ${model.nameEn}, ${yearRange}): ${reviewsHePart}בעיות נפוצות, ריקולים, גרסאות ומפרט${spec.priceMin ? ` — החל מ-${fmtIls(spec.priceMin)}` : ''}.`),
    alternates: { canonical: url, languages: { he: url, en: `https://carissues.net/cars/${make.slug}/${model.slug}`, 'x-default': `https://carissues.net/cars/${make.slug}/${model.slug}` } },
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

  const [allReviews, expertReviewsList, sketchfabModel, similarModels, carImages, modelRepairCosts, trimSpecs, allMakes] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    findCarModel(makeSlug, modelSlug).catch(() => null),
    getSimilarModels(makeSlug, modelSlug, model.category, 4).catch(() => []),
    getImagesForCar(makeSlug, modelSlug).catch(() => []),
    getModelRepairCosts(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
    getAllMakes().catch(() => []),
  ]);
  const knownIssues = await getKnownIssues(makeSlug, modelSlug, 3);
  // Curated (top-clicked + searched, incl. cross-category) pairs first, then same-category rivals
  const comparePairs = comparePairsForModel(allMakes, makeSlug, modelSlug, 8);
  const [similarRatings, similarImages] = await Promise.all([
    Promise.all(similarModels.map(({ makeSlug: ms, model: m }) => getAverageRating(ms, m.slug).catch(() => null))),
    Promise.all(similarModels.map(({ makeSlug: ms, model: m }) => getImagesForCar(ms, m.slug).catch(() => []))),
  ]);
  const expertReview = expertReviewsList[0] ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  const isEn = locale === 'en';
  const cp = translations[locale].carPage;
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;

  const yearRange = model.years.length > 1
    ? `${model.years[model.years.length - 1]}–${model.years[0]}`
    : `${model.years[0]}`;
  const latestYear = model.years.length ? Math.max(...model.years) : null;

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
                {yearRange} · {getCategoryLabel(model.category, locale)} · {translations[locale].carsPage.countryNames[make.country] ?? make.country}
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
                <span style={{ fontSize: 12.5, color: '#9db1d4' }}>
                  {allReviews.length > 0
                    ? (isEn ? `${allReviews.length} owner review${allReviews.length > 1 ? 's' : ''}` : (allReviews.length === 1 ? 'ביקורת בעלים אחת' : `${allReviews.length} ביקורות בעלים`))
                    : (isEn ? 'No owner reviews yet' : 'עדיין אין ביקורות בעלים')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                <FollowButton makeSlug={make.slug} modelSlug={model.slug} isEn={isEn} dark />
                <Link
                  href={`/cars/compare?car1=${make.slug}/${model.slug}`}
                  style={{ border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.08)', color: '#fff', fontWeight: 700, fontSize: 13.5, padding: '8px 14px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  {isEn ? `Compare the ${modelName} with another car` : `השוו את ${modelName} לרכב אחר`}
                </Link>
                <SharePopup title={`${makeName} ${modelName} — ${cp.shareTitle}`} url={`${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}`} dark />
              </div>
            </div>

            {/* Hero media — 3D viewer if available, else photo */}
            <div style={{ display: 'grid', gap: 6, justifySelf: 'end', width: '100%', maxWidth: 380 }}>
              <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', background: '#1a3055', boxShadow: '0 20px 46px -28px rgba(0,0,0,.9)' }}>
                {sketchfabModel ? (
                  <Car3DViewer uid={sketchfabModel.uid} modelName={sketchfabModel.name} author={sketchfabModel.author} makeSlug={make.slug} modelSlug={model.slug} carImageUrl={carImages[0]?.url} />
                ) : carImages[0]?.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={carImages[0].url} alt={`${make.nameEn} ${model.nameEn}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <span style={{ fontSize: 12, color: '#7ba0e8', letterSpacing: '.1em', fontWeight: 600 }}>
                      {isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`}
                    </span>
                  </div>
                )}
              </div>
              {!sketchfabModel && carImages.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5 }}>
                  {carImages.slice(0, 5).map((img, i) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={i} src={img.url} alt="" style={{ aspectRatio: '4/3', width: '100%', borderRadius: 8, objectFit: 'cover', display: 'block', opacity: i === 0 ? 1 : 0.72, outline: i === 0 ? '2px solid #7ba0e8' : 'none' }} />
                  ))}
                  {[...Array(Math.max(0, 5 - carImages.slice(0,5).length))].map((_, i) => (
                    <span key={`ph-${i}`} style={{ aspectRatio: '4/3', borderRadius: 8, background: 'linear-gradient(140deg,#24406b,#1a3055)', display: 'block', opacity: 0.5 }} />
                  ))}
                </div>
              )}
            </div>
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
        hasImages={carImages.length > 0 || sketchfabModel !== null}
        hasRepairCosts={modelRepairCosts.length > 0}
        sketchfabModel={sketchfabModel}
      >
        {/* ── Current model-year page ── */}
        {latestYear && (
          <Link
            href={`/cars/${make.slug}/${model.slug}/${latestYear}`}
            className="card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', marginBottom: 20, textDecoration: 'none', color: 'var(--text)', borderInlineStart: '4px solid var(--accent)' }}
          >
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>
              {isEn ? `${makeName} ${modelName} ${latestYear} — prices & trims` : `${makeName} ${modelName} ${latestYear} — מחירים וגרסאות`}
            </span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{isEn ? '→' : '←'}</span>
          </Link>
        )}

        {/* ── At a glance: owner reviews (or empty state), top problems, comparisons ── */}
        <section className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'grid', gap: 14 }}>
          {allReviews.length > 0 && avgRating !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{isEn ? 'Owner reviews' : 'ביקורות בעלים'}</h2>
              <StarRating rating={avgRating} size={14} />
              <span style={{ fontWeight: 800 }}>{avgRating.toFixed(1)} / 5</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isEn ? `${allReviews.length} review${allReviews.length > 1 ? 's' : ''} on CarIssues` : (allReviews.length === 1 ? 'ביקורת אחת באתר' : `${allReviews.length} ביקורות באתר`)}
              </span>
              <a href="#reviews" style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{isEn ? 'Read them ↓' : 'לקריאה ↓'}</a>
            </div>
          ) : (
            <FirstReviewCta makeNameHe={make.nameHe} modelNameHe={model.nameHe} makeNameEn={make.nameEn} modelNameEn={model.nameEn} />
          )}

          {(knownIssues.length > 0 || (expertReview && (isEn ? expertReview.consEn : expertReview.cons)?.length)) && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 8px' }}>{isEn ? 'Common problems' : 'בעיות נפוצות'}</h2>
              {knownIssues.length > 0 && (
                <>
                  <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.7, fontSize: '0.9rem' }} lang="en" dir="ltr">
                    {knownIssues.map((k) => <li key={k.title}>{k.title}</li>)}
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                    {isEn ? 'Most-reported problems, from ' : 'הבעיות המדווחות ביותר (בעיקר בעלים בארה"ב), מתוך '}
                    {knownIssues[0].sourceUrl
                      ? <a href={knownIssues[0].sourceUrl} target="_blank" rel="noopener nofollow" style={{ color: 'var(--accent)' }}>{knownIssueSourceLabel(knownIssues[0].source)}</a>
                      : knownIssueSourceLabel(knownIssues[0].source)}
                  </p>
                </>
              )}
              {expertReview && ((isEn ? expertReview.consEn : expertReview.cons) ?? []).filter((c) => c && (!isEn || !/[\u0590-\u05FF]/.test(c))).length > 0 && (
                <>
                  <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.7, fontSize: '0.9rem' }}>
                    {((isEn ? expertReview.consEn : expertReview.cons) ?? []).filter((c) => c && (!isEn || !/[\u0590-\u05FF]/.test(c))).slice(0, 3).map((c) => <li key={c}>{c}</li>)}
                  </ul>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{aiSourceLabel(expertReview, isEn)}</p>
                </>
              )}
              <Link href={`/cars/${make.slug}/${model.slug}/issues`} style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>
                {isEn ? 'All common problems →' : 'כל הבעיות הנפוצות ←'}
              </Link>
            </div>
          )}

          {comparePairs.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 8px' }}>{isEn ? `Compare the ${modelName}` : `השוו את ${modelName}`}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {comparePairs.slice(0, 5).map((p) => {
                  const other = p.a.key === `${makeSlug}/${modelSlug}` ? p.b : p.a;
                  return (
                    <Link key={p.path} href={p.path} style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', whiteSpace: 'nowrap' }}>
                      {isEn ? `vs ${other.make.nameEn} ${other.model.nameEn}` : `מול ${other.make.nameHe} ${other.model.nameHe}`}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

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
                const yearRange = m.years.length > 1 ? `${m.years[m.years.length - 1]}–${m.years[0]}` : `${m.years[0]}`;
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
                          <span style={{ fontSize: '0.63rem', fontWeight: 600, background: 'var(--bg-muted)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 999 }}>{yearRange}</span>
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

          </section>
        )}

        {/* Compare links — curated pairs first (includes searched cross-category pairs) */}
        {comparePairs.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>
              {cp.compareWith} {makeName} {modelName} {cp.compareVs}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {comparePairs.map((p) => {
                const other = p.a.key === `${makeSlug}/${modelSlug}` ? p.b : p.a;
                return (
                  <Link
                    key={p.path}
                    href={p.path}
                    style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', background: 'transparent', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', whiteSpace: 'nowrap' }}
                  >
                    {isEn ? `${other.make.nameEn} ${other.model.nameEn}` : `${other.make.nameHe} ${other.model.nameHe}`}
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
                  // Product only with real owner reviews (AggregateRating). No AI/self-authored ratings.
                  ...(avgRating !== null ? [{
                    '@type': 'Product',
                    name: `${make.nameEn} ${model.nameEn}`,
                    brand: { '@type': 'Brand', name: make.nameEn },
                    url: `${base}/cars/${make.slug}/${model.slug}`,
                    ...(model.leadingImageUrl && /^https?:\/\//.test(model.leadingImageUrl) ? { image: model.leadingImageUrl } : {}),
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
                          ? (isOwnerPostBased(expertReview) ? `What do ${make.nameEn} ${model.nameEn} owners say?` : `What is the summary on the ${make.nameEn} ${model.nameEn}?`)
                          : (isOwnerPostBased(expertReview) ? `מה אומרים בעלי ${make.nameHe} ${model.nameHe} בישראל?` : `מה הסיכום על ${make.nameHe} ${model.nameHe}?`),
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
                          text: isOwnerPostBased(expertReview)
                            ? (isEn
                              ? `The ${make.nameEn} ${model.nameEn} received an AI score of ${expertReview?.topScore?.toFixed(1)} out of 10 (${aiSourceLabel(expertReview, true)}).`
                              : `${make.nameHe} ${model.nameHe} קיבל ציון AI של ${expertReview?.topScore?.toFixed(1)} מתוך 10 (${aiSourceLabel(expertReview, false)}).`)
                            : (isEn
                              ? `The ${make.nameEn} ${model.nameEn} has an AI score of ${expertReview?.topScore?.toFixed(1)} out of 10. It is an AI summary from general knowledge, not based on owner reviews on CarIssues.`
                              : `ל${make.nameHe} ${model.nameHe} ציון AI של ${expertReview?.topScore?.toFixed(1)} מתוך 10. זהו סיכום AI על בסיס ידע כללי, לא מבוסס על ביקורות בעלים באתר.`),
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
    </div>
  );
}

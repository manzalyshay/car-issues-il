import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getCategoryLabel, getSimilarModels, getAllMakes } from '@/lib/carsDb';
import { comparePairsForModel } from '@/lib/comparePairs';
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
import { getRecallsForPage } from '@/lib/recallsForPage';
import { getArticleWeaknesses } from '@/lib/modelSynthesis';
import { summarizeIlRecalls, buildIssuesIntro } from '@/lib/issuesSummary';
import RepairCostsSection from '@/components/RepairCostsSection';
import { getImagesForCar } from '@/lib/carImages';
import { sizedImageUrl } from '@/lib/imageSizing';
import SellerPriceChart from '@/components/SellerPriceChart';
import RecallsBarChart from '@/components/RecallsBarChart';
import FuelComparisonChart from '@/components/FuelComparisonChart';
import VerdictCard from '@/components/VerdictCard';
import FollowButton from '@/components/FollowButton';
import HeroMedia from '@/components/HeroMedia';
import ModelFaq, { buildFaqs } from '@/components/ModelFaq';
import HeroYearPicker from '@/components/HeroYearPicker';
import { getRecallsFromCache } from '@/lib/recallsDb';
import { getIsraeliRecalls } from '@/lib/israeliRecallsDb';
import { getAiScore } from '@/lib/aiScore';
import { getProReviewScoreSets, scoreSetsForPageYear } from '@/lib/proReviewScores';
import { ownerAggregateRating } from '@/lib/ownerRating';


interface ViewProps {
  makeSlug: string;
  modelSlug: string;
  initialTab?: string;
  /** 'issues' is the same page opened on the problems tab at /cars/<make>/<model>/issues. */
  view?: 'model' | 'issues';
}

export default async function ModelPageView({ makeSlug, modelSlug, initialTab, view = 'model' }: ViewProps) {
  const issuesView = view === 'issues';
  const [locale, make, model] = await Promise.all([
    getHostLocale(),
    getMakeBySlug(makeSlug),
    getModelBySlug(makeSlug, modelSlug),
  ]);
  if (!make) notFound();
  if (!model) {
    // Guessed slugs without hyphens (e.g. /cars/tesla/model3) - send a permanent
    // redirect to the real slug instead of a soft 404.
    const guessedModel = make.models.find(
      (m) => m.slug.replace(/-/g, '') === modelSlug.replace(/-/g, ''),
    );
    if (guessedModel) permanentRedirect(`/cars/${make.slug}/${guessedModel.slug}${issuesView ? '/issues' : ''}`);
    notFound();
  }

  const [allReviews, expertReviewsList, sketchfabModel, similarModels, carImages, modelRepairCosts, trimSpecs, recalls, israeliRecalls, aiScore, proReviewScoreSets] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug).catch(() => []),
    getExpertReviews(makeSlug, modelSlug).catch(() => []),
    findCarModel(makeSlug, modelSlug).catch(() => null),
    getSimilarModels(makeSlug, modelSlug, model.category, 4).catch(() => []),
    getImagesForCar(makeSlug, modelSlug).catch(() => []),
    getModelRepairCosts(makeSlug, modelSlug).catch(() => []),
    getTrimSpecs(makeSlug, modelSlug).catch(() => []),
    getRecallsFromCache(make.nameEn, model.nameEn).catch(() => []),
    locale === 'en' ? Promise.resolve([]) : getIsraeliRecalls(make.nameEn, model.nameEn).catch(() => []),
    getAiScore(makeSlug, modelSlug).catch(() => null),
    getProReviewScoreSets(makeSlug, modelSlug).catch(() => null),
  ]);
  // Same combined source (Israeli + US-cached) the recalls tab uses, so the FAQ
  // count and the tab count never drift apart.
  const unfilteredRecallCount = recalls.length + israeliRecalls.length;
  // Problems tab content, rendered on the server so it is part of the page HTML.
  const [pageRecalls, articleFindings] = await Promise.all([
    getRecallsForPage(make.nameEn, model.nameEn, model.years, locale).catch(() => undefined),
    getArticleWeaknesses(makeSlug, modelSlug, locale),
  ]);
  const ilSummary = summarizeIlRecalls((pageRecalls ?? []).filter(r => r.source === 'il')
    .map(r => ({ year: r.ilRecallYear ?? null, faultType: r.component, recallType: r.recallType ?? null })));
  const usRecallCount = (pageRecalls ?? []).filter(r => r.source === 'us').length;
  // One number everywhere (FAQ, verdict card, tab): recalls for the model years the site covers.
  const recallCount = pageRecalls ? pageRecalls.length : unfilteredRecallCount;
  // A model's professional-review sets can include a leftover score for an
  // older generation of the same nameplate - restrict to whichever generation
  // this page's own years actually cover, the same way year pages already do
  // via filterScoreSetsForYear.
  const relevantProReviewScoreSets = proReviewScoreSets && model.years.length
    ? scoreSetsForPageYear(proReviewScoreSets, Math.max(...model.years), Math.max(...model.years))
    : proReviewScoreSets;
  const [similarRatings, similarImages] = await Promise.all([
    Promise.all(similarModels.map(({ makeSlug: ms, model: m }) => getAverageRating(ms, m.slug).catch(() => null))),
    Promise.all(similarModels.map(({ makeSlug: ms, model: m }) => getImagesForCar(ms, m.slug).catch(() => []))),
  ]);
  // Most-searched comparisons first, rather than the first models in catalogue order.
  const comparePairs = comparePairsForModel(await getAllMakes().catch(() => []), makeSlug, modelSlug, 6);
  const expertReview = expertReviewsList[0] ?? null;
  const curatedModelData = expertReview?.curatedModelData ?? null;
  const avgRating = allReviews.length
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : null;

  const isEn = locale === 'en';
  const cp = translations[locale].carPage;
  const makeName = isEn ? make.nameEn : make.nameHe;
  const modelName = isEn ? model.nameEn : model.nameHe;
  // Client component props are serialized into the page HTML regardless of what's
  // actually rendered - never ship Hebrew-only fields to the English site.
  const makeNameHeForClient = isEn ? '' : make.nameHe;
  const modelNameHeForClient = isEn ? '' : model.nameHe;
  const safetyHeForClient = isEn ? null : expertReview?.safetyHe;
  const techComfortHeForClient = isEn ? null : expertReview?.techComfortHe;
  // ReviewList already hides Hebrew-only reviews on EN (no bodyEn) and shows the
  // translated text/an anonymized author - but the raw Hebrew title/body/author
  // still rode along in the client payload regardless. Strip it at the source.
  const reviewsForClient = isEn
    ? allReviews.filter(r => r.bodyEn).map(r => ({
        ...r,
        title: r.titleEn ?? '',
        body: r.bodyEn ?? '',
        authorName: /[֐-׿]/.test(r.authorName) ? 'Anonymous' : r.authorName,
        subModel: r.subModel && /[֐-׿]/.test(r.subModel) ? undefined : r.subModel,
      }))
    : allReviews;

  // min-max, not first/last: car_models.years is not always sorted newest-first.
  const yearRange = model.years.length > 1
    ? `${Math.min(...model.years)}-${Math.max(...model.years)}`
    : model.years.length === 1 ? `${model.years[0]}` : '';

  // Key-fact tiles in the hero.
  const countryName = translations[locale].carsPage.countryNames[make.country] ?? make.country;
  const heroStats: { label: string; note?: string; value: string; ltr?: boolean }[] = [];
  if (!isEn && model.activeVehiclesIl != null && model.activeVehiclesIl > 0) {
    const asOf = model.activeVehiclesIlAsOf
      ? new Date(`${model.activeVehiclesIlAsOf}T12:00:00Z`).toLocaleDateString('he-IL', { month: 'short', year: 'numeric', timeZone: 'Asia/Jerusalem' })
      : 'אוק׳ 2026';
    heroStats.push({ label: 'בכביש בישראל', note: `(${asOf})`, value: model.activeVehiclesIl.toLocaleString('he-IL') });
  }
  if (yearRange) heroStats.push({ label: isEn ? 'Model years' : 'שנות ייצור', value: yearRange.replace('-', '–'), ltr: true });
  heroStats.push({ label: isEn ? 'Type · Country' : 'סוג · ארץ ייצור', value: `${getCategoryLabel(model.category, locale)} · ${countryName}` });

  // 3D model relevance: year-aware lookup already handles year_from/year_to entries;
  // fall back to name-based check for legacy entries
  const relevantSketchfabModel = (() => {
    // The problems view skips the 3D viewer to stay light.
    if (issuesView || !sketchfabModel) return null;
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

  const issuesSubtitle = [
    ilSummary.total > 0 && (ilSummary.total === 1 ? 'קריאת שירות אחת בישראל' : `${ilSummary.total} קריאות שירות בישראל`),
    usRecallCount > 0 && (isEn
      ? `${usRecallCount} US recall${usRecallCount === 1 ? '' : 's'}`
      : `${usRecallCount === 1 ? 'ריקול אחד' : `${usRecallCount} ריקולים`} בארה״ב`),
  ].filter(Boolean).join(' · ');
  // Summary paragraph of the problems tab: recall counts only, all from official records.
  const recallsIntro = (ilSummary.total > 0 || usRecallCount > 0)
    ? buildIssuesIntro({ makeName, modelName, il: ilSummary, usRecallCount, cons: [] }, locale)
    : undefined;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── MODEL HERO - dark navy ─── */}
      <section className="mp-hero">
        <div className="model-hero-inner" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,3vw,40px)', alignItems: 'flex-start' }}>

          {/* Info column */}
          <div className="model-hero-info" style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(16px,1.6vw,20px)' }}>
            {/* Breadcrumb inside hero */}
            <nav aria-label={isEn ? 'Breadcrumb' : 'פירורי לחם'} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#aab6d4', flexWrap: 'wrap', direction: isEn ? 'ltr' : 'rtl' }}>
              <Link href="/" style={{ color: '#aab6d4', textDecoration: 'none' }}>{translations[locale].carsPage.home}</Link>
              <span aria-hidden="true">{isEn ? '›' : '‹'}</span>
              <Link href="/cars" style={{ color: '#aab6d4', textDecoration: 'none' }}>{translations[locale].carsPage.makes}</Link>
              <span aria-hidden="true">{isEn ? '›' : '‹'}</span>
              <Link href={`/cars/${make.slug}`} style={{ color: '#aab6d4', textDecoration: 'none' }}>{makeName}</Link>
              <span aria-hidden="true">{isEn ? '›' : '‹'}</span>
              {issuesView ? (
                <>
                  <Link href={`/cars/${make.slug}/${model.slug}`} style={{ color: '#aab6d4', textDecoration: 'none' }}>{modelName}</Link>
                  <span aria-hidden="true">{isEn ? '›' : '‹'}</span>
                  <span style={{ color: '#fff', whiteSpace: 'nowrap' }}>{isEn ? 'Problems & recalls' : 'תקלות וריקולים'}</span>
                </>
              ) : (
                <span style={{ color: '#fff', whiteSpace: 'nowrap' }}>{modelName}</span>
              )}
            </nav>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 800, fontSize: 'clamp(32px,3.4vw,48px)', lineHeight: 1.08, margin: 0, color: '#fff' }}>
                {isEn ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`}
                {issuesView && (isEn ? ' - Common Problems & Recalls' : ' - תקלות נפוצות וריקולים')}
              </h1>
              {!issuesView && (
                <p style={{ margin: 0, fontSize: 'clamp(15px,1.3vw,18px)', color: '#c3cde3' }}>
                  {isEn ? 'Common problems and owner reviews' : <>בעיות נפוצות וחוות דעת בעלים · <span dir="ltr">{make.nameEn} {model.nameEn}</span></>}
                </p>
              )}
              {issuesView && issuesSubtitle && <p style={{ margin: 0, fontSize: 15, color: '#c3cde3' }}>{issuesSubtitle}</p>}
            </div>

            {/* Key facts */}
            {heroStats.length > 0 && (
              <div className="hero-stats" style={{ display: 'grid', gridTemplateColumns: `repeat(${heroStats.length},minmax(0,1fr))` }}>
                {heroStats.map((st) => (
                  <div key={st.label} className="hero-stat" style={{ background: '#182a54', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 'clamp(12px,1vw,13px)', color: '#aab6d4' }}>{st.label}{st.note && <span className="hero-stat-note"> {st.note}</span>}</span>
                    <span dir={st.ltr ? 'ltr' : undefined} style={{ fontSize: 'clamp(17px,1.7vw,24px)', fontWeight: 800, lineHeight: 1.2, textAlign: isEn ? 'left' : 'right' }}>{st.value}</span>
                  </div>
                ))}
              </div>
            )}

            {(avgRating !== null || allReviews.length > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {avgRating !== null && (
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 24, lineHeight: 1, color: '#fff' }}>{(avgRating * 2).toFixed(1)}</span>
                    <span style={{ fontSize: 13, color: '#aab6d4', fontWeight: 700 }}>/10</span>
                  </span>
                )}
                {avgRating !== null && avgRating >= 4 && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0d1b2f', background: '#3ddc84', padding: '4px 11px', borderRadius: 999 }}>
                    {isEn ? 'Recommended' : 'מומלץ'}
                  </span>
                )}
                {allReviews.length > 0 && (
                  <span style={{ fontSize: 14, color: '#aab6d4' }}>
                    {allReviews.length} {isEn ? 'owner reviews' : 'ביקורות בעלים'}
                  </span>
                )}
              </div>
            )}

            {!isEn && model.activeVehiclesIl === 0 && curatedModelData?.on_sale_il !== false && (
              <div style={{ fontSize: 14, color: '#f0a050' }}>לא משווק כיום בישראל</div>
            )}
            {!isEn && curatedModelData?.on_sale_il === false && curatedModelData.status_note && (
              <div style={{ fontSize: 14, color: '#f0a050', fontWeight: 700 }}>{curatedModelData.status_note}</div>
            )}
            {!isEn && curatedModelData?.on_sale_il === true && typeof curatedModelData.price_from_ils === 'number' && (
              <div style={{ fontSize: 14, color: '#aab6d4' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>
                  {`החל מ-${curatedModelData.price_from_ils.toLocaleString('he-IL')} ₪`}
                </span>
                {curatedModelData.price_note ? ` · ${curatedModelData.price_note}` : ''}
              </div>
            )}

            {/* Year picker - segmented control (desktop only; mobile gets the strip under the hero) */}
            {model.years.length > 1 && (
              <HeroYearPicker years={model.years} makeSlug={make.slug} modelSlug={model.slug} variant="hero" locale={locale} />
            )}

            <div className="hero-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <FollowButton makeSlug={make.slug} modelSlug={model.slug} isEn={isEn} dark />
              <Link
                href={`/cars/compare?car1=${make.slug}/${model.slug}`}
                style={{ height: 48, padding: '0 18px', border: '1px solid #3a4c78', borderRadius: 12, background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', boxSizing: 'border-box' }}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" /></svg>
                <span className="hero-compare-short">{isEn ? 'Compare' : 'השוואה'}</span>
                <span className="hero-compare-long">{isEn ? 'Compare with another model' : 'השוואה לדגם אחר'}</span>
              </Link>
              <SharePopup title={`${makeName} ${modelName}: ${cp.shareTitle}`} url={`${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}`} dark iconOnly />
            </div>
          </div>

          {/* Year picker - scrolling pills between the hero and the media (mobile only) */}
          {model.years.length > 1 && (
            <div className="model-hero-years">
              <HeroYearPicker years={model.years} makeSlug={make.slug} modelSlug={model.slug} variant="strip" locale={locale} />
            </div>
          )}

          {/* Hero media - interactive with clickable thumbnails + year/trim badge */}
          <div className="model-hero-media" style={{ flex: '1 1 460px', minWidth: 0 }}>
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


      {/* The model page's own JSON-LD sits in the reviews tab; the problems view gets its breadcrumb here. */}
      {issuesView && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: getBaseUrl(locale) },
                { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${getBaseUrl(locale)}/cars` },
                { '@type': 'ListItem', position: 3, name: makeName, item: `${getBaseUrl(locale)}/cars/${make.slug}` },
                { '@type': 'ListItem', position: 4, name: modelName, item: `${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}` },
                { '@type': 'ListItem', position: 5, name: isEn ? 'Problems & recalls' : 'תקלות וריקולים', item: `${getBaseUrl(locale)}/cars/${make.slug}/${model.slug}/issues` },
              ],
            }),
          }}
        />
      )}

      {/* ── SIDEBAR + CONTENT ────────── */}
      <CarSidebarLayout
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        makeNameHe={makeNameHeForClient}
        modelNameHe={modelNameHeForClient}
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
        initialTab={issuesView ? 'recalls' : initialTab}
        initialRecalls={pageRecalls}
        recallsIntro={recallsIntro}
        articleFindings={articleFindings}
        safetyHe={safetyHeForClient}
        techComfortHe={techComfortHeForClient}
      >
        {/* ── Quick links (server-rendered, above the reviews): most reported problems,
             the current-year page and the top compare pages ── */}
        {(() => {
          const problemItems = (isEn ? expertReview?.consEn : expertReview?.cons)?.filter(Boolean).slice(0, 3) ?? [];
          const currentYear = model.years.length ? Math.max(...model.years) : null;
          const topCompares = comparePairs.slice(0, 5);
          if (!problemItems.length && !currentYear && !topCompares.length) return null;
          const chip: React.CSSProperties = { padding: '5px 11px', borderRadius: 20, fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', whiteSpace: 'nowrap' };
          const label: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginInlineEnd: 4 };
          return (
            <nav aria-label={isEn ? 'Quick links' : 'קישורים מהירים'} className="card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {problemItems.length > 0 && (
                <div style={{ fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <span style={label}>{isEn ? 'Problems and drawbacks owners mention:' : 'בעיות וחסרונות שבעלים מציינים:'}</span>
                  {problemItems.join(' · ')}{' '}
                  <Link href={`/cars/${make.slug}/${model.slug}/issues`} style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    {isEn ? 'All common problems →' : 'כל הבעיות הנפוצות ←'}
                  </Link>
                </div>
              )}
              {currentYear && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <Link href={`/cars/${make.slug}/${model.slug}/${currentYear}`} style={{ ...chip, background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                    {isEn ? `${make.nameEn} ${model.nameEn} ${currentYear}` : `${make.nameHe} ${model.nameHe} ${currentYear}: מחיר וגרסאות`}
                  </Link>
                </div>
              )}
              {topCompares.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={label}>{isEn ? 'Popular comparisons:' : 'השוואות פופולריות:'}</span>
                  {/* Ordered by Search Console clicks (comparePairsForModel). Full pair names as
                      anchor text - the same wording people search for ("X מול Y"). */}
                  {topCompares.map((pair) => {
                    const other = pair.a.key === `${makeSlug}/${modelSlug}` ? pair.b : pair.a;
                    return (
                      <Link key={`qc-${other.key}`} href={pair.path} style={chip}>
                        {isEn
                          ? `${model.nameEn} vs ${other.make.nameEn} ${other.model.nameEn}`
                          : `${model.nameHe} מול ${other.make.nameHe} ${other.model.nameHe}`}
                      </Link>
                    );
                  })}
                </div>
              )}
            </nav>
          );
        })()}

        {/* ── Owner reviews - write review at top ── */}
        <div id="reviews" style={{ paddingTop: 0 }}>
          <ModelReviewsSection
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={model.years}
            trims={isEn ? undefined : model.trims}
            initialReviews={reviewsForClient}
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
            aiScore={aiScore}
            proReviewScoreSets={relevantProReviewScoreSets}
            recallCount={recallCount}
          />
        </div>

        {/* ── FAQ ── */}
        <ModelFaq
          trimSpecs={trimSpecs}
          expertReview={expertReview}
          avgRating={avgRating}
          reviewCount={allReviews.length}
          recallCount={recallCount}
          makeNameHe={make.nameHe}
          modelNameHe={model.nameHe}
          makeNameEn={make.nameEn}
          modelNameEn={model.nameEn}
          category={model.category}
          isEn={isEn}
          includeJsonLd={false}
        />

        {/* ── Market value + Recalls bar charts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 40, marginBottom: 28 }}>
          {!isEn && (
            <SellerPriceChart
              makeSlug={makeSlug}
              modelSlug={modelSlug}
              makeEn={make.nameEn}
              modelEn={model.nameEn}
              isEn={isEn}
            />
          )}
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
                          <img src={sizedImageUrl(simImg.thumbnail_url ?? simImg.url, 250) ?? undefined} alt={carName} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
                {comparePairs.map((pair) => {
                  const other = pair.a.key === `${makeSlug}/${modelSlug}` ? pair.b : pair.a;
                  return (
                    <Link
                      key={`cmp-${other.key}`}
                      href={pair.path}
                      style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', background: 'transparent', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', whiteSpace: 'nowrap' }}
                    >
                      {isEn ? `${other.make.nameEn} ${other.model.nameEn}` : `${other.make.nameHe} ${other.model.nameHe}`}
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
              // aggregateRating only from owner reviews submitted on our site (never site/AI-authored)
              const ownerRating = ownerAggregateRating(allReviews);
              // Same FAQ list the visible ModelFaq accordion renders - keeps the
              // FAQPage schema in sync with on-page content (Google requires a match).
              const faqs = buildFaqs({
                trimSpecs,
                expertReview,
                avgRating,
                reviewCount: allReviews.length,
                recallCount,
                makeNameHe: make.nameHe,
                modelNameHe: model.nameHe,
                makeNameEn: make.nameEn,
                modelNameEn: model.nameEn,
                category: model.category,
                isEn,
              });
              return {
                '@context': 'https://schema.org',
                '@graph': [
                  // Only emit Product schema when real owner reviews give us an aggregateRating.
                  // The AI expert score is not marked up as a Review: Google's review-snippet
                  // policy disallows self-authored/AI ratings.
                  ...(!issuesView && ownerRating ? [{
                    '@type': 'Product',
                    name: `${make.nameEn} ${model.nameEn}`,
                    brand: { '@type': 'Brand', name: make.nameEn },
                    url: `${base}/cars/${make.slug}/${model.slug}`,
                    aggregateRating: ownerRating,
                  }] : []),
                  {
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                      { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: base },
                      { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${base}/cars` },
                      { '@type': 'ListItem', position: 3, name: makeName, item: `${base}/cars/${make.slug}` },
                      { '@type': 'ListItem', position: 4, name: modelName, item: `${base}/cars/${make.slug}/${model.slug}` },
                      ...(issuesView ? [{ '@type': 'ListItem', position: 5, name: isEn ? 'Problems & recalls' : 'תקלות וריקולים', item: `${base}/cars/${make.slug}/${model.slug}/issues` }] : []),
                    ],
                  },
                  ...(!issuesView && faqs.length > 0 ? [{
                    '@type': 'FAQPage',
                    mainEntity: faqs.map(({ q, a }) => ({
                      '@type': 'Question',
                      name: q,
                      acceptedAnswer: { '@type': 'Answer', text: a },
                    })),
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
        makeNameHe={makeNameHeForClient}
        modelNameHe={modelNameHeForClient}
        makeNameEn={make.nameEn}
        modelNameEn={model.nameEn}
      />
    </div>
  );
}

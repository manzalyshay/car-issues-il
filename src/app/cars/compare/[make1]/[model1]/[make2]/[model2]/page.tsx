import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getAllMakes, getSimilarModels } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { findCarModel } from '@/lib/sketchfab';
import { getTrimSpecs } from '@/lib/trimSpecsDb';
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';
import Car3DViewer from '@/components/Car3DViewer';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import CarComparisonAI from '@/components/CarComparisonAI';
import RecallsCompare from '@/components/RecallsCompare';
import ReviewsCompare from '@/components/ReviewsCompare';

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make1, model1, make2, model2 } = await params;
  const [locale, mA, mB] = await Promise.all([getHostLocale(), getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) return {};
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) return {};
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const canonical = `${base}/cars/compare/${c1}/${c2}`;
  const nameA = isEn ? `${mA.nameEn} ${modA.nameEn}` : `${mA.nameHe} ${modA.nameHe}`;
  const nameB = isEn ? `${mB.nameEn} ${modB.nameEn}` : `${mB.nameHe} ${modB.nameHe}`;
  const title = isEn
    ? `${nameA} vs ${nameB} — Full Comparison & Reviews`
    : `${nameA} מול ${nameB} — השוואה מלאה וחוות דעת`;
  const description = isEn
    ? `${nameA} or ${nameB}? Full comparison: AI scores, owner reviews, pros & cons, price history 2016–2026 — CarIssues`
    : `${nameA} או ${nameB}? השוואה מלאה: ציונים, ביקורות בעלי רכב, יתרונות וחסרונות, היסטוריית מחיר 2016–2026 — CarIssues IL`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        he: `https://carissues.co.il/cars/compare/${c1}/${c2}`,
        en: `https://carissues.net/cars/compare/${c1}/${c2}`,
        'x-default': `https://carissues.net/cars/compare/${c1}/${c2}`,
      },
    },
    openGraph: { title, description, url: canonical, images: [{ url: '/og-default.svg', width: 1200, height: 630 }] },
  };
}

export const dynamic = 'force-dynamic';


function Score({ label, value, best }: { label: string; value: number | null; best: 'a' | 'b' | 'tie' | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: best ? 'var(--accent)' : 'var(--text)' }}>
        {value.toFixed(1)}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export default async function ComparePage({ params }: Props) {
  const { make1, model1, make2, model2 } = await params;

  // Enforce canonical slug order (alphabetical) to avoid duplicate pages
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  if (`${make1}/${model1}` !== c1) {
    redirect(`/cars/compare/${c1}/${c2}`);
  }

  const [locale, mA, mB] = await Promise.all([getHostLocale(), getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) notFound();
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) notFound();

  const [reviewsA, reviewsB, expertA, expertB, carModelA, carModelB, similarA, similarB, trimsA, trimsB] = await Promise.all([
    getReviewsForModel(make1, model1).catch(() => []),
    getReviewsForModel(make2, model2).catch(() => []),
    getExpertReviews(make1, model1).catch(() => []),
    getExpertReviews(make2, model2).catch(() => []),
    findCarModel(make1, model1).catch(() => null),
    findCarModel(make2, model2).catch(() => null),
    getSimilarModels(make1, model1, modA?.category ?? 'sedan', 10).catch(() => []),
    getSimilarModels(make2, model2, modB?.category ?? 'sedan', 10).catch(() => []),
    getTrimSpecs(make1, model1).catch(() => [] as TrimSpecWithYear[]),
    getTrimSpecs(make2, model2).catch(() => [] as TrimSpecWithYear[]),
  ]);

  const isEn = locale === 'en';
  const sp = translations[locale].compareStaticPage;
  const nameA = isEn ? `${mA.nameEn} ${modA.nameEn}` : `${mA.nameHe} ${modA.nameHe}`;
  const nameB = isEn ? `${mB.nameEn} ${modB.nameEn}` : `${mB.nameHe} ${modB.nameHe}`;

  const avgA = reviewsA.length ? reviewsA.reduce((s, r) => s + r.rating, 0) / reviewsA.length : null;
  const avgB = reviewsB.length ? reviewsB.reduce((s, r) => s + r.rating, 0) / reviewsB.length : null;
  const scoreA = expertA[0]?.topScore ?? null;
  const scoreB = expertB[0]?.topScore ?? null;

  const better = (a: number | null, b: number | null): 'a' | 'b' | 'tie' | null => {
    if (a === null && b === null) return null;
    if (a === null) return 'b';
    if (b === null) return 'a';
    if (Math.abs(a - b) < 0.15) return 'tie';
    return a > b ? 'a' : 'b';
  };

  const ratingWinner = better(avgA, avgB);
  const scoreWinner = better(scoreA, scoreB);
  const hasHeb = (s: string) => /[\u0590-\u05FF]/.test(s);
  const prosA = isEn
    ? (expertA[0]?.prosEn?.filter(p => p && !hasHeb(p)) ?? [])
    : (expertA[0]?.pros ?? []);
  const consA = isEn
    ? (expertA[0]?.consEn?.filter(c => c && !hasHeb(c)) ?? [])
    : (expertA[0]?.cons ?? []);
  const prosB = isEn
    ? (expertB[0]?.prosEn?.filter(p => p && !hasHeb(p)) ?? [])
    : (expertB[0]?.pros ?? []);
  const consB = isEn
    ? (expertB[0]?.consEn?.filter(c => c && !hasHeb(c)) ?? [])
    : (expertB[0]?.cons ?? []);

  // ── Performance data aggregation ─────────────────────────────────────────────
  const maxVal = (trims: TrimSpecWithYear[], key: keyof TrimSpecWithYear): number | null =>
    trims.reduce((best: number | null, t) => {
      const v = t[key] as number | undefined;
      if (v == null) return best;
      return best === null || v > best ? v : best;
    }, null);
  const minVal = (trims: TrimSpecWithYear[], key: keyof TrimSpecWithYear): number | null =>
    trims.reduce((best: number | null, t) => {
      const v = t[key] as number | undefined;
      if (v == null) return best;
      return best === null || v < best ? v : best;
    }, null);

  const perfA = {
    hp:       maxVal(trimsA, 'engineHp'),
    torque:   maxVal(trimsA, 'torqueNm'),
    accel:    minVal(trimsA, 'acceleration'),
    topSpeed: maxVal(trimsA, 'topSpeedKmh'),
    fuel:     minVal(trimsA, 'fuelConsumption'),
    cargo:    maxVal(trimsA, 'cargoLiters'),
    weight:   minVal(trimsA, 'curbWeightKg'),
    price:    minVal(trimsA, 'priceIls'),
  };
  const perfB = {
    hp:       maxVal(trimsB, 'engineHp'),
    torque:   maxVal(trimsB, 'torqueNm'),
    accel:    minVal(trimsB, 'acceleration'),
    topSpeed: maxVal(trimsB, 'topSpeedKmh'),
    fuel:     minVal(trimsB, 'fuelConsumption'),
    cargo:    maxVal(trimsB, 'cargoLiters'),
    weight:   minVal(trimsB, 'curbWeightKg'),
    price:    minVal(trimsB, 'priceIls'),
  };

  type PerfKey = keyof typeof perfA;
  type PerfStat = {
    key: PerfKey;
    label: string;
    unit: string;
    note: string;
    lowerBetter: boolean;
    format: (v: number) => string;
  };

  const allPerfStats: PerfStat[] = [
    { key: 'price',    label: isEn ? 'Starting Price' : 'מחיר התחלתי',  unit: isEn ? '$' : '₪',      note: isEn ? 'lower = better' : 'נמוך = טוב יותר',  lowerBetter: true,  format: (v: number) => isEn ? `$${Math.round(v / 3700)}K` : `₪${Math.round(v / 1000)}K` },
    { key: 'hp',       label: isEn ? 'Horsepower'     : 'הספק',           unit: isEn ? 'hp' : 'כ"ס',  note: isEn ? 'higher = better' : 'גבוה = טוב יותר', lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'torque',   label: isEn ? 'Torque'         : 'מומנט',           unit: 'Nm',                  note: isEn ? 'higher = better' : 'גבוה = טוב יותר', lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'accel',    label: isEn ? '0–100 km/h'     : '0–100 קמ"ש',    unit: isEn ? 'sec' : 'שנ\'', note: isEn ? 'lower = better' : 'נמוך = טוב יותר',  lowerBetter: true,  format: (v: number) => v.toFixed(1) },
    { key: 'topSpeed', label: isEn ? 'Top Speed'      : "מהירות מקס'",   unit: isEn ? 'km/h' : 'קמ"ש', note: isEn ? 'higher = better' : 'גבוה = טוב יותר', lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'fuel',     label: isEn ? 'Fuel Economy'   : 'צריכת דלק',     unit: isEn ? 'km/L' : 'ק"מ/ל',   note: isEn ? 'higher = better' : 'גבוה = טוב יותר', lowerBetter: true, format: (v: number) => (100 / v).toFixed(1) },
    { key: 'cargo',    label: isEn ? 'Cargo Space'    : 'תא מטען',        unit: isEn ? 'L' : "ל'",    note: isEn ? 'higher = better' : 'גבוה = טוב יותר', lowerBetter: false, format: (v: number) => Math.round(v).toString() },
    { key: 'weight',   label: isEn ? 'Curb Weight'    : 'משקל',           unit: isEn ? 'kg' : 'ק"ג',  note: isEn ? 'lower = better' : 'נמוך = טוב יותר',  lowerBetter: true,  format: (v: number) => Math.round(v).toString() },
  ];
  const perfStats = allPerfStats.filter(s => perfA[s.key] != null && perfB[s.key] != null);

  const hasPerf = perfStats.length > 0;

  const priceCars = [
    { makeSlug: make1, modelSlug: model1, makeEn: mA.nameEn, modelEn: modA.nameEn, name: nameA, color: '#3b82f6' },
    { makeSlug: make2, modelSlug: model2, makeEn: mB.nameEn, modelEn: modB.nameEn, name: nameB, color: '#f97316' },
  ];
  // In RTL (Hebrew) the rest of the page shows carA on the right, carB on the left.
  // Swap performance columns to match so trophy always appears on the visually correct side.
  const swapCols = !isEn;

  const col: React.CSSProperties = { flex: 1, minWidth: 0, textAlign: 'center' };
  const divider: React.CSSProperties = { width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 };

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <style>{`
        @media (max-width: 540px) {
          .cmp-scores-mid    { display: none !important; }
          .cmp-score-vdivider { display: none !important; }
          .cmp-score-col     { padding: 8px 6px !important; }
          .cmp-related-grid  { grid-template-columns: 1fr !important; gap: 12px !important; }
          .cmp-car-name      { font-size: 0.9rem !important; word-break: break-word; }
          .cmp-header-card   { flex-wrap: wrap !important; }
          .cmp-proscons-flex { flex-direction: column !important; }
          .cmp-proscons-vdiv { display: none !important; }
          .perf-grid-row     { grid-template-columns: 80px 1fr 1fr !important; gap: 6px !important; padding: 10px 12px !important; }
          .perf-grid-header  { grid-template-columns: 80px 1fr 1fr !important; gap: 6px !important; padding: 10px 12px !important; }
          .perf-value        { font-size: 1rem !important; }
          .perf-stat-label   { font-size: 0.68rem !important; }
        }
      `}</style>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sp.breadcrumbHome}</Link>
          <span>›</span>
          <Link href="/cars/compare" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sp.breadcrumbCompare}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{nameA} {sp.vsWord} {nameB}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, marginBottom: 8 }}>
          {nameA} {sp.vsWord} {nameB}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {mA.nameEn} {modA.nameEn} vs {mB.nameEn} {modB.nameEn} — {sp.subtitleCompare}
        </p>

        {/* Header card */}
        <div className="card cmp-header-card" style={{ padding: '24px 28px', marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mA.logoUrl} nameEn={mA.nameEn} size={52} />
            </div>
            <div className="cmp-car-name" style={{ fontWeight: 900, fontSize: '1.15rem' }}>{nameA}</div>
            {!isEn && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mA.nameEn} {modA.nameEn}</div>}
            <Link href={`/cars/${make1}/${model1}`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              {sp.modelPageLink}
            </Link>
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }}>VS</div>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mB.logoUrl} nameEn={mB.nameEn} size={52} />
            </div>
            <div className="cmp-car-name" style={{ fontWeight: 900, fontSize: '1.15rem' }}>{nameB}</div>
            {!isEn && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mB.nameEn} {modB.nameEn}</div>}
            <Link href={`/cars/${make2}/${model2}`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              {sp.modelPageLink}
            </Link>
          </div>
        </div>

        {/* 3D Viewers */}
        {(carModelA || carModelB) && (
          <div className="card" style={{ padding: '20px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{sp.models3dTitle}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260, height: 280 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8, textAlign: 'center', color: 'var(--text)' }}>{nameA}</div>
                <div style={{ height: 'calc(100% - 28px)', borderRadius: 12, overflow: 'hidden' }}>
                  {carModelA
                    ? <Car3DViewer uid={carModelA.uid} modelName={nameA} makeSlug={make1} modelSlug={model1} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sp.no3dModel}</div>
                  }
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 260, height: 280 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8, textAlign: 'center', color: 'var(--text)' }}>{nameB}</div>
                <div style={{ height: 'calc(100% - 28px)', borderRadius: 12, overflow: 'hidden' }}>
                  {carModelB
                    ? <Car3DViewer uid={carModelB.uid} modelName={nameB} makeSlug={make2} modelSlug={model2} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sp.no3dModel}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scores */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>{sp.scoresTitle}</h2>
          <div style={{ display: 'flex', gap: 0 }}>
            <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
              <Score label={sp.userRating} value={avgA} best={ratingWinner === 'a' ? 'a' : null} />
              {avgA !== null && <div style={{ marginTop: 6 }}><StarRating rating={avgA} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviewsA.length} {sp.reviews}</div>
            </div>
            <div className="cmp-score-vdivider" style={divider} />
            <div className="cmp-scores-mid" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sp.userRating}</div>
            </div>
            <div className="cmp-score-vdivider" style={divider} />
            <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
              <Score label={sp.userRating} value={avgB} best={ratingWinner === 'b' ? 'b' : null} />
              {avgB !== null && <div style={{ marginTop: 6 }}><StarRating rating={avgB} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviewsB.length} {sp.reviews}</div>
            </div>
          </div>

          {(scoreA !== null || scoreB !== null) && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
              <div style={{ display: 'flex', gap: 0 }}>
                <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
                  <Score label={sp.aiScore} value={scoreA} best={scoreWinner === 'a' ? 'a' : null} />
                </div>
                <div className="cmp-score-vdivider" style={divider} />
                <div className="cmp-scores-mid" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sp.aiScore}</div>
                </div>
                <div className="cmp-score-vdivider" style={divider} />
                <div className="cmp-score-col" style={{ ...col, padding: '0 16px' }}>
                  <Score label={sp.aiScore} value={scoreB} best={scoreWinner === 'b' ? 'b' : null} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Performance Section */}
        {hasPerf && (() => {
          return (
            <>
              <style>{`
                @keyframes perfBarGrow {
                  from { transform: scaleX(0); }
                  to   { transform: scaleX(1); }
                }
                .perf-bar-fill {
                  animation: perfBarGrow 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                  transform-origin: left center;
                }
                @media (max-width: 520px) {
                  .perf-grid-row { grid-template-columns: 90px 1fr 1fr !important; gap: 8px !important; padding: 12px 14px !important; }
                  .perf-grid-header { grid-template-columns: 90px 1fr 1fr !important; gap: 8px !important; padding: 12px 14px !important; }
                  .perf-value { font-size: 1.1rem !important; }
                  .perf-stat-label { font-size: 0.7rem !important; }
                }
              `}</style>
              <div className="card" style={{ overflow: 'hidden', marginBottom: 28 }} dir="ltr">

                {/* Dark header */}
                <div style={{
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                    {sp.performanceTitle}
                  </h2>
                </div>

                {/* Column headers */}
                <div className="perf-grid-header" style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 1fr',
                  gap: 12,
                  padding: '14px 24px',
                  borderBottom: '2px solid var(--border)',
                  alignItems: 'center',
                }}>
                  <div />
                  <div style={{ textAlign: 'center' }}>
                    <MakeLogo logoUrl={swapCols ? mB.logoUrl : mA.logoUrl} nameEn={swapCols ? mB.nameEn : mA.nameEn} size={28} />
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginTop: 4, color: 'var(--text)' }}>{swapCols ? nameB : nameA}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <MakeLogo logoUrl={swapCols ? mA.logoUrl : mB.logoUrl} nameEn={swapCols ? mA.nameEn : mB.nameEn} size={28} />
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginTop: 4, color: 'var(--text)' }}>{swapCols ? nameA : nameB}</div>
                  </div>
                </div>

                {/* Stat rows */}
                {perfStats.map((stat, idx) => {
                  const vA = perfA[stat.key];
                  const vB = perfB[stat.key];
                  const winA = vA != null && (vB == null || (stat.lowerBetter ? vA < vB : vA > vB));
                  const winB = vB != null && (vA == null || (stat.lowerBetter ? vB < vA : vB > vA));
                  const tie  = vA != null && vB != null && vA === vB;

                  // Compute bar widths so the "better" value = 100%, worse = proportional
                  const barPct = (v: number | null, other: number | null): number => {
                    if (v == null) return 0;
                    if (other == null) return 100;
                    if (v === other) return 100;
                    if (stat.lowerBetter) {
                      const mn = Math.min(v, other);
                      return (mn / v) * 100;
                    } else {
                      const mx = Math.max(v, other);
                      return (v / mx) * 100;
                    }
                  };
                  const pA = barPct(vA, vB);
                  const pB = barPct(vB, vA);

                  // In RTL mode columns are swapped so carA appears on the right
                  const vLeft  = swapCols ? vB  : vA;
                  const vRight = swapCols ? vA  : vB;
                  const winLeft  = swapCols ? winB : winA;
                  const winRight = swapCols ? winA : winB;
                  const pLeft  = swapCols ? pB  : pA;
                  const pRight = swapCols ? pA  : pB;

                  const winColor = 'var(--accent)';
                  const neutralColor = '#cbd5e1';
                  const tieColor = '#94a3b8';

                  const rowBg = idx % 2 === 1 ? 'var(--bg-muted)' : 'transparent';

                  return (
                    <div key={stat.key} className="perf-grid-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 1fr',
                      gap: 12,
                      padding: '14px 24px',
                      borderBottom: idx < perfStats.length - 1 ? '1px solid var(--border)' : 'none',
                      background: rowBg,
                      alignItems: 'center',
                    }}>
                      {/* Stat label */}
                      <div>
                        <div className="perf-stat-label" style={{
                          fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {stat.label}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {stat.note}
                        </div>
                      </div>

                      {/* Left column value */}
                      <div style={{ textAlign: 'center', padding: '0 4px' }}>
                        {vLeft != null ? (
                          <>
                            <div className="perf-value" style={{
                              fontSize: '1.25rem', fontWeight: 900, lineHeight: 1,
                              color: winLeft ? winColor : tie ? tieColor : 'var(--text)',
                              display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3,
                            }}>
                              <span>{stat.format(vLeft)}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>{stat.unit}</span>
                              {winLeft && <span style={{ fontSize: '0.85rem', marginLeft: 2 }}>🏆</span>}
                            </div>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, marginTop: 7, overflow: 'hidden' }}>
                              <div className="perf-bar-fill" style={{
                                width: `${Math.max(pLeft, 6)}%`,
                                height: '100%',
                                background: winLeft ? winColor : tie ? tieColor : neutralColor,
                                borderRadius: 999,
                              }} />
                            </div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>—</span>
                        )}
                      </div>

                      {/* Right column value */}
                      <div style={{ textAlign: 'center', padding: '0 4px' }}>
                        {vRight != null ? (
                          <>
                            <div className="perf-value" style={{
                              fontSize: '1.25rem', fontWeight: 900, lineHeight: 1,
                              color: winRight ? winColor : tie ? tieColor : 'var(--text)',
                              display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3,
                            }}>
                              {winRight && <span style={{ fontSize: '0.85rem', marginRight: 2 }}>🏆</span>}
                              <span>{stat.format(vRight)}</span>
                              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>{stat.unit}</span>
                            </div>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, marginTop: 7, overflow: 'hidden' }}>
                              <div className="perf-bar-fill" style={{
                                width: `${Math.max(pRight, 6)}%`,
                                height: '100%',
                                background: winRight ? winColor : tie ? tieColor : neutralColor,
                                borderRadius: 999,
                              }} />
                            </div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Footer note */}
                <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isEn
                      ? 'Best available value per model. Price shown is starting MSRP.'
                      : 'הערך הטוב ביותר בין גימורי הדגם. מחיר מוצג הוא המחיר המומלץ ההתחלתי.'}
                  </span>
                </div>
              </div>
            </>
          );
        })()}

        {/* Price History Chart — self-hides when no data for both cars */}
        <div style={{ marginBottom: 28 }}>
          <PriceHistoryChart
            cars={priceCars}
            isEn={isEn}
            withCard={isEn ? 'Used Car Market Value by Year' : 'שווי שוק יד שניה לפי שנת ייצור'}
          />
        </div>

        {/* Pros & Cons — only shown for Hebrew locale (data is Hebrew from DB) */}
        {(prosA.length > 0 || prosB.length > 0 || consA.length > 0 || consB.length > 0) && (
          <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>{sp.prosAndConsTitle}</h2>
            <div className="cmp-proscons-flex" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{nameA}</div>
                {prosA.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                  </div>
                ))}
                {consA.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
              </div>
              <div className="cmp-proscons-vdiv" style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{nameB}</div>
                {prosB.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                  </div>
                ))}
                {consB.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Verdict */}
        {(scoreA !== null || scoreB !== null || avgA !== null || avgB !== null) && (() => {
          const rw = better(avgA, avgB);
          const sw = better(scoreA, scoreB);
          const winner = sw ?? rw;
          const winnerName = winner === 'a' ? nameA : winner === 'b' ? nameB : null;
          const loserName  = winner === 'a' ? nameB : winner === 'b' ? nameA : null;
          return (
            <div className="card" style={{ padding: '24px 28px', marginBottom: 28, borderRight: '4px solid var(--accent)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 12 }}>{sp.verdictTitle}</h2>
              {winner && winner !== 'tie' ? (
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {sp.verdictWinnerPre} <strong>{winnerName}</strong> {sp.verdictWinnerMid} {loserName}.
                  {(expertA[0]?.pros?.length ?? 0) > 0 || (expertB[0]?.pros?.length ?? 0) > 0 ? ` ${sp.verdictHasPros}` : ''}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {sp.verdictTie}
                </p>
              )}
            </div>
          );
        })()}

        {/* AI Comparison */}
        <CarComparisonAI
          make1={make1} model1={model1}
          make2={make2} model2={model2}
          nameAhe={`${mA.nameHe} ${modA.nameHe}`}
          nameBhe={`${mB.nameHe} ${modB.nameHe}`}
          nameAen={`${mA.nameEn} ${modA.nameEn}`}
          nameBen={`${mB.nameEn} ${modB.nameEn}`}
          locale={isEn ? 'en' : 'he'}
        />

        {/* Recalls Comparison */}
        <RecallsCompare
          make1={make1} model1={model1} name1={nameA}
          make2={make2} model2={model2} name2={nameB}
          make1En={mA.nameEn} model1En={modA.nameEn}
          make2En={mB.nameEn} model2En={modB.nameEn}
          locale={isEn ? 'en' : 'he'}
        />

        {/* Owner Reviews Highlights */}
        <ReviewsCompare
          make1={make1} model1={model1} name1={nameA}
          make2={make2} model2={model2} name2={nameB}
          locale={isEn ? 'en' : 'he'}
        />

        {/* CTA to interactive compare */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{sp.ctaTitle}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{sp.ctaSubtitle}</div>
          </div>
          <Link href={`/cars/compare?car1=${make1}/${model1}&car2=${make2}/${model2}`} className="btn btn-primary" style={{ height: 40, padding: '0 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            {sp.ctaButton}
          </Link>
        </div>

        {/* Related comparisons */}
        {(similarA.length > 0 || similarB.length > 0) && (
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{sp.relatedTitle}</h2>
            <div className="cmp-related-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {nameA} {sp.vsGroup}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {similarA.filter(s => !(s.makeSlug === make2 && s.model.slug === model2)).slice(0, 6).map(s => {
                    const [s1, s2] = [`${make1}/${model1}`, `${s.makeSlug}/${s.model.slug}`].sort();
                    const sName = isEn ? `${s.makeNameEn} ${s.model.nameEn}` : `${s.makeNameHe} ${s.model.nameHe}`;
                    return (
                      <Link key={`${s.makeSlug}/${s.model.slug}`} href={`/cars/compare/${s1}/${s2}`}
                        style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⚖️</span>
                        {nameA} vs {sName}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {nameB} {sp.vsGroup}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {similarB.filter(s => !(s.makeSlug === make1 && s.model.slug === model1)).slice(0, 6).map(s => {
                    const [s1, s2] = [`${make2}/${model2}`, `${s.makeSlug}/${s.model.slug}`].sort();
                    const sName = isEn ? `${s.makeNameEn} ${s.model.nameEn}` : `${s.makeNameHe} ${s.model.nameHe}`;
                    return (
                      <Link key={`${s.makeSlug}/${s.model.slug}`} href={`/cars/compare/${s1}/${s2}`}
                        style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⚖️</span>
                        {nameB} vs {sName}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${nameA} ${sp.vsWord} ${nameB}`,
          url: `${getBaseUrl(locale)}/cars/compare/${make1}/${model1}/${make2}/${model2}`,
          description: `${nameA} ${sp.vsWord} ${nameB}`,
        })}} />
      </div>
    </div>
  );
}

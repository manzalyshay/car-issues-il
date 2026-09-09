'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';
import HeroSearch from '@/components/HeroSearch';
import PlateSearch from '@/components/PlateSearch';
import { useLocale } from '@/lib/localeContext';

interface Make { slug: string; nameHe: string; nameEn: string; logoUrl: string; country: string; models: { slug: string; nameHe: string; nameEn: string }[]; }
interface TopCar { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; avgRating: number | null; imageUrl?: string | null; sketchfabUid?: string | null; }
interface Review { id: string; make_slug: string; model_slug: string; year: number | null; rating: number; title: string; body: string; title_en?: string | null; body_en?: string | null; author: string; created_at: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; }
interface TickerItem { code: string; textHe: string; textEn: string; color: string; }
interface Props { popularMakes: Make[]; allMakes: Make[]; topRanked: TopCar[]; recentReviews: Review[]; tickerItems?: TickerItem[]; }

function timeAgo(dateStr: string, locale: 'he' | 'en') {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return locale === 'he' ? 'היום' : 'today';
  if (days === 1) return locale === 'he' ? 'אתמול' : 'yesterday';
  if (days < 7) return locale === 'he' ? `לפני ${days} ימים` : `${days}d ago`;
  if (days < 30) return locale === 'he' ? `לפני ${Math.floor(days/7)} שבועות` : `${Math.floor(days/7)}w ago`;
  return locale === 'he' ? `לפני ${Math.floor(days/30)} חודשים` : `${Math.floor(days/30)}mo ago`;
}

/* Score tier */
function scoreTier(s: number) { return s >= 8.5 ? 'hi' : s >= 7.5 ? 'mid' : 'lo'; }

/* Car ghost SVG — matches design handoff */
function CarGhost() {
  return (
    <svg className="car-ghost" viewBox="0 0 120 60" fill="none">
      <path d="M8 42 L18 26 C20 22 24 20 29 20 L74 20 C80 20 85 22 90 27 L102 39"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 42 L112 42 C114 42 115 41 115 39 L114 35 C113.5 33 112 32 110 32 L98 32"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 20 L36 32 L70 32 L72 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <circle cx="34" cy="44" r="9" stroke="currentColor" strokeWidth="3"/>
      <circle cx="86" cy="44" r="9" stroke="currentColor" strokeWidth="3"/>
    </svg>
  );
}

/* Ticker items — fallback shown when server provides no real data */
const TICKER_FALLBACK: TickerItem[] = [
  { code: 'תיקון', textHe: 'סובארו XV · גיר CVT דווח ב-84,000 ק"מ', textEn: 'Subaru XV · CVT gearbox reported at 84,000 km', color: '#ff9b8d' },
  { code: 'תיקון', textHe: 'טויוטה RAV4 · דיסקיות הוחלפו ב-₪1,120', textEn: 'Toyota RAV4 · discs replaced for ₪1,120', color: '#6fd9a0' },
  { code: 'ריקול', textHe: 'ריקול חדש · מערכת דלק, דגמי 2019', textEn: 'New recall · fuel system, 2019 models', color: '#ff9b8d' },
  { code: 'ביקורת', textHe: 'יונדאי טוסון 2021 · 4/5 ★', textEn: 'Hyundai Tucson 2021 · 4/5 ★', color: '#9dc4e8' },
  { code: 'תיקון', textHe: 'מאזדה CX-5 · מתלים קדמיים ב-92,000 ק"מ', textEn: 'Mazda CX-5 · front suspension at 92,000 km', color: '#9dc4e8' },
  { code: 'ריקול', textHe: "קיה ספורטז' · כרית אוויר, 2018–2020", textEn: 'Kia Sportage · airbag, 2018–2020', color: '#ff9b8d' },
];

/* Car card matching design handoff */
function CarCard({ car, isHe }: { car: TopCar; isHe: boolean }) {
  const name  = isHe ? `${car.makeHe} ${car.modelHe}` : `${car.makeEn} ${car.modelEn}`;
  const score = Math.round(car.combined * 10) / 10;
  const scoreBg = score >= 8.2 ? '#1b9e5f' : '#1b4f8a';
  // Gradient fallback for cards without real photos
  const idx   = (car.makeSlug.charCodeAt(0) + car.modelSlug.charCodeAt(0)) % 6;
  const grads = [
    ['#dde6f1','#b9c7da'],['#d6e8f1','#a9c9dd'],['#dde8e0','#b9cfbb'],
    ['#e8dde1','#d0b9c0'],['#e3e8d6','#c5cfb3'],['#ddd6e8','#bcb3cf'],
  ];
  const [g1, g2] = grads[idx];

  return (
    <Link href={`/cars/${car.makeSlug}/${car.modelSlug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 13, overflow: 'hidden' }} className="ci-car-card-new">
        {/* Photo with score badge overlay */}
        <div style={{ position: 'relative', aspectRatio: '16/10', background: car.imageUrl ? '#f8fafc' : `linear-gradient(150deg, ${g1}, ${g2})` }}>
          {car.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={car.imageUrl}
              alt={`${car.makeEn} ${car.modelEn}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(27,79,138,0.25)' }}>
              <CarGhost />
            </div>
          )}
          {/* Score badge — top-right overlay */}
          <span style={{
            position: 'absolute', top: 9, insetInlineEnd: 9,
            fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700,
            color: '#f8fafc', background: scoreBg,
            borderRadius: 4, padding: '2px 7px',
          }}>
            {score.toFixed(1)}
          </span>
        </div>
        {/* Info */}
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 4 }}>{name}</div>
          {car.avgRating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <StarRating rating={car.avgRating * 2} size={11} />
              <span style={{ fontSize: 11, color: '#8595a6', fontWeight: 600 }}>{car.avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Curated model lists per category (Israeli market)
type CatModel = { makeSlug: string; modelSlug: string; makeEn: string; modelEn: string; makeHe: string; modelHe: string; };
const CATEGORY_MODELS: Record<string, CatModel[]> = {
  suv: [
    { makeSlug: 'toyota',   modelSlug: 'rav4',       makeEn: 'Toyota',   modelEn: 'RAV4',        makeHe: 'טויוטה',  modelHe: 'RAV4' },
    { makeSlug: 'hyundai',  modelSlug: 'tucson',     makeEn: 'Hyundai',  modelEn: 'Tucson',       makeHe: 'יונדאי',  modelHe: 'טוסון' },
    { makeSlug: 'kia',      modelSlug: 'sportage',   makeEn: 'Kia',      modelEn: 'Sportage',     makeHe: 'קיה',     modelHe: "ספורטז'" },
    { makeSlug: 'mazda',    modelSlug: 'cx5',        makeEn: 'Mazda',    modelEn: 'CX-5',         makeHe: 'מאזדה',   modelHe: 'CX-5' },
    { makeSlug: 'hyundai',  modelSlug: 'santa-fe',   makeEn: 'Hyundai',  modelEn: 'Santa Fe',     makeHe: 'יונדאי',  modelHe: 'סנטה פה' },
    { makeSlug: 'kia',      modelSlug: 'sorento',    makeEn: 'Kia',      modelEn: 'Sorento',      makeHe: 'קיה',     modelHe: 'סורנטו' },
  ],
  hybrid: [
    { makeSlug: 'toyota',   modelSlug: 'corolla',        makeEn: 'Toyota',  modelEn: 'Corolla',        makeHe: 'טויוטה',  modelHe: 'קורולה' },
    { makeSlug: 'toyota',   modelSlug: 'rav4',           makeEn: 'Toyota',  modelEn: 'RAV4 Hybrid',    makeHe: 'טויוטה',  modelHe: 'RAV4 היברידי' },
    { makeSlug: 'toyota',   modelSlug: 'yaris-cross',    makeEn: 'Toyota',  modelEn: 'Yaris Cross',    makeHe: 'טויוטה',  modelHe: 'יאריס קרוס' },
    { makeSlug: 'toyota',   modelSlug: 'corolla-cross',  makeEn: 'Toyota',  modelEn: 'Corolla Cross',  makeHe: 'טויוטה',  modelHe: 'קורולה קרוס' },
    { makeSlug: 'kia',      modelSlug: 'niro',           makeEn: 'Kia',     modelEn: 'Niro',           makeHe: 'קיה',     modelHe: 'נירו' },
    { makeSlug: 'toyota',   modelSlug: 'prius',          makeEn: 'Toyota',  modelEn: 'Prius',          makeHe: 'טויוטה',  modelHe: 'פריוס' },
  ],
  electric: [
    { makeSlug: 'hyundai',  modelSlug: 'ioniq-5',    makeEn: 'Hyundai',  modelEn: 'Ioniq 5',      makeHe: 'יונדאי',  modelHe: 'איוניק 5' },
    { makeSlug: 'hyundai',  modelSlug: 'ioniq-6',    makeEn: 'Hyundai',  modelEn: 'Ioniq 6',      makeHe: 'יונדאי',  modelHe: 'איוניק 6' },
    { makeSlug: 'kia',      modelSlug: 'ev6',        makeEn: 'Kia',      modelEn: 'EV6',          makeHe: 'קיה',     modelHe: 'EV6' },
    { makeSlug: 'byd',      modelSlug: 'atto3',      makeEn: 'BYD',      modelEn: 'Atto 3',       makeHe: 'BYD',     modelHe: 'Atto 3' },
    { makeSlug: 'kia',      modelSlug: 'ev9',        makeEn: 'Kia',      modelEn: 'EV9',          makeHe: 'קיה',     modelHe: 'EV9' },
    { makeSlug: 'byd',      modelSlug: 'seal',       makeEn: 'BYD',      modelEn: 'Seal',         makeHe: 'BYD',     modelHe: 'Seal' },
  ],
  sedan: [
    { makeSlug: 'toyota',   modelSlug: 'camry',      makeEn: 'Toyota',   modelEn: 'Camry',        makeHe: 'טויוטה',  modelHe: 'קאמרי' },
    { makeSlug: 'hyundai',  modelSlug: 'elantra',    makeEn: 'Hyundai',  modelEn: 'Elantra',      makeHe: 'יונדאי',  modelHe: 'אלנטרה' },
    { makeSlug: 'honda',    modelSlug: 'civic',      makeEn: 'Honda',    modelEn: 'Civic',        makeHe: 'הונדה',   modelHe: "סיוויק" },
    { makeSlug: 'kia',      modelSlug: 'cerato',     makeEn: 'Kia',      modelEn: 'Cerato',       makeHe: 'קיה',     modelHe: 'סראטו' },
    { makeSlug: 'toyota',   modelSlug: 'corolla',    makeEn: 'Toyota',   modelEn: 'Corolla',      makeHe: 'טויוטה',  modelHe: 'קורולה' },
    { makeSlug: 'hyundai',  modelSlug: 'sonata',     makeEn: 'Hyundai',  modelEn: 'Sonata',       makeHe: 'יונדאי',  modelHe: 'סונטה' },
  ],
  hatchback: [
    { makeSlug: 'toyota',   modelSlug: 'yaris',      makeEn: 'Toyota',   modelEn: 'Yaris',        makeHe: 'טויוטה',  modelHe: 'יאריס' },
    { makeSlug: 'hyundai',  modelSlug: 'i20',        makeEn: 'Hyundai',  modelEn: 'i20',          makeHe: 'יונדאי',  modelHe: 'i20' },
    { makeSlug: 'honda',    modelSlug: 'jazz',       makeEn: 'Honda',    modelEn: 'Jazz',         makeHe: 'הונדה',   modelHe: "ג'אז" },
    { makeSlug: 'kia',      modelSlug: 'picanto',    makeEn: 'Kia',      modelEn: 'Picanto',      makeHe: 'קיה',     modelHe: 'פיקנטו' },
    { makeSlug: 'hyundai',  modelSlug: 'i30',        makeEn: 'Hyundai',  modelEn: 'i30',          makeHe: 'יונדאי',  modelHe: 'i30' },
    { makeSlug: 'honda',    modelSlug: 'hrv',        makeEn: 'Honda',    modelEn: 'HR-V',         makeHe: 'הונדה',   modelHe: 'HR-V' },
  ],
};

export default function HomeClient({ popularMakes, allMakes, topRanked, recentReviews, tickerItems: tickerItemsProp }: Props) {
  const { locale, t } = useLocale();
  const isHe = locale === 'he';
  const makeName = (m: Make) => isHe ? m.nameHe : m.nameEn;
  const totalModels = allMakes.reduce((s, m) => s + m.models.length, 0);

  // Build logo map from allMakes
  const logoMap = Object.fromEntries(allMakes.map(m => [m.slug, m.logoUrl]));

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'model' | 'plate'>('model');

  const cats = isHe
    ? [
        { key: 'suv',       label: 'רכבי פנאי' },
        { key: 'hybrid',    label: 'היברידי' },
        { key: 'electric',  label: 'חשמלי' },
        { key: 'sedan',     label: 'סדאן' },
        { key: 'hatchback', label: "האצ'בק" },
      ]
    : [
        { key: 'suv',       label: 'SUV' },
        { key: 'hybrid',    label: 'Hybrid' },
        { key: 'electric',  label: 'Electric' },
        { key: 'sedan',     label: 'Sedan' },
        { key: 'hatchback', label: 'Hatchback' },
      ];

  const tickerItems = (tickerItemsProp && tickerItemsProp.length > 0 ? tickerItemsProp : TICKER_FALLBACK);
  const topCar = topRanked[0] ?? null;

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', direction: isHe ? 'rtl' : 'ltr' }}>

      {/* ── Live ticker ── */}
      <div style={{ background: '#0f2c4d', borderBottom: '1px solid #16395e', overflow: 'hidden', height: 32, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 clamp(14px,3vw,24px)', flexShrink: 0, borderInlineEnd: '1px solid #2a5680', height: '100%' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1b9e5f', animation: 'ci-pulse 1.8s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', color: '#8fb3d6', whiteSpace: 'nowrap' }}>
            {isHe ? 'דיווחים חיים' : 'LIVE REPORTS'}
          </span>
        </div>
        <div dir="ltr" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'ci-ticker 52s linear infinite' }}>
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, paddingInline: 16, fontSize: 11.5, color: '#c3d6ea', whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: item.color }}>
                  {isHe ? item.code : ({ 'ביקורת': 'REVIEW', 'תיקון': 'REPAIR', 'ריקול': 'RECALL' }[item.code] ?? item.code)}
                </span>
                <span>{isHe ? item.textHe : item.textEn}</span>
                <span style={{ color: '#2a4b6f' }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          HERO — light 2-column layout
          ═══════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #eef1f5', background: '#fff' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 340px at 80% -10%, rgba(27,79,138,0.07), transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1240, marginInline: 'auto', padding: '28px clamp(14px,3vw,30px) 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'end' }}>

          {/* Left: text + search */}
          <div style={{ minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #b8e0c9', background: 'rgba(46,230,168,0.07)', borderRadius: 5, padding: '4px 10px', marginBottom: 12 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#1b9e5f', flexShrink: 0 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', color: '#1b9e5f', whiteSpace: 'nowrap' }}>
                {isHe ? `${allMakes.length}+ יצרנים · ${totalModels}+ דגמים` : `${allMakes.length}+ makes · ${totalModels}+ models`}
              </span>
            </span>
            <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(24px,3.2vw,36px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#1c2733' }}>
              {isHe
                ? 'כל תקלה, כל ריקול, כל עלות — לפני שאתם קונים.'
                : 'Every fault, every recall, every cost — before you buy.'}
            </h1>
            <p style={{ margin: '0 0 18px', fontSize: 14.5, color: '#66788c', maxWidth: '44ch' }}>
              {isHe
                ? 'ביקורות בעלים, ניתוחי AI, ריקולים ועלויות תיקון — לכל דגם בשוק הישראלי.'
                : 'Owner reviews, AI analysis, recalls and repair costs — every model in Israel.'}
            </p>

            {/* Search card */}
            <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12, padding: 11, boxShadow: '0 2px 12px rgba(27,79,138,0.08)' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 9, direction: isHe ? 'rtl' : 'ltr' }}>
                {[
                  { key: 'model', label: isHe ? 'לפי דגם' : 'By model' },
                  { key: 'plate', label: isHe ? 'לפי מספר רכב' : 'By plate' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSearchMode(key as 'model' | 'plate')}
                    style={{
                      border: 'none', borderRadius: 6, padding: '6px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: searchMode === key ? '#1b4f8a' : '#f0f3f7',
                      color: searchMode === key ? '#fff' : '#66788c',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ direction: isHe ? 'rtl' : 'ltr' }}>
                {searchMode === 'model' ? <HeroSearch /> : <PlateSearch isHe={isHe} />}
              </div>
              {/* Trending chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #eef1f5' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#a8b5c4', whiteSpace: 'nowrap' }}>
                  {isHe ? 'נבדק הרבה' : 'TRENDING'}
                </span>
                {(isHe ? [
                  { label: 'סובארו XV', href: '/cars/subaru/xv' },
                  { label: 'טויוטה RAV4', href: '/cars/toyota/rav4' },
                  { label: 'יונדאי טוסון', href: '/cars/hyundai/tucson' },
                  { label: "קיה ספורטז'", href: '/cars/kia/sportage' },
                ] : [
                  { label: 'Subaru XV', href: '/cars/subaru/xv' },
                  { label: 'Toyota RAV4', href: '/cars/toyota/rav4' },
                  { label: 'Hyundai Tucson', href: '/cars/hyundai/tucson' },
                  { label: 'Kia Sportage', href: '/cars/kia/sportage' },
                ]).map(chip => (
                  <Link key={chip.label} href={chip.href} style={{ border: '1px solid #dde3ea', borderRadius: 5, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: '#4a5b6d', textDecoration: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1b4f8a'; (e.currentTarget as HTMLElement).style.color = '#1b4f8a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#dde3ea'; (e.currentTarget as HTMLElement).style.color = '#4a5b6d'; }}
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right: featured model stats panel */}
          {topCar && (
            <div style={{ minWidth: 0 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e3e8ee', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef1f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#a8b5c4', marginBottom: 4 }}>
                      {isHe ? 'דגם מוביל' : 'TOP MODEL'}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.015em', color: '#1c2733' }}>
                      {isHe ? `${topCar.makeHe} ${topCar.modelHe}` : `${topCar.makeEn} ${topCar.modelEn}`}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, color: '#1b9e5f', border: '1px solid #b8e0c9', background: 'rgba(46,230,168,0.07)', borderRadius: 5, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                    {isHe ? 'מומלץ' : 'RECOMMENDED'}
                  </span>
                </div>
                {/* Score display */}
                <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 48, fontWeight: 700, color: '#1b4f8a', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {(Math.round(topCar.combined * 10) / 10).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 14, color: '#8595a6' }}>/10</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: isHe ? 'אמינות' : 'Reliability', pct: '88%', color: '#1b9e5f' },
                      { label: isHe ? 'נוחות' : 'Comfort', pct: '82%', color: '#1b4f8a' },
                      { label: isHe ? 'בטיחות' : 'Safety', pct: '90%', color: '#1b9e5f' },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: '#66788c', fontWeight: 600 }}>{s.label}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: s.color }}>{s.pct}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 999, background: '#e3e8ee', overflow: 'hidden' }}>
                          <div style={{ width: s.pct, height: '100%', background: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <Link href={`/cars/${topCar.makeSlug}/${topCar.modelSlug}`}
                    style={{ display: 'block', width: '100%', height: 40, lineHeight: '40px', textAlign: 'center', border: '1px solid #dde3ea', background: '#fff', color: '#1c2733', borderRadius: 8, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}
                  >
                    {isHe ? 'לדוח המלא ←' : 'Full report →'}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Stat strip ── */}
      <div style={{ borderBottom: '1px solid #eef1f5', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1240, marginInline: 'auto', padding: '0 clamp(14px,3vw,30px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          {[
            { value: `${allMakes.length}+`, label: isHe ? 'יצרנים' : 'Makes' },
            { value: `${totalModels}+`, label: isHe ? 'דגמים' : 'Models' },
            { value: '2,400+', label: isHe ? 'ביקורות בעלים' : 'Owner reviews' },
            { value: '13K+', label: isHe ? 'ריקולים' : 'Recalls' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '14px 10px', borderInlineEnd: '1px solid #f0f3f7' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#1c2733', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: '#8595a6', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wrap">

        {/* Trending category chips */}
        <section style={{ margin: '24px 0 8px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {isHe ? 'פופולרי:' : 'Trending:'}
            </span>
            {cats.map(c => (
              <button
                key={c.key}
                onClick={() => setSelectedCat(selectedCat === c.key ? null : c.key)}
                className="ci-chip"
                style={{
                  border: 'none', cursor: 'pointer',
                  background: selectedCat === c.key ? 'var(--accent)' : undefined,
                  color: selectedCat === c.key ? '#fff' : undefined,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Model grid for selected category */}
          {selectedCat && CATEGORY_MODELS[selectedCat] && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {CATEGORY_MODELS[selectedCat].map(m => (
                  <Link
                    key={`${m.makeSlug}/${m.modelSlug}`}
                    href={`/cars/${m.makeSlug}/${m.modelSlug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }} className="cat-model-card">
                      <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MakeLogo logoUrl={logoMap[m.makeSlug] ?? ''} nameEn={m.makeEn} size={22} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.makeEn}</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                          {isHe ? m.modelHe : m.modelEn}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <Link
                  href={`/cars/category/${selectedCat}`}
                  style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                >
                  {isHe ? `כל רכבי ${cats.find(c => c.key === selectedCat)?.label} ←` : `All ${cats.find(c => c.key === selectedCat)?.label} →`}
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════
            TOP RANKED
            ═══════════════════════════════════════════════════ */}
        {topRanked.length > 0 && (
          <section className="ci-section">
            <div className="ci-section-head">
              <div>
                <h2>{isHe ? 'גלו דגמים' : 'Explore Models'}</h2>
                <p>{isHe ? 'רכבים פופולריים באתר' : 'Popular models on the site'}</p>
              </div>
              <Link href="/rankings" className="ci-section-link">
                {isHe ? 'לכל הדירוגים ←' : 'All rankings →'}
              </Link>
            </div>
            <div className="car-grid">
              {topRanked.map(car => (
                <CarCard key={`${car.makeSlug}/${car.modelSlug}`} car={car} isHe={isHe} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════
            HEAD TO HEAD
            ═══════════════════════════════════════════════════ */}
        <section style={{ margin: '8px 0 32px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {isHe ? 'ראש בראש' : 'Head to Head'}
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#8595a6' }}>
            {isHe ? 'ההשוואות שנבדקות הכי הרבה' : 'The comparisons people run most'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {[
              { aHe: 'טויוטה RAV4',   bHe: 'יונדאי טוסון', aEn: 'Toyota RAV4',     bEn: 'Hyundai Tucson', aScore: '8.7', bScore: '8.3', aW: '51%', bW: '49%', aC: '#1b9e5f', bC: '#1b4f8a', metaHe: '2,340 השוואות', metaEn: '2,340 comparisons', href: '/cars/compare/toyota/rav4/hyundai/tucson' },
              { aHe: 'מאזדה CX-5',    bHe: 'קיה ספורטז׳',   aEn: 'Mazda CX-5',      bEn: 'Kia Sportage',   aScore: '8.9', bScore: '8.1', aW: '52%', bW: '48%', aC: '#1b9e5f', bC: '#1b4f8a', metaHe: '1,820 השוואות', metaEn: '1,820 comparisons', href: '/cars/compare/mazda/cx5/kia/sportage' },
              { aHe: 'יונדאי אלנטרה', bHe: 'קיה סראטו',     aEn: 'Hyundai Elantra', bEn: 'Kia Cerato',     aScore: '8.2', bScore: '8.0', aW: '51%', bW: '49%', aC: '#1b9e5f', bC: '#1b4f8a', metaHe: '1,550 השוואות', metaEn: '1,550 comparisons', href: '/cars/compare/hyundai/elantra/kia/cerato' },
              { aHe: 'טויוטה קורולה', bHe: 'הונדה סיוויק',  aEn: 'Toyota Corolla',  bEn: 'Honda Civic',    aScore: '8.5', bScore: '8.3', aW: '51%', bW: '49%', aC: '#1b9e5f', bC: '#1b4f8a', metaHe: '1,210 השוואות', metaEn: '1,210 comparisons', href: '/cars/compare/toyota/corolla/honda/civic' },
            ].map((vs, i) => (
              <Link key={i} href={vs.href} style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 12, padding: '14px 16px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{isHe ? vs.aHe : vs.aEn}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#a8b5c4' }}>VS</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{isHe ? vs.bHe : vs.bEn}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: vs.aC }}>{vs.aScore}</span>
                  <span style={{ flex: 1, display: 'flex', height: 4, borderRadius: 999, overflow: 'hidden', background: '#eef1f5' }}>
                    <span style={{ width: vs.aW, background: vs.aC }} />
                    <span style={{ width: vs.bW, background: vs.bC }} />
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: vs.bC }}>{vs.bScore}</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 9.5, color: '#a8b5c4', marginTop: 8 }}>{isHe ? vs.metaHe : vs.metaEn}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            BUYING CHECKLIST CTA
            ═══════════════════════════════════════════════════ */}
        <section style={{ margin: '8px 0 32px' }}>
          <div style={{ border: '1px solid #e3e8ee', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
            <div style={{ height: 7, backgroundImage: 'repeating-linear-gradient(135deg, #1b4f8a 0 10px, #dce9f6 10px 20px)' }} />
            <div style={{ padding: '24px clamp(16px,3vw,26px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 22, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#1b4f8a' }}>
                  {isHe ? 'כלי חדש' : 'NEW TOOL'}
                </span>
                <h2 style={{ margin: '8px 0 6px', fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>
                  {isHe ? 'צ׳קליסט קנייה שמותאם לרכב' : 'A buying checklist built around your car'}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#4a5b6d', maxWidth: '42ch' }}>
                  {isHe ? '22 בדיקות לפי סדר ביצוע — לפני שאתם חותמים' : '22 checks in running order — before you sign'}
                </p>
                <Link href="/checklist"
                  style={{ display: 'inline-block', marginTop: 16, height: 42, lineHeight: '42px', padding: '0 20px', border: 'none', borderRadius: 8, background: '#1b4f8a', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
                >
                  {isHe ? 'התחילו צ׳קליסט ←' : 'Start the checklist →'}
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {(isHe ? [
                  { num: '01', label: 'בדיקת היסטוריית רכב', bg: '#eef3fb', color: '#1b4f8a' },
                  { num: '02', label: 'מבחן נסיעה', bg: '#e7f5ed', color: '#1b7a4b' },
                  { num: '03', label: 'בדיקת מכונאי', bg: '#fef3cd', color: '#92620a' },
                  { num: '04', label: 'בדיקת ריקולים פתוחים', bg: '#fde8e8', color: '#b23b2e' },
                ] : [
                  { num: '01', label: 'Vehicle history check', bg: '#eef3fb', color: '#1b4f8a' },
                  { num: '02', label: 'Test drive', bg: '#e7f5ed', color: '#1b7a4b' },
                  { num: '03', label: 'Mechanic inspection', bg: '#fef3cd', color: '#92620a' },
                  { num: '04', label: 'Open recall check', bg: '#fde8e8', color: '#b23b2e' },
                ]).map(step => (
                  <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e3e8ee', borderRadius: 8, padding: '10px 12px' }}>
                    <span style={{ width: 21, height: 21, borderRadius: 5, background: step.bg, color: step.color, display: 'grid', placeItems: 'center', fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{step.num}</span>
                    <span style={{ flex: 1, fontSize: 12.5, color: '#3d4c5c', fontWeight: 600 }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            MAIN CONTENT + SIDEBAR
            ═══════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start', marginBottom: 64 }} className="home-main-grid">

          {/* ── Latest Reviews ── */}
          <div>
            <div className="ci-section-head" style={{ marginTop: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: 22 }}>{isHe ? 'ביקורות אחרונות' : 'Latest Reviews'}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }} className="reviews-grid">
              {recentReviews.filter(r => locale !== 'en' || Boolean(r.title_en || r.body_en)).slice(0, 6).map((r) => {
                const showEn = locale === 'en' && Boolean(r.title_en || r.body_en);
                const cName  = showEn ? `${r.makeEn} ${r.modelEn}` : `${r.makeHe} ${r.modelHe}`;
                const body   = showEn ? (r.body_en || r.body || '') : (r.body || '');
                return (
                  <Link key={r.id || r.make_slug + r.created_at}
                    href={`/cars/${r.make_slug}/${r.model_slug}${r.id ? `#review-${r.id}` : ''}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
                      padding: '14px 16px', height: '100%',
                      transition: 'box-shadow 0.18s, border-color 0.18s', boxShadow: 'var(--shadow)',
                    }} className="review-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MakeLogo logoUrl={r.logoUrl} nameEn={r.makeEn || r.makeHe} size={24} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cName}{r.year ? ` ${r.year}` : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <StarRating rating={r.rating} size={10} />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>{timeAgo(r.created_at, locale as 'he'|'en')}</span>
                          </div>
                        </div>
                      </div>
                      <p style={{
                        fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        direction: showEn ? 'ltr' : 'rtl',
                      }}>
                        {body}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link href="/cars" className="btn btn-outline" style={{ fontSize: '0.82rem', height: 38, padding: '0 18px' }}>
              {isHe ? 'כל הביקורות ←' : 'All Reviews →'}
            </Link>

            {/* Videos */}
            <div style={{ marginTop: 40 }}>
              <div className="ci-section-head" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 22 }}>{isHe ? 'סרטונים' : 'Videos'}</h2>
              </div>
              <VideosFeed locale={locale} isHe={isHe} />
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Popular Makes */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {isHe ? 'יצרנים פופולריים' : 'Popular Makes'}
                </span>
                <Link href="/cars" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                  {isHe ? 'הכל' : 'All'}
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)' }}>
                {popularMakes.slice(0, 9).map(m => (
                  <Link key={m.slug} href={`/cars/${m.slug}`}
                    style={{ background: 'var(--surface)', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', transition: 'background 0.15s' }}
                    className="make-logo-cell"
                  >
                    <MakeLogo logoUrl={m.logoUrl} nameEn={m.nameEn} size={28} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                      {makeName(m)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Car News */}
            <NewsWidget isHe={isHe} />

            {/* Latest Recalls */}
            <RecallsWidget isHe={isHe} />

          </aside>
        </div>

      </div>{/* /wrap */}

      <style>{`
        .ci-car-card:hover .photo-label { opacity: 1; }
        .review-card:hover { box-shadow: var(--shadow-lg) !important; border-color: var(--border-strong) !important; }
        .make-logo-cell:hover { background: var(--accent-soft) !important; }
        .cat-model-card:hover { border-color: var(--accent) !important; box-shadow: var(--shadow) !important; }
        @media (max-width: 860px) { .home-main-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .reviews-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

/* ── Videos feed ── */
interface Video { youtube_id: string; title: string; thumbnail_url: string; make_slug: string; model_slug: string; }

function VideoCard({ v }: { v: Video }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div style={{ position:'relative', borderRadius:8, overflow:'hidden', aspectRatio:'16/9', background:'#000' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?autoplay=1&rel=0`}
          title={v.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width:'100%', height:'100%', border:'none', display:'block' }}
        />
      </div>
    );
  }
  return (
    <button onClick={() => setPlaying(true)}
      style={{ display:'block', position:'relative', borderRadius:8, overflow:'hidden', aspectRatio:'16/9', background:'var(--surface-2)', border:'none', padding:0, cursor:'pointer', width:'100%' }}
    >
      <img src={v.thumbnail_url} alt={v.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}
        onError={e => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`; }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(transparent 40%, rgba(0,0,0,.6))', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, background:'rgba(255,0,0,.85)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'1rem' }}>▶</div>
      </div>
      <p style={{ position:'absolute', bottom:0, left:0, right:0, padding:'4px 7px', fontSize:'0.65rem', fontWeight:600, color:'#fff', lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', textAlign:'start' }}>
        {v.title}
      </p>
    </button>
  );
}

function VideosFeed({ locale, isHe }: { locale: string; isHe: boolean }) {
  const [videos, setVideos] = useState<Video[] | null>(null);
  useEffect(() => {
    fetch('/api/videos').then(r => r.json()).then((d: Video[]) => setVideos(d.slice(0, 6))).catch(() => setVideos([]));
  }, []);

  if (videos === null) {
    return (
      <div className="videos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[0,1,2].map(i => <div key={i} style={{ aspectRatio:'16/9', background:'var(--surface-2)', borderRadius:8 }} className="skeleton" />)}
      </div>
    );
  }
  if (videos.length === 0) return null;
  return (
    <div className="videos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
      {videos.map((v, i) => <VideoCard key={i} v={v} />)}
    </div>
  );
}

/* ── News widget ── */
interface NewsItem { id: string; title_he: string | null; title_en: string | null; image_url: string | null; published_at: string | null; original_url: string; source: string; }
function NewsWidget({ isHe }: { isHe: boolean }) {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    fetch('/api/car-news?limit=4').then(r => r.json()).then((d: { news?: NewsItem[] }) => setNews(d.news ?? [])).catch(() => setNews([]));
  }, []);
  if (!news || news.length === 0) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {isHe ? 'חדשות רכב' : 'Car News'}
        </span>
        <Link href="/news" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
          {isHe ? 'כל החדשות' : 'All news'}
        </Link>
      </div>
      <div>
        {news.map((item, i) => (
          <a key={item.id} href={item.original_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: i < news.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
          >
            {item.image_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={item.image_url} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} loading="lazy" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {isHe ? (item.title_he ?? item.title_en) : (item.title_en ?? item.title_he)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Recalls widget ── */
interface Recall { id: string; manufacturer: string; component: string; summary: string; date: string; }
function RecallsWidget({ isHe }: { isHe: boolean }) {
  const [recalls, setRecalls] = useState<Recall[] | null>(null);
  const locale = isHe ? 'he' : 'en';
  useEffect(() => {
    fetch(`/api/recalls?make=Toyota&model=RAV4&years=2019,2020,2021,2022,2023&locale=${locale}`)
      .then(r => r.json()).then((d: { recalls?: Recall[] }) => setRecalls((d.recalls ?? []).slice(0, 4))).catch(() => setRecalls([]));
  }, [locale]);
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', overflow:'hidden', boxShadow:'var(--shadow)' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
        <span style={{ fontSize:'0.72rem', fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text-muted)' }}>
          {isHe ? 'ריקולים אחרונים' : 'Latest Recalls'}
        </span>
      </div>
      {!recalls ? (
        <div style={{ padding:16 }}>
          {[0,1,2].map(i => <div key={i} style={{ height:12, background:'var(--surface-2)', borderRadius:4, marginBottom:10 }} className="skeleton" />)}
        </div>
      ) : recalls.length === 0 ? (
        <p style={{ padding:'16px', fontSize:'0.82rem', color:'var(--text-muted)' }}>{isHe ? 'אין ריקולים' : 'No recalls'}</p>
      ) : (
        <div>
          {recalls.map((rc, i) => (
            <div key={rc.id || i} style={{ display:'flex', gap:10, padding:'10px 16px', borderBottom: i < recalls.length - 1 ? '1px solid var(--border)' : 'none', alignItems:'flex-start' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--bad)', flexShrink:0, marginTop:5 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text)', marginBottom:2 }}>{rc.component}</div>
                <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {rc.summary}
                </div>
                {rc.date && <div style={{ fontSize:'0.65rem', color:'var(--text-faint)', marginTop:2 }}>{rc.date}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

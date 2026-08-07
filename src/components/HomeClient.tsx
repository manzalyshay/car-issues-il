'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';
import HeroSearch from '@/components/HeroSearch';
import PlateSearch from '@/components/PlateSearch';
import { useLocale } from '@/lib/localeContext';

interface Make { slug: string; nameHe: string; nameEn: string; logoUrl: string; country: string; models: { slug: string; nameHe: string; nameEn: string }[]; }
interface TopCar { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; avgRating: number | null; imageUrl?: string | null; }
interface Review { id: string; make_slug: string; model_slug: string; year: number | null; rating: number; title: string; body: string; title_en?: string | null; body_en?: string | null; author: string; created_at: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; }
interface Props { popularMakes: Make[]; allMakes: Make[]; topRanked: TopCar[]; recentReviews: Review[]; }

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

/* Car card matching design handoff */
function CarCard({ car, isHe }: { car: TopCar; isHe: boolean }) {
  const name  = isHe ? `${car.makeHe} ${car.modelHe}` : `${car.makeEn} ${car.modelEn}`;
  const score = Math.round(car.combined * 10) / 10;
  const tier  = scoreTier(score);
  // Gradient fallback for cards without real photos
  const idx   = (car.makeSlug.charCodeAt(0) + car.modelSlug.charCodeAt(0)) % 6;
  const grads = [
    ['#dde6f1','#b9c7da'],['#d6e8f1','#a9c9dd'],['#dde8e0','#b9cfbb'],
    ['#e8dde1','#d0b9c0'],['#e3e8d6','#c5cfb3'],['#ddd6e8','#bcb3cf'],
  ];
  const [g1, g2] = grads[idx];

  return (
    <Link href={`/cars/${car.makeSlug}/${car.modelSlug}`} className="ci-car-card">
      {/* Photo — real image if available, gradient placeholder otherwise */}
      <div className="ci-photo" style={car.imageUrl ? undefined : ({ '--ci-g1': g1, '--ci-g2': g2 } as React.CSSProperties)}>
        {car.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={car.imageUrl}
            alt={`${car.makeEn} ${car.modelEn}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <CarGhost />
        )}
        <span className="photo-label">{car.makeEn} {car.modelEn}</span>
      </div>
      <div className="body">
        <div className="titles">
          <div>
            <h3>{name}</h3>
          </div>
          <span className={`score-badge sm score-tier-${tier}`}>
            <span className="n">{score.toFixed(1)}</span>
            <span className="of">{isHe ? 'מתוך 10' : '/10'}</span>
          </span>
        </div>
        <div className="foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {car.avgRating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <StarRating rating={car.avgRating * 2} size={12} />
              <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
                {car.avgRating.toFixed(1)}
              </span>
            </div>
          )}
          <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, marginInlineStart: 'auto' }}>
            {isHe ? 'ראה ביקורות ←' : 'See reviews →'}
          </span>
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
    { makeSlug: 'hyundai',  modelSlug: 'tucson',     makeEn: 'Hyundai',  modelEn: 'Tucson',       makeHe: 'יונדאי',  modelHe: 'טוקסון' },
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

export default function HomeClient({ popularMakes, allMakes, topRanked, recentReviews }: Props) {
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

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', direction: isHe ? 'rtl' : 'ltr' }}>

      <div className="wrap">

        {/* ═══════════════════════════════════════════════════
            HERO — radial gradient card + 3D car split
            ═══════════════════════════════════════════════════ */}
        <section className="ci-hero">
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem,4vw,2.875rem)',
              fontWeight: 800, lineHeight: 1.08,
              color: 'var(--text)', marginBottom: 14,
              letterSpacing: '-0.02em',
            }}>
              {isHe
                ? 'כל מה שצריך לדעת לפני שקונים רכב'
                : 'Everything you need to know before buying a car'}
            </h1>

            <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '48ch', lineHeight: 1.65, marginBottom: 28 }}>
              {isHe
                ? 'ביקורות מומחים, דירוגים מבעלי רכב אמיתיים ותקלות נפוצות — לכל דגם בשוק הישראלי.'
                : 'Expert reviews, real owner ratings and common issues — for every model and make.'}
            </p>

            {/* Search mode tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[
                { key: 'model', label: isHe ? '🔍 חיפוש דגם' : '🔍 Search by model' },
                { key: 'plate', label: isHe ? '🚗 בדוק לפי מספר רכב' : '🚗 Check by plate' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSearchMode(key as 'model' | 'plate')}
                  style={{
                    padding: '6px 14px', borderRadius: 9999, fontSize: '0.82rem', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: searchMode === key ? 'var(--accent)' : 'var(--surface)',
                    color: searchMode === key ? '#fff' : 'var(--text-muted)',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 34 }}>
              {searchMode === 'model' ? <HeroSearch /> : <PlateSearch isHe={isHe} />}
            </div>

            {/* Stats row */}
            <div className="ci-hero-stats">
              {[
                { n: `${allMakes.length}+`,   l: isHe ? 'יצרנים' : 'Makes' },
                { n: `${totalModels}+`,        l: isHe ? 'דגמים' : 'Models' },
                { n: '2,400+',                  l: isHe ? 'ביקורות' : 'Reviews' },
              ].map((s, i) => (
                <div key={i} className="s">
                  <b>{s.n}</b>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>
        </section>

        {/* Category chips — separate section below hero */}
        <section style={{ margin: '24px 0' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                <h2>{isHe ? 'הדגמים המדורגים ביותר' : 'Top Rated Models'}</h2>
                <p>{isHe ? 'לפי ציון המומחים שלנו' : 'By our expert score'}</p>
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

'use client';

import Link from 'next/link';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';
import HeroSearch from '@/components/HeroSearch';
import { useLocale } from '@/lib/localeContext';

interface Make { slug: string; nameHe: string; nameEn: string; logoUrl: string; country: string; models: { slug: string; nameHe: string; nameEn: string }[]; }
interface TopCar { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; }
interface Review { id: string; make_slug: string; model_slug: string; year: number | null; rating: number; title: string; body: string; title_en?: string | null; body_en?: string | null; author: string; created_at: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; }
interface Props { popularMakes: Make[]; allMakes: Make[]; topRanked: TopCar[]; recentReviews: Review[]; }

export default function HomeClient({ popularMakes, allMakes, topRanked, recentReviews }: Props) {
  const { locale, t } = useLocale();
  const makeName = (m: Make) => locale === 'en' ? m.nameEn : m.nameHe;
  const carName  = (c: TopCar) => locale === 'en' ? `${c.makeEn} ${c.modelEn}` : `${c.makeHe} ${c.modelHe}`;
  const totalModels = allMakes.reduce((s, m) => s + m.models.length, 0);

  /* duplicate makes for seamless marquee loop */
  const marqueeItems = [...allMakes, ...allMakes];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── MARQUEE TAPE ─────────────────────────────────────── */}
      <div dir="ltr" style={{ overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '11px 0', background: 'rgba(220,26,44,0.03)' }}>
        <div className="marquee-track" aria-hidden>
          {marqueeItems.map((make, i) => (
            <span key={i} style={{ paddingInline: 28, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 28 }}>
              {make.nameEn}
              <span style={{ color: 'var(--brand-red)', opacity: 0.5, fontSize: 6 }}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── EDITORIAL HERO ───────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(48px,7vh,88px) 0 clamp(40px,5vh,72px)' }}>
        {/* Ghost editorial number behind stats */}
        <div aria-hidden style={{ position: 'absolute', insetInlineEnd: '-1vw', top: '50%', transform: 'translateY(-50%)', fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(8rem,14vw,14rem)', fontWeight: 400, color: 'rgba(220,26,44,0.04)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.02em' }}>
          {allMakes.length}+
        </div>

        <div className="container" style={{ position: 'relative' }}>
          <div className="home-hero-grid">

            {/* LEFT / START: Editorial headline */}
            <div className="hero-col-headline">
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--brand-red)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 20, height: 2, background: 'var(--brand-red)' }} />
                CARISSUES.CO.IL
              </p>
              <h1 style={{
                fontFamily: "'Bebas Neue', var(--font-display)",
                fontSize: 'clamp(2.5rem, 5.5vw, 5.25rem)',
                fontWeight: 400,
                lineHeight: 1.0,
                letterSpacing: '0.02em',
                color: '#fff',
                marginBottom: 20,
              }}>
                <span style={{ display: 'block' }}>{t.hero.headline1}</span>
                <span style={{ display: 'block', color: 'var(--brand-red)' }}>{t.hero.headline2}</span>
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.38)', maxWidth: 380, lineHeight: 1.7, marginBottom: 32 }}>
                {t.hero.sub}
              </p>
              {/* Quick make pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {popularMakes.slice(0, 9).map(m => (
                  <Link key={m.slug} href={`/cars/${m.slug}`} className="quick-tag" style={{ fontSize: '0.72rem', fontWeight: 700, padding: '5px 11px', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', transition: 'all 0.18s' }}>
                    {makeName(m)}
                  </Link>
                ))}
                <Link href="/cars" className="quick-tag quick-tag-red" style={{ fontSize: '0.72rem', fontWeight: 700, padding: '5px 11px', border: '1px solid rgba(220,26,44,0.3)', color: 'var(--brand-red)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'transparent', transition: 'all 0.18s' }}>
                  {locale === 'he' ? 'הכל ›' : 'All ›'}
                </Link>
              </div>
            </div>

            {/* RIGHT / END: Stats + Search */}
            <div className="hero-col-stats">
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 16 }}>
                {[
                  { n: `${allMakes.length}+`, l: t.hero.makes },
                  { n: `${totalModels}+`,      l: t.hero.models },
                ].map((s, i) => (
                  <div key={i} style={{ background: i === 0 ? 'rgba(220,26,44,0.08)' : 'var(--bg-card)', border: `1px solid ${i === 0 ? 'rgba(220,26,44,0.2)' : 'rgba(255,255,255,0.06)'}`, padding: '18px 20px' }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem,4vw,2.75rem)', fontWeight: 400, color: i === 0 ? 'var(--brand-red)' : '#fff', lineHeight: 1, letterSpacing: '0.01em' }}>{s.n}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div style={{ marginBottom: 14 }}>
                <HeroSearch />
              </div>

              {/* Top ranked mini list */}
              {topRanked.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--brand-red)' }}>TOP RANKED</span>
                    <Link href="/rankings" style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{locale === 'he' ? 'עוד' : 'More'} ›</Link>
                  </div>
                  {topRanked.slice(0, 3).map((car, i) => (
                    <Link key={`${car.makeSlug}/${car.modelSlug}`} href={`/cars/${car.makeSlug}/${car.modelSlug}`} className="ranked-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', fontWeight: 400, color: i === 0 ? 'var(--brand-red)' : 'rgba(255,255,255,0.2)', width: 20, flexShrink: 0, letterSpacing: '0.02em' }}>{i + 1}</span>
                      <MakeLogo logoUrl={car.logoUrl} nameEn={car.makeEn} size={20} />
                      <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{carName(car)}</span>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', color: 'var(--brand-red)', letterSpacing: '0.02em', flexShrink: 0 }}>{car.combined.toFixed(1)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── RED DIVIDER ──────────────────────────────────────── */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, var(--brand-red) 0%, rgba(220,26,44,0.3) 50%, transparent 100%)', marginBottom: 0 }} />

      {/* ── POPULAR MAKES ────────────────────────────────────── */}
      <section style={{ padding: 'clamp(36px,5vw,60px) 0 clamp(40px,5vw,64px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div className="ed-head">
            <h2 className="ed-head-title">{t.home.popularMakes}</h2>
            <div className="ed-rule" />
            <Link href="/cars" className="ed-link">{locale === 'he' ? 'כל היצרנים' : 'All makes'} ›</Link>
          </div>

          <div className="makes-tile-grid">
            {popularMakes.map((make, i) => (
              <Link key={make.slug} href={`/cars/${make.slug}`} className="make-tile">
                <span className="make-tile-num">{String(i + 1).padStart(2, '0')}</span>
                <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={38} />
                <div className="make-tile-name">{makeName(make)}</div>
                <div className="make-tile-en">{make.nameEn}</div>
                <div className="make-tile-count">{make.models.length} {t.home.models}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT REVIEWS strip ─────────────────────────────── */}
      {recentReviews.length > 0 && (
        <section style={{ padding: 'clamp(32px,4vw,52px) 0', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <div className="container">
            <div className="ed-head" style={{ marginBottom: 20 }}>
              <h2 className="ed-head-title" style={{ fontSize: 'clamp(1.75rem,3vw,2.75rem)' }}>{locale === 'he' ? 'ביקורות אחרונות' : 'Recent Reviews'}</h2>
              <div className="ed-rule" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
              {recentReviews.slice(0, 4).map((r) => {
                const showEn = locale === 'en' && Boolean(r.body_en);
                const carName = locale === 'en' ? `${r.makeEn} ${r.modelEn}` : `${r.makeHe} ${r.modelHe}`;
                const snippet = showEn ? (r.title_en || r.body_en || r.title || r.body) : (r.title || r.body);
                return (
                  <Link key={r.make_slug + r.created_at} href={`/cars/${r.make_slug}/${r.model_slug}${r.id ? `#review-${r.id}` : ''}`}
                    className="review-tile"
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 18px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', color: 'inherit', transition: 'background 0.18s, border-color 0.18s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MakeLogo logoUrl={r.logoUrl} nameEn={r.makeEn || r.makeHe} size={22} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{carName}{r.year ? ` ${r.year}` : ''}</span>
                      {showEn && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', color: '#818cf8', borderRadius: 3 }}>Translated</span>}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', direction: showEn ? 'ltr' : 'rtl' }}>
                      {snippet}
                    </p>
                    <StarRating rating={r.rating} size={10} />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(40px,6vw,72px) 0 clamp(56px,8vw,96px)' }}>
        <div className="container">
          <div className="ed-head">
            <h2 className="ed-head-title">{t.home.howTitle}</h2>
            <div className="ed-rule" />
          </div>
          <div className="how-grid">
            {t.home.steps.map((step, i) => (
              <div key={i} className="how-card">
                <span className="how-card-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="how-card-icon">{step.icon}</div>
                <div className="how-card-title">{step.title}</div>
                <p className="how-card-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        /* Hero grid */
        .home-hero-grid {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: clamp(24px, 5vw, 72px);
          align-items: start;
        }
        @media (max-width: 900px) {
          .home-hero-grid { grid-template-columns: 1fr; }
          .hero-col-stats { order: -1; }
        }

        /* Makes tile grid — tight, no gaps */
        .makes-tile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 2px;
        }
        @media (max-width: 480px) {
          .makes-tile-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Quick tag pills */
        .quick-tag:hover { border-color: rgba(220,26,44,0.4) !important; color: var(--brand-red) !important; }
        .quick-tag-red:hover { background: rgba(220,26,44,0.08) !important; }

        /* Row hover states */
        .ranked-row:hover { background: rgba(220,26,44,0.05) !important; }
        .review-tile:hover { background: rgba(220,26,44,0.04) !important; border-color: rgba(220,26,44,0.15) !important; }
      `}</style>
    </div>
  );
}

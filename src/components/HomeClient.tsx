'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale } from '@/lib/localeContext';
import { searchCars } from '@/lib/carSearch';
import { newsPath } from '@/lib/newsSlug';
import NewsImage from '@/components/NewsImage';
import { sizedImageUrl } from '@/lib/imageSizing';

/* ── Types ──────────────────────────────────────────────── */
interface Make { slug: string; nameHe: string; nameEn: string; logoUrl: string; country: string; models: { slug: string; nameHe: string; nameEn: string }[]; }
interface TopCar { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; aiScore: number; aiConfidence: 'high' | 'medium' | 'low'; avgRating: number | null; reviewCount: number; imageUrl?: string | null; }
interface Review { id: string; make_slug: string; model_slug: string; year: number | null; rating: number; title: string; body: string; title_en?: string | null; body_en?: string | null; author: string; created_at: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; }
interface ComparePair { href: string; aHe: string; aEn: string; bHe: string; bEn: string; }
interface TickerItem { code: string; isRecall: boolean; textHe: string; textEn: string; color: string; }
interface NewsItem { id: string; title_he: string | null; title_en: string | null; body_he: string | null; body_en: string | null; image_url: string | null; image_author?: string | null; image_license?: string | null; image_source_url?: string | null; published_at: string | null; original_url: string; source: string; }

function isLicensedNewsImage(url: string | null): url is string {
  return !!url && !url.includes('motor1.com') && !url.includes('hearstapps.com');
}
interface Props { allMakes: Make[]; topRanked: TopCar[]; recentReviews: Review[]; tickerItems?: TickerItem[]; initialNews?: NewsItem[]; topPairs?: ComparePair[]; reviewTotal: number; recallTotal: number; }

/* ── Helpers ─────────────────────────────────────────────── */
function timeAgo(dateStr: string, isHe: boolean) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return isHe ? 'לפני פחות משעה' : 'less than an hour ago';
  if (h < 24) return isHe ? `לפני ${h} שעות` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return isHe ? 'אתמול' : 'yesterday';
  if (d < 7) return isHe ? `לפני ${d} ימים` : `${d}d ago`;
  if (d < 30) return isHe ? `לפני ${Math.floor(d/7)} שבועות` : `${Math.floor(d/7)}w ago`;
  return isHe ? `לפני ${Math.floor(d/30)} חודשים` : `${Math.floor(d/30)}mo ago`;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Scroll reveal hook ─────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    // Only hide once we know animation timeline is advancing
    const t0 = document.timeline?.currentTime;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const t1 = document.timeline?.currentTime;
      const alive = typeof t0 === 'number' && typeof t1 === 'number' && t1 > t0;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!alive || reduced) return;

      const singles = Array.from(document.querySelectorAll('[data-ci-reveal]')) as HTMLElement[];
      const groups  = Array.from(document.querySelectorAll('[data-ci-group]')) as HTMLElement[];

      singles.forEach(el => el.classList.add('ci-reveal-hidden'));
      groups.forEach(el => Array.from(el.children).forEach(c => (c as HTMLElement).classList.add('ci-reveal-hidden')));

      const show = (el: HTMLElement) => { el.classList.remove('ci-reveal-hidden'); el.classList.add('ci-reveal-shown'); };

      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          if (el.hasAttribute('data-ci-group')) {
            const step = parseInt(el.getAttribute('data-ci-group') || '80');
            Array.from(el.children).forEach((kid, i) => setTimeout(() => show(kid as HTMLElement), i * step));
          } else show(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

      [...singles, ...groups].forEach(el => io.observe(el));

      // Failsafe
      const t = setTimeout(() => {
        [...singles, ...groups].forEach(el => {
          el.classList.remove('ci-reveal-hidden');
          Array.from(el.children).forEach(c => (c as HTMLElement).classList.remove('ci-reveal-hidden'));
        });
      }, 3000);
      return () => { io.disconnect(); clearTimeout(t); };
    }));
  }, []);
}

/* ── Count-up hook ──────────────────────────────────────── */
function useCountUp(ref: React.RefObject<HTMLElement | null>, to: number, decimals = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) => decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
    const visible = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.92 && r.bottom > 0;
    };
    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 1100);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (visible()) { run(); return; }
    const onScroll = () => { if (visible()) { window.removeEventListener('scroll', onScroll, true); run(); } };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [ref, to, decimals]);
}

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */
export default function HomeClient({ allMakes, topRanked, recentReviews, tickerItems: tickerProp, initialNews, topPairs = [], reviewTotal, recallTotal }: Props) {
  const { locale } = useLocale();
  const isHe = locale === 'he';
  const totalModels = allMakes.reduce((s, m) => s + m.models.length, 0);

  const tickerItems = tickerProp ?? [];

  /* Search + autocomplete */
  const router = useRouter();
  const [searchQ, setSearchQ] = useState('');
  const [acOpen, setAcOpen] = useState(false);
  const [acIdx, setAcIdx] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Bilingual autocomplete: Hebrew, English, mixed, typos and wrong keyboard layout all match
  const suggestions = useMemo(() => {
    const q = searchQ.trim();
    if (!q || /^[\d\-\s]+$/.test(q)) return []; // plate numbers aren't car names
    return searchCars(allMakes, q, 8).map(({ make, model }) => model
      ? {
          label: isHe ? `${make.nameHe} ${model.nameHe}` : `${make.nameEn} ${model.nameEn}`,
          sub:   isHe ? `${make.nameEn} ${model.nameEn}` : `${make.nameHe} ${model.nameHe}`,
          href:  `/cars/${make.slug}/${model.slug}`,
        }
      : {
          label: isHe ? make.nameHe : make.nameEn,
          sub:   isHe ? make.nameEn : make.nameHe,
          href:  `/cars/${make.slug}`,
        });
  }, [searchQ, allMakes, isHe]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setAcOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(href?: string) {
    // Start the top progress bar right away - router.push doesn't trigger it on its own
    if (href || searchQ.trim()) window.dispatchEvent(new Event('carissues:nav-start'));
    if (href) { router.push(href); setAcOpen(false); return; }
    const q = searchQ.trim();
    if (!q) return;
    const digits = (q.match(/\d/g) || []).length;
    if (isHe && digits >= 5 && /^[\d\-\s]+$/.test(q)) {
      router.push(`/vehicle-lookup/${q.replace(/\D/g, '')}`);
    } else if (suggestions.length > 0) {
      // Enter / "Search" with a car name goes straight to the best match
      router.push(suggestions[0].href);
    } else {
      router.push(`/cars?q=${encodeURIComponent(q)}`);
    }
    setAcOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!acOpen || suggestions.length === 0) { if (e.key === 'Enter') handleSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setAcIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAcIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (acIdx >= 0) handleSearch(suggestions[acIdx].href); else handleSearch(); }
    else if (e.key === 'Escape') { setAcOpen(false); setAcIdx(-1); }
  }

  const searchBadge = (() => {
    const q = searchQ.trim();
    if (!q) return isHe ? 'זיהוי אוטומטי' : 'Auto-detect';
    const digits = (q.match(/\d/g) || []).length;
    if (digits >= 5 && /^[\d\-\s]+$/.test(q)) return isHe ? 'זוהה מספר רכב' : 'Plate detected';
    if (digits >= 4) return isHe ? 'זוהה דגם ושנה' : 'Model & year detected';
    return isHe ? 'זוהה יצרן או דגם' : 'Make or model detected';
  })();

  /* Refs for count-up */
  const refMakes   = useRef<HTMLSpanElement>(null);
  const refModels  = useRef<HTMLSpanElement>(null);
  const refReviews = useRef<HTMLSpanElement>(null);

  useReveal();
  useCountUp(refMakes,   allMakes.length,     0);
  useCountUp(refModels,  totalModels,          0);
  useCountUp(refReviews, reviewTotal,          0);

  /* News feed - server-provided, no client fetch needed */
  const news = initialNews ?? [];

  const GUTTER = 'clamp(16px,3vw,32px)';
  const MAXW   = '1280px';

  return (
    <div style={{ background: '#f2f5fa', color: '#0d1b2f', minHeight: '100vh', overflowX: 'clip', direction: isHe ? 'rtl' : 'ltr' }}>

      {/* ── Ticker ───────────────────────────────────────── */}
      {tickerItems.length > 0 && <div style={{ background: '#0d1b2f', color: '#dbe4f2', overflow: 'hidden', height: 38, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'ci-ticker 42s linear infinite' }}>
            <div style={{ display: 'flex', gap: 34, flex: 'none', width: 'max-content', alignItems: 'center', padding: '0 17px', whiteSpace: 'nowrap', fontSize: 13 }}>
              {tickerItems.map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.isRecall && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5b5b', flexShrink: 0, animation: 'ci-pulse 1.6s ease-in-out infinite' }} />
                  )}
                  <span style={{ color: item.color, fontWeight: 700 }}>
                    {item.code}
                  </span>
                  {' '}{isHe ? item.textHe : item.textEn}
                </span>
              ))}
            </div>
        </div>
      </div>}

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(180deg,#0d1b2f 0%,#12294a 62%,#12294a 100%)',
        color: '#fff',
        padding: `clamp(18px,2vw,26px) ${GUTTER} clamp(32px,3.4vw,44px)`,
        overflowX: 'clip',
      }}>
        {/* radial overlays */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .5, background: 'radial-gradient(70% 60% at 88% 8%,rgba(23,64,143,.85),transparent 70%),radial-gradient(50% 50% at 10% 90%,rgba(18,161,80,.28),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: MAXW, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,3.4vw,40px)', alignItems: 'stretch' }}>

          {/* Search column */}
          <div data-ci-group="90" style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: 14, color: '#7a9cc8', letterSpacing: '0.04em', fontWeight: 600 }}>
              {isHe ? 'בעיות · ריקולים · עלויות תיקון' : 'Problems · Recalls · Repair costs'}
            </span>
            <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(26px,3vw,42px)', lineHeight: 1.1, letterSpacing: '-.03em', margin: '10px 0 0', color: '#fff' }}>
              {isHe ? 'איזה רכב אתם בודקים?' : 'Which car are you checking?'}
            </h1>

            {/* Search pill */}
            <div ref={searchWrapRef} style={{ position: 'relative', marginTop: 20 }}>
              <div className="focus-box" style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', borderRadius: 16, padding: 8, boxShadow: '0 24px 60px -24px rgba(4,14,32,.7)' }}>
                <input
                  className="input-in-box"
                  type="text"
                  aria-label={isHe ? 'חיפוש לפי מספר רישוי או שם דגם' : 'Search by car model'}
                  value={searchQ}
                  onChange={e => { setSearchQ(e.target.value); setAcOpen(true); setAcIdx(-1); }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setAcOpen(true)}
                  placeholder={isHe ? 'מספר רישוי או שם דגם' : 'Enter a make or model'}
                  style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', padding: '10px 14px', fontSize: 16, outline: 'none', color: '#0d1b2f', direction: isHe ? 'rtl' : 'ltr' }}
                />
                <button type="button" onClick={() => handleSearch()} style={{ border: 0, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '0 26px', height: 48, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {isHe ? 'חפש' : 'Search'}
                </button>
              </div>
              {acOpen && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e0e6f1', borderRadius: 12, boxShadow: '0 12px 40px -8px rgba(13,27,47,.18)', zIndex: 999, overflow: 'hidden', direction: isHe ? 'rtl' : 'ltr' }}>
                  {suggestions.map((s, i) => (
                    <div
                      key={s.href}
                      onMouseDown={() => handleSearch(s.href)}
                      onMouseEnter={() => setAcIdx(i)}
                      style={{ padding: '10px 14px', cursor: 'pointer', background: i === acIdx ? '#f0f4ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: i < suggestions.length - 1 ? '1px solid #f2f5fa' : 'none' }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#0d1b2f' }}>{s.label}</span>
                      {s.sub && <span style={{ fontSize: 12, color: '#8a9ab8' }}>{s.sub}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#9fe0b3' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                {searchBadge}
              </span>
              {isHe && (
                <>
                  <span aria-hidden="true" style={{ color: '#3b4a6b' }}>·</span>
                  <span style={{ fontSize: 12, color: '#aab6cf' }}>מספר רישוי = בדיקת פרטי רכב מלאה</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              {(isHe
                ? [['סובארו XV', '/cars/subaru/xv'], ['טויוטה RAV4', '/cars/toyota/rav4'], ['יונדאי טוסון', '/cars/hyundai/tucson'], ['קיה ספורטז׳', '/cars/kia/sportage']]
                : [['Subaru XV', '/cars/subaru/xv'], ['Toyota RAV4', '/cars/toyota/rav4'], ['Hyundai Tucson', '/cars/hyundai/tucson'], ['Kia Sportage', '/cars/kia/sportage']]
              ).map(([label, href]) => (
                <Link key={href} href={href} style={{ fontSize: 13, fontWeight: 600, color: '#dfe6f3', textDecoration: 'none', padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)' }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* נבדקים השבוע aside */}
          {topRanked.length > 0 && (
            <aside aria-label={isHe ? 'דגמים במגמה' : 'Trending models'} style={{ flex: '1 1 380px', minWidth: 0, background: '#1b2b4d', border: '1px solid #2a3c63', borderRadius: 'var(--r)', padding: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isHe ? 'נבדקים השבוע' : 'Checked this week'}</h2>
                <Link href="/rankings" style={{ fontSize: 14, color: '#8fb3ff', textDecoration: 'none' }}>
                  {isHe ? 'לכל הדירוגים ←' : 'All rankings →'}
                </Link>
              </div>
              {topRanked.slice(0, 3).map((car, i) => {
                const good = car.aiScore >= 7.5;
                return (
                  <Link key={`${car.makeSlug}/${car.modelSlug}`} href={`/cars/${car.makeSlug}/${car.modelSlug}`} className="ci-trend-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, textDecoration: 'none', color: '#fff' }}>
                    <span style={{ width: 28, fontSize: 15, fontWeight: 700, color: '#8fb3ff', textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{isHe ? `${car.makeHe} ${car.modelHe}` : `${car.makeEn} ${car.modelEn}`}</span>
                      <span style={{ height: 6, background: '#2a3c63', borderRadius: 3, overflow: 'hidden', display: 'block' }}>
                        <span style={{ display: 'block', height: 6, width: `${Math.min(100, car.aiScore * 10)}%`, background: good ? 'var(--good)' : 'var(--warn)', borderRadius: 3 }} />
                      </span>
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>{car.aiScore.toFixed(1)}</span>
                  </Link>
                );
              })}
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#aab6cf' }}>
                {isHe ? 'ציון AI מתוך 10, לפי בעיות מדווחות וריקולים' : 'AI score out of 10, based on reported issues and recalls'}
              </p>
            </aside>
          )}
        </div>

        {/* Stats row - inside the dark band, no overlap */}
        <div data-ci-group="70" style={{ maxWidth: MAXW, margin: 'clamp(32px,3.4vw,48px) auto 0', borderTop: '1px solid rgba(255,255,255,.12)', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          {[
            { ref: refMakes,   value: allMakes.length, label: isHe ? 'יצרנים' : 'Makes' },
            { ref: refModels,  value: totalModels,     label: isHe ? 'דגמים' : 'Models' },
            { ref: null,       value: recallTotal,      label: isHe ? 'ריקולים' : 'Recalls' },
          ].map((s, i, arr) => (
            <div key={i} style={{ padding: '20px 12px', textAlign: 'center', borderInlineEnd: i < arr.length - 1 ? '1px solid rgba(255,255,255,.12)' : 'none' }}>
              <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(22px,3vw,30px)', letterSpacing: '-.04em' }}>
                <span ref={s.ref as React.RefObject<HTMLSpanElement>}>{Number(s.value ?? 0).toLocaleString(isHe ? 'he-IL' : 'en-US')}</span>
              </div>
              <div style={{ fontSize: 13, color: '#aab6cf', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sections wrapper ─────────────────────────────── */}
      <div style={{ maxWidth: MAXW, margin: '0 auto' }}>

        {/* ── News ─────────────────────────────────────── */}
        {news.length > 0 && (
          <section id="news" style={{ padding: `clamp(34px,3.6vw,52px) ${GUTTER} 0` }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
              <div data-ci-reveal>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#17408f', background: '#eaf0fb', border: '1px solid #d3e0f6', padding: '5px 12px', borderRadius: 999 }}>
                  {isHe ? 'חדשות רכב' : 'Car News'}
                </div>
                <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(24px,2.6vw,34px)', letterSpacing: '-.035em', margin: '14px 0 0' }}>
                  {isHe ? 'מה חדש בשוק' : "What's new"}
                </h2>
              </div>
              <Link href="/news" style={{ fontWeight: 700, fontSize: 15, color: '#17408f', whiteSpace: 'nowrap' }}>
                {isHe ? 'לכל החדשות ←' : 'All news →'}
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
              {/* Lead story */}
              {news[0] && (
                <div>
                <Link href={newsPath(news[0])} style={{ textDecoration: 'none', color: 'inherit' }} data-ci-reveal>
                  <article style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 18, overflow: 'hidden' }} className="ci-card-hover">
                    <NewsImage src={sizedImageUrl(news[0].image_url, 960)} isHe={isHe} style={{ width: '100%', aspectRatio: '16/9' }} />
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5, color: '#5b6a86', fontWeight: 600 }}>
                        <span>{news[0].published_at ? timeAgo(news[0].published_at, isHe) : ''}</span>
                      </div>
                      <h3 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(18px,2vw,24px)', lineHeight: 1.25, letterSpacing: '-.03em', margin: '10px 0 10px', direction: isHe ? 'rtl' : 'ltr' }}>
                        {isHe ? (news[0].title_he ?? news[0].title_en) : (news[0].title_en ?? news[0].title_he)}
                      </h3>
                      <p style={{ color: '#5b6a86', fontSize: 15, lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', direction: isHe ? 'rtl' : 'ltr' }}>
                        {isHe ? (news[0].body_he ?? news[0].body_en) : (news[0].body_en ?? news[0].body_he)}
                      </p>
                    </div>
                  </article>
                </Link>
                {isLicensedNewsImage(news[0].image_url) && (news[0].image_author || news[0].image_license) && (
                  news[0].image_source_url ? (
                    <a href={news[0].image_source_url} target="_blank" rel="noopener nofollow" style={{ fontSize: 11, color: '#8a9ab8', textDecoration: 'none', display: 'block', padding: '4px 2px 0' }}>
                      {[news[0].image_author, news[0].image_license].filter(Boolean).join(' · ')}
                    </a>
                  ) : (
                    <span style={{ fontSize: 11, color: '#8a9ab8', display: 'block', padding: '4px 2px 0' }}>
                      {[news[0].image_author, news[0].image_license].filter(Boolean).join(' · ')}
                    </span>
                  )
                )}
                </div>
              )}
              {/* Headline list */}
              <div data-ci-group="80" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                {news.slice(1, 4).map(item => (
                  <Link key={item.id} href={newsPath(item)} style={{ display: 'flex', gap: 14, background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: 14, alignItems: 'center', textDecoration: 'none', color: 'inherit' }} className="ci-news-row">
                    <NewsImage src={sizedImageUrl(item.image_url, 160)} isHe={isHe} loading="lazy" style={{ width: 96, height: 70, flexShrink: 0, borderRadius: 11, padding: '0 8px' }} />
                    <span>
                      <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 16, lineHeight: 1.3, color: '#0d1b2f', direction: isHe ? 'rtl' : 'ltr', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                        {isHe ? (item.title_he ?? item.title_en) : (item.title_en ?? item.title_he)}
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: '#5b6a86', marginTop: 6 }}>
                        {item.published_at ? timeAgo(item.published_at, isHe) : ''}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Models ───────────────────────────────────── */}
        {topRanked.length > 0 && (
          <section id="models" style={{ padding: `clamp(34px,3.6vw,52px) ${GUTTER} 0` }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
              <div data-ci-reveal>
                <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(24px,2.6vw,34px)', letterSpacing: '-.035em', margin: '0 0 6px' }}>
                  {isHe ? 'גלו דגמים' : 'Explore Models'}
                </h2>
                <p style={{ color: '#5b6a86', fontSize: 16, margin: 0 }}>{isHe ? 'הדגמים הפופולריים באתר השבוע' : 'Popular models on the site this week'}</p>
              </div>
              <Link href="/rankings" style={{ fontWeight: 700, fontSize: 15, color: '#17408f', whiteSpace: 'nowrap' }}>{isHe ? 'לכל הדירוגים ←' : 'All rankings →'}</Link>
            </div>
            <div data-ci-group="80" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(195px,1fr))', gap: 18 }}>
              {topRanked.slice(0, 4).map(car => {
                const score = car.aiScore.toFixed(1);
                const name  = isHe ? `${car.makeHe} ${car.modelHe}` : `${car.makeEn} ${car.modelEn}`;
                return (
                  <Link key={`${car.makeSlug}/${car.modelSlug}`} href={`/cars/${car.makeSlug}/${car.modelSlug}`} style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, overflow: 'hidden', textDecoration: 'none' }} className="ci-model-card">
                    <span style={{ position: 'relative', display: 'block', aspectRatio: '16/10', background: car.imageUrl ? '#f7f9fd' : 'linear-gradient(140deg,#e8edf6,#d5deee)' }}>
                      {car.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={sizedImageUrl(car.imageUrl, 400) ?? undefined} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                      )}
                      <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, background: '#17408f', color: '#fff', fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 15, padding: '5px 11px', borderRadius: 9 }}>{score}</span>
                    </span>
                    <span style={{ display: 'block', padding: '13px 16px 16px' }}>
                      <span style={{ display: 'block', fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 18, color: '#0d1b2f' }}>{name}</span>
                      {car.reviewCount > 0 && (
                        <span style={{ display: 'block', fontSize: 13.5, color: '#5b6a86', marginTop: 4 }}>
                          {isHe ? `${car.reviewCount} ${car.reviewCount === 1 ? 'ביקורת בעלים' : 'ביקורות בעלים'}` : `${car.reviewCount} owner review${car.reviewCount === 1 ? '' : 's'}`}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: '#8b98ab', marginTop: 14 }}>
              {isHe ? 'הציון מבוסס על המוניטין של הדגם: אמינות, בעיות נפוצות, ריקולים וחוות דעת בעלים' : "The score reflects the model's reputation: reliability, common issues, recalls and owner reviews"}
            </p>
          </section>
        )}

        {/* ── Recent Reviews ───────────────────────────── */}
        {recentReviews.length > 0 && (
          <section style={{ padding: `clamp(34px,3.6vw,52px) ${GUTTER} 0` }}>
            <div data-ci-reveal style={{ marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(22px,2.4vw,32px)', letterSpacing: '-.035em', margin: '0 0 6px' }}>
                {isHe ? 'ביקורות אחרונות' : 'Recent Reviews'}
              </h2>
              <p style={{ color: '#5b6a86', fontSize: 15, margin: 0 }}>{isHe ? 'מה בעלי רכב כותבים לאחרונה' : 'What owners are saying lately'}</p>
            </div>
            <div data-ci-group="60" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentReviews.slice(0, 5).map(rv => {
                const carName = isHe ? `${rv.makeHe} ${rv.modelHe}` : `${rv.makeEn} ${rv.modelEn}`;
                const title   = isHe ? rv.title : (rv.title_en ?? rv.title);
                const body    = isHe ? rv.body  : (rv.body_en  ?? rv.body);
                const stars   = Math.round(rv.rating);
                return (
                  <Link
                    key={rv.id}
                    href={`/cars/${rv.make_slug}/${rv.model_slug}`}
                    style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: '16px 20px', display: 'flex', gap: 16, textDecoration: 'none', alignItems: 'flex-start' }}
                    className="ci-card-hover"
                  >
                    {/* Logo */}
                    <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: '1px solid #e4e9f2', background: '#f7f9fd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {rv.logoUrl
                        ? <img src={rv.logoUrl} alt={rv.makeEn} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        : <span style={{ fontSize: 18 }}>🚗</span>
                      }
                    </span>
                    {/* Content */}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 14, color: '#0d1b2f' }}>{carName}</span>
                        {rv.year && <span style={{ fontSize: 12, color: '#8595a6' }}>{rv.year}</span>}
                        <span style={{ fontSize: 13, color: '#f59e0b', letterSpacing: 1 }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
                        <span style={{ fontSize: 11.5, color: '#a0adb8', marginInlineStart: 'auto' }}>{timeAgo(rv.created_at, isHe)}</span>
                      </span>
                      {title && <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#1c2733', marginBottom: 3 }}>{title}</span>}
                      <span style={{ display: 'block', fontSize: 13, color: '#5b6a86', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {body.length > 160 ? body.slice(0, 160) + '…' : body}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Head to Head ─────────────────────────────── */}
        <section id="head" style={{ padding: `clamp(34px,3.6vw,52px) ${GUTTER} 0` }}>
          <div data-ci-reveal style={{ marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(24px,2.6vw,34px)', letterSpacing: '-.035em', margin: '0 0 6px' }}>
              {isHe ? 'ראש בראש' : 'Head to Head'}
            </h2>
            <p style={{ color: '#5b6a86', fontSize: 16, margin: 0 }}>{isHe ? 'ההשוואות שנבדקות הכי הרבה' : 'The comparisons people run most'}</p>
          </div>
          <div data-ci-group="70" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {topPairs.map((vs, i) => {
              return (
                <Link key={i} href={vs.href} style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: 20, display: 'block', textDecoration: 'none' }} className="ci-vs-card">
                  <span style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 8, fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 16.5, color: '#0d1b2f' }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.25 }} title={isHe ? vs.aHe : vs.aEn}>{isHe ? vs.aHe : vs.aEn}</span>
                    <span style={{ fontSize: 11, letterSpacing: '.14em', color: '#5f6e88', paddingTop: 3 }}>VS</span>
                    <span style={{ minWidth: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.25, textAlign: 'end' }} title={isHe ? vs.bHe : vs.bEn}>{isHe ? vs.bHe : vs.bEn}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#5b6a86', marginTop: 12 }}>
                    {isHe ? 'להשוואת דגמים' : 'Compare these models'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>{/* /maxw wrapper */}

      {/* ── Closing CTA - Israeli plate lookup, Hebrew site only ── */}
      {isHe && (
        <section style={{ background: '#0d1b2f', color: '#fff', padding: 'clamp(40px,4.5vw,64px) clamp(16px,3vw,32px)', marginTop: 'clamp(34px,3.6vw,52px)' }}>
          <div data-ci-group="90" style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(24px,2.8vw,38px)', lineHeight: 1.12, letterSpacing: '-.04em', margin: 0, color: '#fff' }}>
              בדיקת פרטי רכב לפי מספר רישוי
            </h2>
            <p style={{ color: '#b8c8e4', fontSize: 'clamp(15px,1.2vw,17px)', margin: '12px 0 20px' }}>
              בעלות, ריקולים פתוחים, נסועה, בטיחות וצבע מקורי - הכל במקום אחד.
            </p>
            <Link href="/vehicle-lookup" style={{ display: 'inline-block', background: '#fff', color: '#0d1b2f', fontWeight: 800, fontSize: 16, padding: '13px 30px', borderRadius: 13 }}>
              בדיקת רכב ←
            </Link>
          </div>
        </section>
      )}

      <style>{`
        .ci-card-hover { transition: transform .3s cubic-bezier(.23,1,.32,1), box-shadow .3s; }
        .ci-card-hover:hover { transform: translateY(-6px); box-shadow: 0 24px 44px -26px rgba(13,27,47,.45); }
.ci-model-card { transition: transform .3s cubic-bezier(.23,1,.32,1); }
        .ci-model-card:hover { transform: translateY(-6px); }
        .ci-vs-card:hover { border-color: #17408f !important; }
        .ci-news-row { transition: transform .25s cubic-bezier(.23,1,.32,1), border-color .2s; }
        .ci-news-row:hover { transform: translateX(-6px); border-color: #c9d6ee !important; }
        .ci-trend-row { transition: background .15s; }
        .ci-trend-row:hover { background: rgba(255,255,255,.05); }
        @media (max-width: 680px) {
          .ci-news-row:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}

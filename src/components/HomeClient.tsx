'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';
import HeroSearch from '@/components/HeroSearch';
import PlateSearch from '@/components/PlateSearch';
import { useLocale } from '@/lib/localeContext';

/* ── Types ──────────────────────────────────────────────── */
interface Make { slug: string; nameHe: string; nameEn: string; logoUrl: string; country: string; models: { slug: string; nameHe: string; nameEn: string }[]; }
interface TopCar { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; avgRating: number | null; imageUrl?: string | null; }
interface Review { id: string; make_slug: string; model_slug: string; year: number | null; rating: number; title: string; body: string; title_en?: string | null; body_en?: string | null; author: string; created_at: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; }
interface TickerItem { code: string; textHe: string; textEn: string; color: string; }
interface NewsItem { id: string; title_he: string | null; title_en: string | null; body_he: string | null; body_en: string | null; image_url: string | null; published_at: string | null; original_url: string; source: string; }
interface Props { popularMakes: Make[]; allMakes: Make[]; topRanked: TopCar[]; recentReviews: Review[]; tickerItems?: TickerItem[]; initialNews?: NewsItem[]; }

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
    let t0 = document.timeline?.currentTime;
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

/* ── Pointer tilt hook ──────────────────────────────────── */
function useTilt(ref: React.RefObject<HTMLElement | null>, max = 6) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(hover: none)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .08s linear';
      el.style.transform = `perspective(900px) rotateY(${(x * max).toFixed(2)}deg) rotateX(${(-y * max).toFixed(2)}deg)`;
    };
    const leave = () => {
      el.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
      el.style.transform = 'perspective(900px) rotateY(0) rotateX(0)';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [ref, max]);
}

/* ── Ticker fallback ────────────────────────────────────── */
const TICKER_FALLBACK: TickerItem[] = [
  { code: 'ריקול', textHe: 'מאזדה 3 · בעיית מתלה דווחה', textEn: 'Mazda 3 · suspension issue reported', color: '#ff8a8a' },
  { code: 'ביקורת', textHe: 'יונדאי טוסון 2020 · 5/5', textEn: 'Hyundai Tucson 2020 · 5/5', color: '#7ba0e8' },
  { code: 'ביקורת', textHe: 'קיה סלטוס 2025 · 5/5', textEn: 'Kia Seltos 2025 · 5/5', color: '#7ba0e8' },
  { code: 'מבצע', textHe: 'טויוטה קורולה 2021 · ‎-9%', textEn: 'Toyota Corolla 2021 · -9%', color: '#ffd166' },
  { code: 'ריקול', textHe: 'ג׳יפ גרנד צ׳רוקי · מערכת בלמים', textEn: 'Jeep Grand Cherokee · brakes', color: '#ff8a8a' },
  { code: 'ביקורת', textHe: 'שברולט ספארק 2017 · 5/5', textEn: 'Chevrolet Spark 2017 · 5/5', color: '#7ba0e8' },
];


/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */
export default function HomeClient({ allMakes, topRanked, recentReviews, tickerItems: tickerProp, initialNews }: Props) {
  const { locale, t } = useLocale();
  const isHe = locale === 'he';
  const totalModels = allMakes.reduce((s, m) => s + m.models.length, 0);

  const tickerItems = tickerProp && tickerProp.length > 0 ? tickerProp : TICKER_FALLBACK;
  const topCar = topRanked[0] ?? null;

  /* Search + autocomplete */
  const router = useRouter();
  const [searchQ, setSearchQ] = useState('');
  const [acOpen, setAcOpen] = useState(false);
  const [acIdx, setAcIdx] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Flat list of makes + models for autocomplete
  const allSuggestions = useMemo(() => {
    const items: { label: string; sub: string; href: string }[] = [];
    for (const make of allMakes) {
      items.push({ label: isHe ? make.nameHe : make.nameEn, sub: isHe ? make.nameEn : make.nameHe, href: `/cars/${make.slug}` });
      for (const model of make.models) {
        items.push({ label: isHe ? `${make.nameHe} ${model.nameHe}` : `${make.nameEn} ${model.nameEn}`, sub: '', href: `/cars/${make.slug}/${model.slug}` });
      }
    }
    return items;
  }, [allMakes, isHe]);

  const suggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return allSuggestions.filter(s =>
      s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQ, allSuggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setAcOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(href?: string) {
    if (href) { router.push(href); setAcOpen(false); return; }
    const q = searchQ.trim();
    if (!q) return;
    const digits = (q.match(/\d/g) || []).length;
    if (digits >= 5 && /^[\d\-\s]+$/.test(q)) {
      router.push(`/vehicle-lookup/${q.replace(/\D/g, '')}`);
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
  const tiltRef    = useRef<HTMLDivElement>(null);

  useReveal();
  useCountUp(refMakes,   allMakes.length,     0);
  useCountUp(refModels,  totalModels,          0);
  useCountUp(refReviews, 2400,                 0);
  useTilt(tiltRef);

  /* News feed — server-provided, no client fetch needed */
  const news = initialNews ?? [];

  const GUTTER = 'clamp(16px,3vw,32px)';
  const MAXW   = '1280px';

  return (
    <div style={{ background: '#f2f5fa', color: '#0d1b2f', minHeight: '100vh', overflowX: 'clip', direction: isHe ? 'rtl' : 'ltr' }}>

      {/* ── Ticker ───────────────────────────────────────── */}
      <div style={{ background: '#0d1b2f', color: '#dbe4f2', overflow: 'hidden', height: 38, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'ci-ticker 42s linear infinite' }}>
          {[0, 1].map(copy => (
            <div key={copy} aria-hidden={copy === 1 || undefined}
              style={{ display: 'flex', gap: 34, flex: 'none', width: 'max-content', alignItems: 'center', padding: '0 17px', whiteSpace: 'nowrap', fontSize: 13 }}
            >
              {tickerItems.map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.code === 'ריקול' && copy === 0 && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5b5b', flexShrink: 0, animation: 'ci-pulse 1.6s ease-in-out infinite' }} />
                  )}
                  <span style={{ color: item.color, fontWeight: 700 }}>
                    {isHe ? item.code : ({ 'ביקורת': 'REVIEW', 'ריקול': 'RECALL', 'מבצע': 'DEAL', 'תיקון': 'REPAIR' }[item.code] ?? item.code)}
                  </span>
                  {' '}{isHe ? item.textHe : item.textEn}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        background: 'linear-gradient(180deg,#0d1b2f 0%,#12294a 62%,#12294a 100%)',
        color: '#fff',
        padding: `clamp(18px,2vw,26px) ${GUTTER} clamp(40px,4vw,52px)`,
        overflowX: 'clip',
      }}>
        {/* radial overlays */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: .5, background: 'radial-gradient(70% 60% at 88% 8%,rgba(23,64,143,.85),transparent 70%),radial-gradient(50% 50% at 10% 90%,rgba(18,161,80,.28),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: MAXW, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(18px,2.4vw,36px)', alignItems: 'end' }}>

          {/* Left col */}
          <div data-ci-group="90">
            {/* Stat pill */}
            <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(26px,3vw,42px)', lineHeight: 1.1, letterSpacing: '-.03em', margin: '0 0 0', color: '#fff' }}>
              {isHe ? 'איזה רכב אתם בודקים?' : 'Which car are you checking?'}
            </h1>
            <p style={{ fontSize: 14, color: '#7a9cc8', margin: '8px 0 0', letterSpacing: '0.04em', fontWeight: 600 }}>
              {isHe ? 'בעיות · ריקולים · עלויות תיקון' : 'Problems · Recalls · Repair costs'}
            </p>

            {/* Search card */}
            <div style={{ background: '#fff', color: '#0d1b2f', borderRadius: 16, padding: 12, marginTop: 16, boxShadow: '0 24px 60px -24px rgba(4,14,32,.7)' }}>
              <div ref={searchWrapRef} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #e0e6f1', borderRadius: 12, padding: 6, background: '#fbfcfe' }}>
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => { setSearchQ(e.target.value); setAcOpen(true); setAcIdx(-1); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setAcOpen(true)}
                    placeholder={isHe ? 'הכנס מספר רישוי (1234567) או שם דגם' : 'Enter plate (1234567) or car model'}
                    style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', padding: '10px', fontSize: 15, outline: 'none', color: '#0d1b2f', direction: isHe ? 'rtl' : 'ltr' }}
                  />
                  <button type="button" onClick={() => handleSearch()} style={{ border: 0, background: '#17408f', color: '#fff', fontWeight: 700, fontSize: 15, padding: '10px 22px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0f7a3d', background: '#e6f7ed', border: '1px solid #c6ecd7', padding: '4px 10px', borderRadius: 999 }}>
                  {searchBadge}
                </span>
                <span style={{ fontSize: 12, color: '#8a9ab8' }}>
                  {isHe ? '· מספר רישוי = בדיקת פרטי רכב מלאה' : '· plate number = full vehicle check'}
                </span>
                <span style={{ fontSize: 12, color: '#5b6a86', fontWeight: 600 }}>{isHe ? 'נבדק הרבה:' : 'Trending:'}</span>
                {(isHe
                  ? [['סובארו XV', '/cars/subaru/xv'], ['טויוטה RAV4', '/cars/toyota/rav4'], ['יונדאי טוסון', '/cars/hyundai/tucson'], ['קיה ספורטז׳', '/cars/kia/sportage']]
                  : [['Subaru XV', '/cars/subaru/xv'], ['Toyota RAV4', '/cars/toyota/rav4'], ['Hyundai Tucson', '/cars/hyundai/tucson'], ['Kia Sportage', '/cars/kia/sportage']]
                ).map(([label, href]) => (
                  <Link key={href} href={href} style={{ fontSize: 13, fontWeight: 600, background: '#f2f5fa', border: '1px solid #e6ebf4', padding: '5px 11px', borderRadius: 999, color: '#41506c' }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right col — lead model card */}
          {topCar && (
            <div style={{ justifySelf: 'end', width: '100%', maxWidth: 400 }}>
              <div ref={tiltRef} style={{ background: '#fff', color: '#0d1b2f', borderRadius: 16, padding: 12, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 22px 50px -28px rgba(4,14,32,.8)', transformStyle: 'preserve-3d' }}>
                {/* Photo placeholder */}
                <div style={{ position: 'relative', width: 132, flexShrink: 0, aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(140deg,#e8edf6,#d5deee)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {topCar.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={topCar.imageUrl} alt="" fetchPriority="high" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 11, color: '#5f6e88', letterSpacing: '.1em' }}>תמונת רכב</span>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10.5, letterSpacing: '.14em', color: '#5b6a86', fontWeight: 700 }}>{isHe ? 'דגם מוביל' : 'TOP MODEL'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0f7a3d', background: '#e6f7ed', padding: '2px 8px', borderRadius: 999 }}>{isHe ? 'מומלץ' : 'RECOMMENDED'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                    <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 18, letterSpacing: '-.03em' }}>
                      {isHe ? `${topCar.makeHe} ${topCar.modelHe}` : `${topCar.makeEn} ${topCar.modelEn}`}
                    </span>
                    <span style={{ lineHeight: 1 }}>
                      <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 26, letterSpacing: '-.04em', color: '#17408f' }}>
                        {(Math.round(topCar.combined * 10) / 10).toFixed(1)}
                      </span>
                      <span style={{ fontSize: 12, color: '#5b6a86', fontWeight: 700 }}>10/</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f7a3d', background: '#f1f9f4', border: '1px solid #dbeee3', padding: '3px 8px', borderRadius: 7 }}>{isHe ? 'אמינות 88%' : 'Reliability 88%'}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#17408f', background: '#f1f5fc', border: '1px solid #dde6f6', padding: '3px 8px', borderRadius: 7 }}>{isHe ? 'נוחות 82%' : 'Comfort 82%'}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f7a3d', background: '#f1f9f4', border: '1px solid #dbeee3', padding: '3px 8px', borderRadius: 7 }}>{isHe ? 'בטיחות 90%' : 'Safety 90%'}</span>
                  </div>
                  <Link href={`/cars/${topCar.makeSlug}/${topCar.modelSlug}`} style={{ display: 'inline-block', marginTop: 9, fontSize: 13, fontWeight: 700, color: '#17408f' }}>
                    {isHe ? 'לדוח המלא ←' : 'Full report →'}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────── */}
      <div style={{ maxWidth: MAXW, margin: '-24px auto 0', padding: `0 ${GUTTER}`, position: 'relative', zIndex: 5 }}>
        <div data-ci-group="70" style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 20, boxShadow: '0 20px 50px -30px rgba(13,27,47,.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', overflow: 'hidden' }}>
          {[
            { ref: refMakes,   value: allMakes.length, label: isHe ? 'יצרנים' : 'Makes' },
            { ref: refModels,  value: totalModels,     label: isHe ? 'דגמים' : 'Models' },
            { ref: refReviews, value: 2400,            label: isHe ? 'ביקורות' : 'Reviews' },
            { ref: null,       value: null,            label: isHe ? 'ריקולים' : 'Recalls', static: '+13K' },
          ].map((s, i, arr) => (
            <div key={i} style={{ padding: '10px 12px', textAlign: 'center', borderInlineEnd: i < arr.length - 1 ? '1px solid #eef2f9' : 'none' }}>
              <div style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(20px,2vw,26px)', letterSpacing: '-.04em' }}>
                {s.static ?? <>+<span ref={s.ref as React.RefObject<HTMLSpanElement>}>{s.value}</span></>}
              </div>
              <div style={{ fontSize: 12, color: '#5b6a86', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections wrapper ─────────────────────────────── */}
      <div style={{ maxWidth: MAXW, margin: '0 auto' }}>

        {/* ── Owner Reviews ─────────────────────────────── */}
        <section id="reviews" style={{ padding: `clamp(34px,3.6vw,52px) ${GUTTER} 0` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
            <div data-ci-reveal>
              <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(26px,3vw,38px)', letterSpacing: '-.035em', margin: '0 0 4px' }}>
                {isHe ? 'מה הבעלים אומרים' : 'What owners say'}
              </h2>
              <p style={{ color: '#5b6a86', fontSize: 16, margin: 0 }}>
                {isHe ? 'הביקורות שנכתבו השבוע, מאנשים שנוסעים בדגם כל יום.' : 'Reviews written this week, by people who drive the car every day.'}
              </p>
            </div>
            <Link href="/cars" style={{ fontWeight: 700, fontSize: 15, color: '#17408f', whiteSpace: 'nowrap' }}>
              {isHe ? 'כל הביקורות ←' : 'All reviews →'}
            </Link>
          </div>
          <div data-ci-group="70" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {recentReviews.slice(0, 3).map(r => {
              const showEn = locale === 'en' && Boolean(r.title_en || r.body_en);
              const cName  = showEn ? `${r.makeEn} ${r.modelEn}` : `${r.makeHe} ${r.modelHe}`;
              const body   = showEn ? (r.body_en || r.body || '') : (r.body || '');
              const ago    = timeAgo(r.created_at, isHe);
              const init   = initials(r.author || cName);
              return (
                <Link key={r.id} href={`/cars/${r.make_slug}/${r.model_slug}${r.id ? `#review-${r.id}` : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <article style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: 17, height: '100%' }} className="ci-card-hover">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <h3 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 17, margin: 0 }}>{cName}{r.year ? ` ${r.year}` : ''}</h3>
                        <div style={{ fontSize: 13, color: '#a06a00', marginTop: 5 }}>
                          {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}
                          <span style={{ color: '#5b6a86' }}> · {ago}</span>
                        </div>
                      </div>
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: '#f2f5fa', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, color: '#5b6a86', flexShrink: 0 }}>
                        {init}
                      </span>
                    </div>
                    <p style={{ color: '#41506c', fontSize: 15, lineHeight: 1.6, margin: '14px 0 0', direction: showEn ? 'ltr' : 'rtl', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {body}
                    </p>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>

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
                <Link href={`/news/${news[0].id}`} style={{ textDecoration: 'none', color: 'inherit' }} data-ci-reveal>
                  <article style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 18, overflow: 'hidden' }} className="ci-card-hover">
                    {news[0].image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={news[0].image_url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ aspectRatio: '16/9', background: 'linear-gradient(140deg,#dfe6f3,#c9d4e8)', display: 'grid', placeItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#5f6e88', letterSpacing: '.12em' }}>{isHe ? 'תמונת כתבה' : 'Article image'}</span>
                      </div>
                    )}
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12.5, color: '#5b6a86', fontWeight: 600 }}>
                        <span style={{ color: '#17408f' }}>{news[0].source}</span>
                        <span>·</span>
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
              )}
              {/* Headline list */}
              <div data-ci-group="80" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                {news.slice(1, 4).map(item => (
                  <Link key={item.id} href={`/news/${item.id}`} style={{ display: 'flex', gap: 14, background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: 14, alignItems: 'center', textDecoration: 'none', color: 'inherit' }} className="ci-news-row">
                    {item.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.image_url} alt="" loading="lazy" style={{ width: 96, height: 70, flexShrink: 0, borderRadius: 11, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <span style={{ width: 96, height: 70, flexShrink: 0, borderRadius: 11, background: 'linear-gradient(140deg,#e8edf6,#d5deee)', display: 'block' }} />
                    )}
                    <span>
                      <span style={{ display: 'block', fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 16, lineHeight: 1.3, color: '#0d1b2f', direction: isHe ? 'rtl' : 'ltr', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                        {isHe ? (item.title_he ?? item.title_en) : (item.title_en ?? item.title_he)}
                      </span>
                      <span style={{ display: 'block', fontSize: 12.5, color: '#5b6a86', marginTop: 6 }}>
                        {item.source} · {item.published_at ? timeAgo(item.published_at, isHe) : ''}
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
                const score = (Math.round(car.combined * 10) / 10).toFixed(1);
                const name  = isHe ? `${car.makeHe} ${car.modelHe}` : `${car.makeEn} ${car.modelEn}`;
                return (
                  <Link key={`${car.makeSlug}/${car.modelSlug}`} href={`/cars/${car.makeSlug}/${car.modelSlug}`} style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, overflow: 'hidden', textDecoration: 'none' }} className="ci-model-card">
                    <span style={{ position: 'relative', display: 'block', aspectRatio: '16/10', background: car.imageUrl ? '#f7f9fd' : 'linear-gradient(140deg,#e8edf6,#d5deee)' }}>
                      {car.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={car.imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                      )}
                      <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, background: '#17408f', color: '#fff', fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 15, padding: '5px 11px', borderRadius: 9 }}>{score}</span>
                    </span>
                    <span style={{ display: 'block', padding: '13px 16px 16px' }}>
                      <span style={{ display: 'block', fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 18, color: '#0d1b2f' }}>{name}</span>
                      <span style={{ display: 'block', fontSize: 13.5, color: '#5b6a86', marginTop: 4 }}>
                        {car.avgRating != null ? `${(car.avgRating * (car.avgRating <= 5 ? 20 : 10)).toFixed(0)} ${isHe ? 'ביקורות בעלים' : 'owner reviews'}` : (isHe ? 'ביקורות בעלים' : 'owner reviews')}
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
            {[
              { aHe: 'טויוטה RAV4',   bHe: 'יונדאי טוסון', aEn: 'Toyota RAV4',     bEn: 'Hyundai Tucson', aScore: 8.7, bScore: 8.3, cmp: '2,340', href: '/cars/compare/toyota/rav4/hyundai/tucson' },
              { aHe: 'מאזדה CX-5',    bHe: 'קיה ספורטז׳',  aEn: 'Mazda CX-5',      bEn: 'Kia Sportage',   aScore: 8.9, bScore: 8.1, cmp: '1,820', href: '/cars/compare/mazda/cx5/kia/sportage' },
              { aHe: 'יונדאי אלנטרה', bHe: 'קיה סראטו',    aEn: 'Hyundai Elantra', bEn: 'Kia Cerato',     aScore: 8.2, bScore: 8.0, cmp: '1,550', href: '/cars/compare/hyundai/elantra/kia/cerato' },
            ].map((vs, i) => {
              const total = vs.aScore + vs.bScore;
              const aPct  = `${((vs.aScore / total) * 100).toFixed(0)}%`;
              return (
                <Link key={i} href={vs.href} style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: 20, display: 'block', textDecoration: 'none' }} className="ci-vs-card">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 16.5, color: '#0d1b2f' }}>
                    <span>{isHe ? vs.aHe : vs.aEn}</span>
                    <span style={{ fontSize: 11, letterSpacing: '.14em', color: '#5f6e88' }}>VS</span>
                    <span>{isHe ? vs.bHe : vs.bEn}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 17 }}>
                    <span style={{ color: '#0f7a3d' }}>{vs.aScore.toFixed(1)}</span>
                    <span style={{ flex: 1, height: 7, borderRadius: 999, background: `linear-gradient(90deg,#17408f 0 ${aPct},#12a150 ${aPct} 100%)`, display: 'block' }} />
                    <span style={{ color: '#17408f' }}>{vs.bScore.toFixed(1)}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#5b6a86', marginTop: 10 }}>
                    {vs.cmp} {isHe ? 'השוואות' : 'comparisons'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>{/* /maxw wrapper */}

      {/* ── Closing CTA ─────────────────────────────────── */}
      <section style={{ background: '#0d1b2f', color: '#fff', padding: 'clamp(40px,4.5vw,64px) clamp(16px,3vw,32px)', marginTop: 'clamp(34px,3.6vw,52px)' }}>
        <div data-ci-group="90" style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(24px,2.8vw,38px)', lineHeight: 1.12, letterSpacing: '-.04em', margin: 0, color: '#fff' }}>
            {isHe ? 'בדקו את הרכב לפני שאתם חותמים.' : 'Check the car before you sign.'}
          </h2>
          <p style={{ color: '#b8c8e4', fontSize: 'clamp(15px,1.2vw,17px)', margin: '12px 0 20px' }}>
            {isHe ? '22 בדיקות לפי סדר ביצוע, מהיסטוריית הרכב ועד ריקולים פתוחים.' : '22 checks in running order — from vehicle history to open recalls.'}
          </p>
          <Link href="/checklist" style={{ display: 'inline-block', background: '#fff', color: '#0d1b2f', fontWeight: 800, fontSize: 16, padding: '13px 30px', borderRadius: 13 }}>
            {isHe ? 'התחילו צ׳קליסט ←' : 'Start the checklist →'}
          </Link>
        </div>
      </section>

      <style>{`
        .ci-card-hover { transition: transform .3s cubic-bezier(.23,1,.32,1), box-shadow .3s; }
        .ci-card-hover:hover { transform: translateY(-6px); box-shadow: 0 24px 44px -26px rgba(13,27,47,.45); }
.ci-model-card { transition: transform .3s cubic-bezier(.23,1,.32,1); }
        .ci-model-card:hover { transform: translateY(-6px); }
        .ci-vs-card:hover { border-color: #17408f !important; }
        .ci-news-row { transition: transform .25s cubic-bezier(.23,1,.32,1), border-color .2s; }
        .ci-news-row:hover { transform: translateX(-6px); border-color: #c9d6ee !important; }
        @media (max-width: 680px) {
          .ci-news-row:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}

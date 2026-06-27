'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StarRating from '@/components/StarRating';
import Car3DViewer from '@/components/Car3DViewer';
import type { CarMake } from '@/data/cars';
import { useLocale } from '@/lib/localeContext';

interface CarOption { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; }
interface CarData {
  makeHe: string; modelHe: string; makeEn: string; modelEn: string;
  makeSlug: string; modelSlug: string;
  avgRating: number | null; reviewCount: number;
  score: number | null; localSummary: string | null; globalSummary: string | null;
  pros: string[]; cons: string[];
  modelUid: string | null;
}

function CarSelector({ value, onChange, options, label }: {
  value: CarOption | null;
  onChange: (v: CarOption | null) => void;
  options: CarOption[];
  label: string;
}) {
  const { locale, t } = useLocale();
  const cmp = t.comparePage;
  const [make, setMake] = useState(value?.makeSlug ?? '');
  const [model, setModel] = useState(value?.modelSlug ?? '');
  const makes = [...new Set(options.map(o => o.makeSlug))];
  const models = options.filter(o => o.makeSlug === make);

  useEffect(() => {
    if (value && (value.makeSlug !== make || value.modelSlug !== model)) {
      setMake(value.makeSlug);
      setModel(value.modelSlug);
    }
  }, [value]);

  useEffect(() => {
    if (make && model) {
      const opt = options.find(o => o.makeSlug === make && o.modelSlug === model);
      onChange(opt ?? null);
    } else {
      onChange(null);
    }
  }, [make, model]);

  return (
    <div className="card" style={{ padding: 24, flex: '1 1 280px' }}>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <select
        value={make}
        onChange={e => { setMake(e.target.value); setModel(''); onChange(null); }}
        style={{ width: '100%', height: 42, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9375rem', marginBottom: 12, cursor: 'pointer' }}
      >
        <option value="">{ cmp.selectMake }</option>
        {makes.map(s => {
          const o = options.find(x => x.makeSlug === s)!;
          return <option key={s} value={s}>{locale === 'en' ? o.makeEn : `${o.makeHe} (${o.makeEn})`}</option>;
        })}
      </select>
      <select
        value={model}
        onChange={e => setModel(e.target.value)}
        disabled={!make}
        style={{ width: '100%', height: 42, padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9375rem', cursor: make ? 'pointer' : 'default', opacity: make ? 1 : 0.5 }}
      >
        <option value="">{cmp.selectModel}</option>
        {models.map(o => <option key={o.modelSlug} value={o.modelSlug}>{locale === 'en' ? o.modelEn : `${o.modelHe} (${o.modelEn})`}</option>)}
      </select>
      {value && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          ✓ {locale === 'en' ? `${value.makeEn} ${value.modelEn}` : `${value.makeHe} ${value.modelHe}`}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, max = 10 }: { label: string; value: number | null; max?: number }) {
  const pct = value != null ? (value / max) * 100 : 0;
  const color = value == null ? 'var(--border)' : value >= 7 ? '#16a34a' : value >= 5 ? '#ca8a04' : '#dc2626';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color }}>{value != null ? value.toFixed(1) : '—'}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 999 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function ComparePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { locale, t } = useLocale();
  const cmp = t.comparePage;
  const carName = (d: CarData) => locale === 'en' ? `${d.makeEn} ${d.modelEn}` : `${d.makeHe} ${d.modelHe}`;
  const [options, setOptions]   = useState<CarOption[]>([]);
  const [car1, setCar1]         = useState<CarOption | null>(null);
  const [car2, setCar2]         = useState<CarOption | null>(null);
  const [data1, setData1]       = useState<CarData | null>(null);
  const [data2, setData2]       = useState<CarData | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  useEffect(() => {
    // Redirect query-param URLs to canonical clean URLs for SEO
    const car1Param = searchParams.get('car1');
    const car2Param = searchParams.get('car2');
    if (car1Param && car2Param) {
      const [s1, s2] = [car1Param, car2Param].sort();
      router.replace(`/cars/compare/${s1}/${s2}`);
      return;
    }

    fetch('/api/cars')
      .then(r => r.json())
      .then((makes: CarMake[]) => {
        const opts: CarOption[] = makes.flatMap(m =>
          m.models.map(mo => ({ makeSlug: m.slug, modelSlug: mo.slug, makeHe: m.nameHe, modelHe: mo.nameHe, makeEn: m.nameEn, modelEn: mo.nameEn }))
        );
        setOptions(opts);
        // Pre-select car1 from URL param ?car1=make/model (single car, no redirect)
        if (car1Param) {
          const [makeSlug, modelSlug] = car1Param.split('/');
          const opt = opts.find(o => o.makeSlug === makeSlug && o.modelSlug === modelSlug);
          if (opt) setCar1(opt);
        }
      });
  }, [searchParams, router]);

  const loadCar = useCallback(async (opt: CarOption, setData: (d: CarData | null) => void, setLoading: (b: boolean) => void) => {
    setLoading(true);
    setData(null);
    try {
      const [reviewsRes, expertRes, modelRes] = await Promise.all([
        fetch(`/api/reviews?makeSlug=${opt.makeSlug}&modelSlug=${opt.modelSlug}`),
        fetch(`/api/expert-reviews?make=${opt.makeSlug}&model=${opt.modelSlug}`),
        fetch(`/api/car-3d?make=${opt.makeSlug}&model=${opt.modelSlug}`),
      ]);
      const reviews = reviewsRes.ok ? await reviewsRes.json() : { reviews: [] };
      const expert  = expertRes.ok  ? await expertRes.json()  : [];
      const model3d = modelRes.ok   ? await modelRes.json()   : null;
      const rev: any[] = reviews.reviews ?? [];
      const exp: any   = Array.isArray(expert) ? expert[0] ?? null : expert.reviews?.[0] ?? null;
      const avgRating  = rev.length ? rev.reduce((s: number, r: any) => s + r.rating, 0) / rev.length : null;

      let localSummary:  string | null = exp?.localSummaryHe  ?? null;
      let globalSummary: string | null = exp?.globalSummaryHe ?? null;
      let pros: string[] = exp?.pros ?? [];
      let cons: string[] = exp?.cons ?? [];

      if (locale === 'en') {
        // Prefer pre-translated EN fields from DB
        if (exp?.prosEn?.some(Boolean))  pros         = exp.prosEn;
        if (exp?.consEn?.some(Boolean))  cons         = exp.consEn;
        if (exp?.localSummaryEn)         localSummary  = exp.localSummaryEn;
        if (exp?.globalSummaryEn)        globalSummary = exp.globalSummaryEn;
        if (!localSummary && !globalSummary && exp?.summaryEn) localSummary = exp.summaryEn;
      }

      setData({
        makeHe: opt.makeHe, modelHe: opt.modelHe, makeEn: opt.makeEn, modelEn: opt.modelEn,
        makeSlug: opt.makeSlug, modelSlug: opt.modelSlug,
        avgRating, reviewCount: rev.length,
        score: exp?.topScore ?? null,
        localSummary, globalSummary, pros, cons,
        modelUid: model3d?.uid ?? null,
      });
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [locale]);

  useEffect(() => { if (car1) loadCar(car1, setData1, setLoading1); else setData1(null); }, [car1, loadCar]);
  useEffect(() => { if (car2) loadCar(car2, setData2, setLoading2); else setData2(null); }, [car2, loadCar]);

  const showComparison = data1 && data2;

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{t.carsPage.home}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{cmp.breadcrumb}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, marginBottom: 8 }}>{cmp.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>{cmp.subtitle}</p>

        {/* Selectors */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 40 }}>
          <CarSelector value={car1} onChange={setCar1} options={options} label={cmp.car1Label} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-muted)', padding: '0 4px' }}>VS</div>
          <CarSelector value={car2} onChange={setCar2} options={options} label={cmp.car2Label} />
        </div>

        {/* Comparison */}
        {(loading1 || loading2) && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{cmp.loading}</div>
        )}

        {showComparison && !loading1 && !loading2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <style>{`
              @media (max-width: 640px) {
                .cmp-scores-grid { grid-template-columns: 1fr !important; }
                .cmp-scores-divider { display: none !important; }
                .cmp-two-col { grid-template-columns: 1fr !important; }
              }
            `}</style>

            {/* Scores overview */}
            <div className="card" style={{ padding: 28 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 24 }}>{cmp.overallScores}</h2>
              <div className="cmp-scores-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'start' }}>
                {/* Car 1 */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>
                    <Link href={`/cars/${data1.makeSlug}/${data1.modelSlug}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                      {carName(data1)}
                    </Link>
                  </div>
                  <ScoreBar label={cmp.aiScore} value={data1.score} />
                  <ScoreBar label={cmp.userRating} value={data1.avgRating ? data1.avgRating * 2 : null} />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 8 }}>{data1.reviewCount} {cmp.reviews}</div>
                </div>

                {/* Divider */}
                <div className="cmp-scores-divider" style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', minHeight: 80 }} />

                {/* Car 2 */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>
                    <Link href={`/cars/${data2.makeSlug}/${data2.modelSlug}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                      {carName(data2)}
                    </Link>
                  </div>
                  <ScoreBar label={cmp.aiScore} value={data2.score} />
                  <ScoreBar label={cmp.userRating} value={data2.avgRating ? data2.avgRating * 2 : null} />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 8 }}>{data2.reviewCount} {cmp.reviews}</div>
                </div>
              </div>
            </div>

            {/* 3D Models */}
            {(data1.modelUid || data2.modelUid) && (
              <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{locale === 'en' ? '3D Models' : 'מודל תלת-ממד'}</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    {data1.modelUid
                      ? <Car3DViewer uid={data1.modelUid} modelName={carName(data1)} makeSlug={data1.makeSlug} modelSlug={data1.modelSlug} />
                      : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', borderRadius: 10, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{locale === 'en' ? 'No 3D model' : 'אין מודל 3D'}</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    {data2.modelUid
                      ? <Car3DViewer uid={data2.modelUid} modelName={carName(data2)} makeSlug={data2.makeSlug} modelSlug={data2.modelSlug} />
                      : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', borderRadius: 10, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{locale === 'en' ? 'No 3D model' : 'אין מודל 3D'}</div>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* User rating stars */}
            <div className="card" style={{ padding: 28 }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 24 }}>{cmp.ownerRating}</h2>
              <div className="cmp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {[data1, data2].map((d, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 4 }}>
                      {d.avgRating != null ? d.avgRating.toFixed(1) : '—'}
                    </div>
                    {d.avgRating != null && <StarRating rating={d.avgRating} size={20} />}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 6 }}>{d.reviewCount} {cmp.reviews}</div>
                    <div style={{ fontWeight: 700, marginTop: 8, fontSize: '0.875rem' }}>{carName(d)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="cmp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[data1, data2].map((d, i) => (
                <div key={i} className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{carName(d)}</div>
                  {d.pros.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cmp.pros}</div>
                      {d.pros.map((p, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                          <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {d.cons.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cmp.cons}</div>
                      {d.cons.map((c, j) => (
                        <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                          <span style={{ color: '#dc2626', flexShrink: 0 }}>✗</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {d.pros.length === 0 && d.cons.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{cmp.noData}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Summaries */}
            <div className="cmp-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[data1, data2].map((d, i) => (
                <div key={i} className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{carName(d)} — {cmp.aiSummary}</div>
                  {d.localSummary && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{cmp.israeliReviews}</div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{d.localSummary}</p>
                    </div>
                  )}
                  {d.globalSummary && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{cmp.globalReviews}</div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{d.globalSummary}</p>
                    </div>
                  )}
                  {!d.localSummary && !d.globalSummary && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{cmp.noSummary}</div>
                  )}
                  <Link href={`/cars/${d.makeSlug}/${d.modelSlug}`} style={{ display: 'inline-block', marginTop: 16, fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                    {cmp.fullModelPage}
                  </Link>
                </div>
              ))}
            </div>

          </div>
        )}

        {!showComparison && !loading1 && !loading2 && car1 && !car2 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {cmp.selectSecond}
          </div>
        )}

        {!car1 && !car2 && (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
            <p>{cmp.selectBoth}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CompareClient() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <ComparePageInner />
    </Suspense>
  );
}

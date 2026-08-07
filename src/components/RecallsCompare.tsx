'use client';
import { useState, useEffect, useRef } from 'react';
import type { Recall } from '@/app/api/recalls/route';

const COLOR_A = '#22d3ee'; // cyan
const COLOR_B = '#a78bfa'; // purple

function RecallsYearChart({ recalls1, recalls2, name1, name2, isHe }: {
  recalls1: Recall[]; recalls2: Recall[]; name1: string; name2: string; isHe: boolean;
}) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => setCompact((e[0]?.contentRect.width ?? 500) < 420));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const countByYear = (recalls: Recall[]) => {
    const m = new Map<number, number>();
    for (const r of recalls) if (r.year) m.set(r.year, (m.get(r.year) ?? 0) + 1);
    return m;
  };

  const map1 = countByYear(recalls1);
  const map2 = countByYear(recalls2);
  const allYears = Array.from(new Set([...map1.keys(), ...map2.keys()])).sort((a, b) => a - b);

  if (allYears.length === 0) return null;

  const maxCount = Math.max(...allYears.flatMap(y => [map1.get(y) ?? 0, map2.get(y) ?? 0]));

  const W = compact ? 300 : 520;
  const H = compact ? 140 : 160;
  const PAD = { top: 16, right: 12, bottom: 44, left: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const groupW = cW / allYears.length;
  const barGap = 2;
  const barW = Math.max(4, groupW / 2 - barGap);

  const xOfA = (i: number) => i * groupW + groupW / 2 - barW - barGap / 2;
  const xOfB = (i: number) => i * groupW + groupW / 2 + barGap / 2;
  const yOf = (count: number) => cH - (count / (maxCount || 1)) * cH;


  const numYTicks = compact ? 3 : Math.min(maxCount + 1, 5);
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const val = Math.round((i / (numYTicks - 1)) * maxCount);
    return { y: cH - (val / maxCount) * cH, label: String(val) };
  });

  return (
    <div ref={containerRef} style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {isHe ? 'ריקולים לפי שנת דגם' : 'Recalls by Model Year'}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }} dir="ltr">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          <rect x={0} y={0} width={cW} height={cH} fill="rgba(255,255,255,0.018)" rx={3} />

          {yTicks.map(({ y, label }, i) => (
            <g key={i}>
              <line x1={0} x2={cW} y1={y} y2={y} stroke="var(--border)"
                strokeWidth={i === 0 ? 1 : 0.5} strokeDasharray={i === 0 ? undefined : '4 3'} />
              <text x={-5} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)" fontFamily="system-ui,sans-serif">{label}</text>
            </g>
          ))}

          {allYears.map((year, i) => {
            const c1 = map1.get(year) ?? 0;
            const c2 = map2.get(year) ?? 0;
            const isHov = hoveredYear === year;
            return (
              <g key={year} opacity={hoveredYear !== null && !isHov ? 0.35 : 1} style={{ transition: 'opacity 0.1s' }}>
                {c1 > 0 && <rect x={xOfA(i)} y={yOf(c1)} width={barW} height={cH - yOf(c1)} fill={COLOR_A} rx={2} />}
                {c2 > 0 && <rect x={xOfB(i)} y={yOf(c2)} width={barW} height={cH - yOf(c2)} fill={COLOR_B} rx={2} />}
                {isHov && c1 > 0 && (
                  <text x={xOfA(i) + barW / 2} y={yOf(c1) - 3} textAnchor="middle" fontSize={9} fill={COLOR_A} fontWeight={700} fontFamily="system-ui,sans-serif">{c1}</text>
                )}
                {isHov && c2 > 0 && (
                  <text x={xOfB(i) + barW / 2} y={yOf(c2) - 3} textAnchor="middle" fontSize={9} fill={COLOR_B} fontWeight={700} fontFamily="system-ui,sans-serif">{c2}</text>
                )}
              </g>
            );
          })}

          {allYears.map((year, i) => (
            <text key={year}
              x={i * groupW + groupW / 2} y={cH + 8}
              textAnchor="end" fontSize={9}
              fill="var(--text-muted)" fontFamily="system-ui,sans-serif"
              transform={`rotate(-45, ${i * groupW + groupW / 2}, ${cH + 8})`}
            >{year}</text>
          ))}

          {/* Transparent hover zones */}
          {allYears.map((year, i) => (
            <rect key={`hov-${year}`}
              x={i * groupW} y={0} width={groupW} height={cH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredYear(year)}
              onMouseLeave={() => setHoveredYear(null)}
            />
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, background: COLOR_A, borderRadius: 2 }} />
          <span>{name1}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, background: COLOR_B, borderRadius: 2 }} />
          <span>{name2}</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  make1: string; model1: string; name1: string;
  make2: string; model2: string; name2: string;
  make1En: string; model1En: string;
  make2En: string; model2En: string;
  locale: 'he' | 'en';
}

export default function RecallsCompare({ make1, model1, name1, make2, model2, name2, make1En, model1En, make2En, model2En, locale }: Props) {
  const [recalls1, setRecalls1] = useState<Recall[] | null>(null);
  const [recalls2, setRecalls2] = useState<Recall[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear - i).join(',');
    Promise.all([
      fetch(`/api/recalls?make=${encodeURIComponent(make1En)}&model=${encodeURIComponent(model1En)}&years=${years}&locale=en`)
        .then(r => r.json()).then((d: { recalls: Recall[] }) => d.recalls ?? []).catch(() => []),
      fetch(`/api/recalls?make=${encodeURIComponent(make2En)}&model=${encodeURIComponent(model2En)}&years=${years}&locale=en`)
        .then(r => r.json()).then((d: { recalls: Recall[] }) => d.recalls ?? []).catch(() => []),
    ]).then(([r1, r2]) => {
      setRecalls1(r1);
      setRecalls2(r2);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [make1En, model1En, make2En, model2En]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;
  if (recalls1 === null && recalls2 === null) return null;

  const count1 = recalls1?.length ?? 0;
  const count2 = recalls2?.length ?? 0;
  const fewerRecalls = count1 < count2 ? 'a' : count2 < count1 ? 'b' : 'tie';

  const isHe = locale === 'he';

  return (
    <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 28 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
          {isHe ? 'השוואת ריקולים (6 שנים אחרונות)' : 'Recalls Comparison (Last 6 Years)'}
        </h2>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Count row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* Car A */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: fewerRecalls === 'a' ? '#16a34a' : count1 > 4 ? '#dc2626' : 'var(--text)', lineHeight: 1 }}>
              {count1}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{name1}</div>
            {fewerRecalls === 'a' && count1 !== count2 && (
              <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: 4, fontWeight: 700 }}>
                🏆 {isHe ? 'פחות ריקולים' : 'Fewer recalls'}
              </div>
            )}
          </div>

          <div style={{ fontWeight: 900, fontSize: '0.875rem', color: 'var(--text-muted)' }}>VS</div>

          {/* Car B */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: fewerRecalls === 'b' ? '#16a34a' : count2 > 4 ? '#dc2626' : 'var(--text)', lineHeight: 1 }}>
              {count2}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{name2}</div>
            {fewerRecalls === 'b' && count1 !== count2 && (
              <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: 4, fontWeight: 700 }}>
                🏆 {isHe ? 'פחות ריקולים' : 'Fewer recalls'}
              </div>
            )}
          </div>
        </div>

        {/* Recall list for whichever car has recalls */}
        {(count1 > 0 || count2 > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { recalls: recalls1 ?? [], name: name1, make: make1, model: model1 },
              { recalls: recalls2 ?? [], name: name2, make: make2, model: model2 },
            ].map(({ recalls, name, make, model }) => (
              <div key={`${make}/${model}`}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {name}
                </div>
                {recalls.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                    ✓ {isHe ? 'אין ריקולים' : 'No recalls found'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {recalls.slice(0, 4).map(r => (
                      <div key={r.id} style={{
                        padding: '6px 10px', borderRadius: 6,
                        background: 'var(--bg-muted)', border: '1px solid var(--border)',
                        fontSize: '0.72rem', lineHeight: 1.4,
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                          {r.year ? `${r.year} · ` : ''}{r.component}
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>{r.date}</div>
                      </div>
                    ))}
                    {recalls.length > 4 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 2 }}>
                        +{recalls.length - 4} {isHe ? 'נוספים' : 'more'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <RecallsYearChart
          recalls1={recalls1 ?? []} recalls2={recalls2 ?? []}
          name1={name1} name2={name2} isHe={isHe}
        />

        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {isHe ? 'מקור: NHTSA · מוצגים ריקולים מ-6 שנים אחרונות' : 'Source: NHTSA · Showing recalls from the last 6 years'}
        </div>
      </div>
    </div>
  );
}

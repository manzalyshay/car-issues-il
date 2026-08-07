'use client';
import { useState, useEffect, useRef } from 'react';
import type { Recall } from '@/app/api/recalls/route';

interface Props {
  makeEn: string;
  modelEn: string;
  years?: number[];
  isEn: boolean;
}

const BAR_COLOR = '#f97316';

function barColor(count: number) {
  if (count === 0) return 'transparent';
  if (count <= 2) return '#f59e0b';
  if (count <= 4) return '#f97316';
  return '#dc2626';
}

export default function RecallsBarChart({ makeEn, modelEn, years, isEn }: Props) {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setCompact((entries[0]?.contentRect.width ?? 500) < 480);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ make: makeEn, model: modelEn, locale: 'en' });
    if (years?.length) params.set('years', years.join(','));
    fetch(`/api/recalls?${params}`)
      .then(r => r.json())
      .then((d: { recalls: Recall[] }) => {
        if (!cancelled) {
          setRecalls(d.recalls ?? []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [makeEn, modelEn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', width: '100%', height: '100%' }}>
        {header(isEn)}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '32px 20px' }}>
          {isEn ? 'Loading recall data...' : 'טוען נתוני ריקולים...'}
        </div>
      </div>
    );
  }

  // Group by model year
  const countByYear = new Map<number, number>();
  for (const r of recalls) {
    if (r.year) countByYear.set(r.year, (countByYear.get(r.year) ?? 0) + 1);
  }

  if (countByYear.size === 0) {
    return (
      <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', width: '100%', height: '100%' }}>
        {header(isEn)}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', color: 'var(--text-muted)', textAlign: 'center', gap: 8 }}>
          <div style={{ fontSize: '2rem' }}>✅</div>
          <div style={{ fontSize: '0.875rem' }}>
            {isEn ? 'No NHTSA recall data found for this model' : 'לא נמצאו נתוני ריקולים עבור דגם זה'}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Source: NHTSA</div>
        </div>
      </div>
    );
  }

  const allYears = Array.from(countByYear.keys()).sort((a, b) => a - b);
  const maxCount = Math.max(...Array.from(countByYear.values()));

  const W = compact ? 320 : 380;
  const H = compact ? 150 : 170;
  const PAD = { top: 18, right: compact ? 12 : 16, bottom: 46, left: compact ? 28 : 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const barCount = allYears.length;
  const gap = compact ? 3 : 4;
  const barW = Math.min(36, Math.max(8, (cW - gap * (barCount - 1)) / barCount));
  const totalBarsW = barW * barCount + gap * (barCount - 1);
  const startX = (cW - totalBarsW) / 2;

  const xOf = (i: number) => startX + i * (barW + gap);
  const yOf = (count: number) => cH - (count / (maxCount || 1)) * cH;

  const numYTicks = compact ? 3 : Math.min(maxCount + 1, 5);
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const val = Math.round((i / (numYTicks - 1)) * maxCount);
    return { y: cH - (val / maxCount) * cH, label: String(val) };
  });


  const totalRecalls = recalls.length;
  const worstYear = allYears.reduce((a, b) => (countByYear.get(b)! > countByYear.get(a)! ? b : a));

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', width: '100%', height: '100%' }}>
      {header(isEn)}

      <div style={{ padding: '16px 20px 12px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }} dir="ltr">
          <defs>
            <filter id="rbc-shadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Background */}
            <rect x={0} y={0} width={cW} height={cH} fill="rgba(255,255,255,0.018)" rx={3} />

            {/* Y grid + labels */}
            {yTicks.map(({ y, label }, i) => (
              <g key={i}>
                <line x1={0} x2={cW} y1={y} y2={y}
                  stroke="var(--border)" strokeWidth={i === 0 ? 1 : 0.5}
                  strokeDasharray={i === 0 ? undefined : '4 3'} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={compact ? 9 : 10} fill="var(--text-muted)" fontFamily="system-ui,sans-serif">
                  {label}
                </text>
              </g>
            ))}

            {/* Bars */}
            {allYears.map((year, i) => {
              const count = countByYear.get(year) ?? 0;
              const x = xOf(i);
              const y = yOf(count);
              const bH = cH - y;
              const isHovered = hoveredYear === year;
              const color = barColor(count);
              return (
                <g key={year}>
                  <rect
                    x={x} y={y} width={barW} height={bH}
                    fill={color} rx={3}
                    opacity={hoveredYear !== null && !isHovered ? 0.4 : 1}
                    style={{ transition: 'opacity 0.1s' }}
                  />
                  {/* Count label on top of bar when hovered or bar is tall enough */}
                  {(isHovered || bH > 20) && (
                    <text
                      x={x + barW / 2} y={y - 3}
                      textAnchor="middle" fontSize={compact ? 9 : 10}
                      fill={isHovered ? color : 'var(--text-muted)'}
                      fontWeight={isHovered ? 700 : 400}
                      fontFamily="system-ui,sans-serif"
                    >
                      {count}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X labels — every year, rotated to avoid overlap */}
            {allYears.map((year, i) => (
              <text key={year}
                x={xOf(i) + barW / 2} y={cH + 8}
                textAnchor="end"
                fontSize={compact ? 9 : 10}
                fill="var(--text-muted)"
                fontFamily="system-ui,sans-serif"
                transform={`rotate(-45, ${xOf(i) + barW / 2}, ${cH + 8})`}
              >
                {year}
              </text>
            ))}

            {/* Mouse overlay */}
            <rect x={0} y={0} width={cW} height={cH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseMove={(e) => {
                const svgEl = e.currentTarget.closest('svg') as SVGSVGElement | null;
                if (!svgEl) return;
                const rect = svgEl.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
                const nearest = allYears.reduce((a, b) => {
                  const ai = allYears.indexOf(a);
                  const bi = allYears.indexOf(b);
                  return Math.abs(xOf(ai) + barW / 2 - mouseX) < Math.abs(xOf(bi) + barW / 2 - mouseX) ? a : b;
                });
                setHoveredYear(nearest);
              }}
              onMouseLeave={() => setHoveredYear(null)}
            />

            {/* Hover tooltip */}
            {hoveredYear !== null && (() => {
              const count = countByYear.get(hoveredYear) ?? 0;
              const idx = allYears.indexOf(hoveredYear);
              const bx = xOf(idx) + barW / 2;
              const ttW = 90;
              const ttH = 44;
              const ttX = Math.max(0, Math.min(cW - ttW, bx - ttW / 2));
              const ttY = Math.max(4, yOf(count) - ttH - 6);
              return (
                <g pointerEvents="none" filter="url(#rbc-shadow)">
                  <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={7}
                    fill="#1a2540" stroke="var(--border)" strokeWidth={1} />
                  <text x={ttX + ttW / 2} y={ttY + 15} textAnchor="middle"
                    fontSize={12} fontWeight={700} fill="#f1f5f9" fontFamily="system-ui,sans-serif">
                    {hoveredYear}
                  </text>
                  <text x={ttX + ttW / 2} y={ttY + 33} textAnchor="middle"
                    fontSize={11} fill={barColor(count)} fontWeight={700} fontFamily="system-ui,sans-serif">
                    {count} {isEn ? (count === 1 ? 'recall' : 'recalls') : count === 1 ? 'ריקול' : 'ריקולים'}
                  </text>
                </g>
              );
            })()}
          </g>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {[
            { color: '#f59e0b', label: isEn ? '1–2' : '1–2' },
            { color: '#f97316', label: isEn ? '3–4' : '3–4' },
            { color: '#dc2626', label: isEn ? '5+' : '5+' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 10, padding: '8px 14px',
          background: 'rgba(249,115,22,0.08)', borderRadius: 8,
          border: '1px solid rgba(249,115,22,0.2)',
          textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)',
        }}>
          {isEn
            ? `${totalRecalls} total recall${totalRecalls !== 1 ? 's' : ''} · most in ${worstYear} (${countByYear.get(worstYear)})`
            : `סה"כ ${totalRecalls} ריקולים · השנה עם הכי הרבה: ${worstYear} (${countByYear.get(worstYear)})`}
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8 }}>
          {isEn ? 'Source: NHTSA' : 'מקור: NHTSA'}
        </div>
      </div>
    </div>
  );
}

function header(isEn: boolean) {
  return (
    <div style={{
      padding: '14px 20px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: '1.1rem' }}>⚠️</span>
      <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
        {isEn ? 'Recalls by Model Year' : 'ריקולים לפי שנת דגם'}
      </h2>
    </div>
  );
}

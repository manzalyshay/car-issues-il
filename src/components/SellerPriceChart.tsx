'use client';
import { useState, useEffect, useRef } from 'react';

interface SellerRow {
  year: number;
  private_avg: number | null;
  private_min: number | null;
  private_max: number | null;
  dealer_avg: number | null;
  dealer_min: number | null;
  dealer_max: number | null;
}

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeEn: string;
  modelEn: string;
  isEn: boolean;
}

function fmtK(n: number, isEn = false) {
  if (isEn) return `$${Math.round(n / 3700)}K`;
  return `₪${Math.round(n / 1000)}K`;
}

const PRIVATE_COLOR = '#1b4f8a';  // blue
const DEALER_COLOR  = '#f97316';  // orange

export default function SellerPriceChart({ makeSlug, modelSlug, makeEn, modelEn, isEn }: Props) {
  const [rows, setRows] = useState<SellerRow[]>([]);
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
    fetch(`/api/price-seller-type?make=${makeSlug}&model=${modelSlug}&makeEn=${encodeURIComponent(makeEn)}&modelEn=${encodeURIComponent(modelEn)}`)
      .then(r => r.json())
      .then((d: { points: SellerRow[] }) => {
        if (!cancelled) {
          setRows((d.points ?? []).filter(p => p.private_avg && p.dealer_avg));
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [makeSlug, modelSlug, makeEn, modelEn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e3e8ee', background: '#fff', width: '100%', height: '100%' }}>
        {header(isEn)}
        <div style={{ textAlign: 'center', color: '#8595a6', fontSize: '0.875rem', padding: '32px 20px' }}>
          {isEn ? 'Loading seller comparison...' : 'טוען השוואת מחירים...'}
        </div>
      </div>
    );
  }

  if (rows.length < 2) return null;

  const years = rows.map(r => r.year).sort((a, b) => a - b);
  const allVals = rows.flatMap(r => [
    r.private_min ?? r.private_avg!,
    r.private_max ?? r.private_avg!,
    r.dealer_min  ?? r.dealer_avg!,
    r.dealer_max  ?? r.dealer_avg!,
  ]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const W = compact ? 320 : 380;
  const H = compact ? 130 : 150;
  const PAD = { top: 18, right: compact ? 12 : 16, bottom: 30, left: compact ? 48 : 60 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const xOf = (year: number) =>
    years.length <= 1 ? cW / 2 :
    ((year - years[0]) / (years[years.length - 1] - years[0])) * cW;
  const yOf = (v: number) => cH - ((v - minV) / range) * cH;

  const numYTicks = compact ? 3 : 4;
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const t = i / (numYTicks - 1);
    return { y: cH * (1 - t), label: fmtK(Math.round(minV + t * range), isEn) };
  });

  const step = Math.max(1, Math.ceil(years.length / (compact ? 6 : 10)));
  const xLabels = years.filter((_, i) => i % step === 0);

  // Hovered row data
  const hovRow = hoveredYear != null ? rows.find(r => r.year === hoveredYear) : null;
  const hovX = hoveredYear != null ? xOf(hoveredYear) : 0;

  // Average price gap
  const avgGapPct = Math.round(
    rows.reduce((sum, r) => sum + (r.dealer_avg! - r.private_avg!) / r.private_avg!, 0) / rows.length * 100
  );

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e3e8ee', background: '#fff', width: '100%', height: '100%' }}>
      {header(isEn)}

      <div style={{ padding: '16px 20px 12px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }} dir="ltr">
          <defs>
            <filter id="spc-shadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgba(0,0,0,0.15)" />
            </filter>
            <linearGradient id="privFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIVATE_COLOR} stopOpacity="0.18" />
              <stop offset="100%" stopColor={PRIVATE_COLOR} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Y grid + labels */}
            {yTicks.map(({ y, label }, i) => (
              <g key={i}>
                <line x1={0} x2={cW} y1={y} y2={y}
                  stroke="#eef1f5" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={compact ? 10 : 10.5} fill="#a8b5c4" fontFamily="system-ui,sans-serif">
                  {label}
                </text>
              </g>
            ))}

            {/* X labels */}
            {xLabels.map(year => (
              <text key={year} x={xOf(year)} y={cH + 20} textAnchor="middle"
                fontSize={compact ? 10 : 10.5} fill="#a8b5c4" fontFamily="system-ui,sans-serif">
                {year}
              </text>
            ))}

            {/* Fill area under private line */}
            {rows.length > 1 && (() => {
              const lastX = xOf(rows[rows.length - 1].year);
              const firstX = xOf(rows[0].year);
              const linePts = rows.map(r => `${xOf(r.year)},${yOf(r.private_avg!)}`).join(' ');
              return (
                <polygon
                  points={`${firstX},${cH} ${linePts} ${lastX},${cH}`}
                  fill="url(#privFill)"
                />
              );
            })()}

            {/* Private line */}
            <polyline
              points={rows.map(r => `${xOf(r.year)},${yOf(r.private_avg!)}`).join(' ')}
              fill="none" stroke={PRIVATE_COLOR} strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Dealer line */}
            <polyline
              points={rows.map(r => `${xOf(r.year)},${yOf(r.dealer_avg!)}`).join(' ')}
              fill="none" stroke={DEALER_COLOR} strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Dots — private */}
            {rows.map(r => (
              <circle key={`p-${r.year}`}
                cx={xOf(r.year)} cy={yOf(r.private_avg!)}
                r={hoveredYear === r.year ? 6 : 3.5}
                fill={PRIVATE_COLOR} stroke="#fff" strokeWidth={2}
                style={{ transition: 'r 0.08s' }}
              />
            ))}

            {/* Dots — dealer */}
            {rows.map(r => (
              <circle key={`d-${r.year}`}
                cx={xOf(r.year)} cy={yOf(r.dealer_avg!)}
                r={hoveredYear === r.year ? 6 : 3.5}
                fill={DEALER_COLOR} stroke="#fff" strokeWidth={2}
                style={{ transition: 'r 0.08s' }}
              />
            ))}

            {/* Mouse + touch overlay */}
            <rect x={0} y={0} width={cW} height={cH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseMove={(e) => {
                const svgEl = e.currentTarget.closest('svg') as SVGSVGElement | null;
                if (!svgEl) return;
                const rect = svgEl.getBoundingClientRect();
                const mouseX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
                const nearest = years.reduce((a, b) =>
                  Math.abs(xOf(a) - mouseX) < Math.abs(xOf(b) - mouseX) ? a : b
                );
                setHoveredYear(nearest);
              }}
              onMouseLeave={() => setHoveredYear(null)}
              onTouchMove={(e) => {
                e.preventDefault();
                const svgEl = e.currentTarget.closest('svg') as SVGSVGElement | null;
                if (!svgEl) return;
                const rect = svgEl.getBoundingClientRect();
                const touch = e.touches[0];
                const touchX = ((touch.clientX - rect.left) / rect.width) * W - PAD.left;
                const nearest = years.reduce((a, b) =>
                  Math.abs(xOf(a) - touchX) < Math.abs(xOf(b) - touchX) ? a : b
                );
                setHoveredYear(nearest);
              }}
              onTouchEnd={() => setHoveredYear(null)}
            />

            {/* Hover tooltip */}
            {hoveredYear !== null && hovRow && (() => {
              const gap = hovRow.dealer_avg! - hovRow.private_avg!;
              const gapPct = Math.round(gap / hovRow.private_avg! * 100);
              const ttW = compact ? 140 : 156;
              const ttH = 68;
              const ttXRaw = hovX < cW * 0.55 ? hovX + 12 : hovX - ttW - 12;
              const ttX = Math.max(0, Math.min(cW - ttW, ttXRaw));
              const ttY = Math.max(4, Math.min(Math.max(4, cH - ttH - 4), yOf(hovRow.private_avg!) - ttH / 2));
              return (
                <>
                  <line x1={hovX} x2={hovX} y1={0} y2={cH}
                    stroke="#a8b5c4" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none" />
                  <g pointerEvents="none" filter="url(#spc-shadow)">
                    <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={7}
                      fill="#1b2c4a" stroke="#e3e8ee" strokeWidth={1} />
                    <text x={ttX + ttW / 2} y={ttY + 15} textAnchor="middle"
                      fontSize={12} fontWeight={700} fill="#f1f5f9" fontFamily="system-ui,sans-serif" direction="ltr">
                      {hoveredYear}
                    </text>
                    {/* Private */}
                    <circle cx={ttX + 12} cy={ttY + 29} r={4} fill={PRIVATE_COLOR} />
                    <text x={ttX + 22} y={ttY + 33} fontSize={11} fontWeight={600} fill={PRIVATE_COLOR} fontFamily="system-ui,sans-serif" direction="ltr">
                      {fmtK(hovRow.private_avg!, isEn)}
                    </text>
                    {/* Dealer */}
                    <circle cx={ttX + 12} cy={ttY + 47} r={4} fill={DEALER_COLOR} />
                    <text x={ttX + 22} y={ttY + 51} fontSize={11} fontWeight={600} fill={DEALER_COLOR} fontFamily="system-ui,sans-serif" direction="ltr">
                      {fmtK(hovRow.dealer_avg!, isEn)}
                    </text>
                    {/* Gap */}
                    <text x={ttX + ttW / 2} y={ttY + 63} textAnchor="middle"
                      fontSize={10} fill="#94a3b8" fontFamily="system-ui,sans-serif" direction="ltr">
                      +{fmtK(gap, isEn)} ({gapPct}%)
                    </text>
                  </g>
                </>
              );
            })()}
          </g>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#66788c' }}>
            <div style={{ width: 14, height: 2.5, background: PRIVATE_COLOR, borderRadius: 2 }} />
            <span>{isEn ? 'Private seller' : 'מוכר פרטי'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#66788c' }}>
            <svg width={14} height={6} style={{ flexShrink: 0 }}>
              <line x1={0} y1={3} x2={14} y2={3} stroke={DEALER_COLOR} strokeWidth={2.5} strokeDasharray="5 2.5" />
            </svg>
            <span>{isEn ? 'Dealership' : 'סוכנות'}</span>
          </div>
        </div>

        {/* Summary stat */}
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: '#f8fafc', borderRadius: 9,
          fontSize: 13, color: '#4a5b6d',
        }}>
          {isEn
            ? `On average, dealers charge ~${avgGapPct}% more than private sellers`
            : `בממוצע, סוכנויות גובות ~${avgGapPct}% יותר ממוכרים פרטיים`}
        </div>
      </div>
    </div>
  );
}

function header(isEn: boolean) {
  return (
    <div style={{
      padding: '16px 18px',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
      borderBottom: '1px solid #eef1f5',
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#1c2733' }}>
        {isEn ? 'Market Value' : 'שווי שוק יד שניה'}
      </span>
      <span style={{ fontSize: 12, color: '#8595a6' }}>
        {isEn ? 'ILS · Private vs Dealer' : 'פרטי מול סוכנות'}
      </span>
    </div>
  );
}

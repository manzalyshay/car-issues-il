'use client';
import { useState, useEffect, useRef } from 'react';

interface PriceRow {
  year: number;
  price_ils: number | null;
  price_ils_min: number | null;
  price_ils_max: number | null;
  price_usd: number | null;
  price_usd_min: number | null;
  price_usd_max: number | null;
}

interface CarSpec {
  makeSlug: string;
  modelSlug: string;
  makeEn: string;
  modelEn: string;
  name: string;
  color: string;
}

interface Props {
  cars: CarSpec[];
  isEn: boolean;
  compact?: boolean;
  withCard?: string; // When set, renders its own card with this title; returns null when no data
}

function fmt(price: number, isEn: boolean) {
  if (isEn) return `$${(price / 1000).toFixed(0)}K`;
  return `₪${(price / 1000).toFixed(0)}K`;
}

function getVal(row: PriceRow, isEn: boolean) { return isEn ? row.price_usd : row.price_ils; }
function getMin(row: PriceRow, isEn: boolean) { return isEn ? row.price_usd_min : row.price_ils_min; }
function getMax(row: PriceRow, isEn: boolean) { return isEn ? row.price_usd_max : row.price_ils_max; }

const LOCALE_PARAM = (isEn: boolean) => isEn ? 'us' : 'il';

// ── Internal SVG chart (shared between inline + modal) ─────────────────────────
interface ChartSVGProps {
  series: { car: CarSpec; rows: PriceRow[] }[];
  allYears: number[];
  isEn: boolean;
  hoveredYear: number | null;
  setHoveredYear: (y: number | null) => void;
  height: number;
  compact?: boolean;
}

function ChartSVG({ series, allYears, isEn, hoveredYear, setHoveredYear, height, compact }: ChartSVGProps) {
  const allMins = series.flatMap(s => s.rows.map(r => getMin(r, isEn) ?? getVal(r, isEn))).filter((v): v is number => v != null);
  const allMaxs = series.flatMap(s => s.rows.map(r => getMax(r, isEn) ?? getVal(r, isEn))).filter((v): v is number => v != null);
  const minV = allMins.length > 0 ? Math.min(...allMins) : 0;
  const maxV = allMaxs.length > 0 ? Math.max(...allMaxs) : 1;
  const range = maxV - minV || 1;

  const W = compact ? 380 : 500;
  const H = height;
  const PAD = { top: compact ? 16 : 32, right: 20, bottom: compact ? 28 : 42, left: compact ? 46 : 68 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const xOf = (year: number) =>
    allYears.length <= 1 ? cW / 2 :
    ((year - allYears[0]) / (allYears[allYears.length - 1] - allYears[0])) * cW;
  const yOf = (v: number) => cH - ((v - minV) / range) * cH;

  const numYTicks = compact ? 3 : 5;
  const yTicks = Array.from({ length: numYTicks }, (_, i) => {
    const t = i / (numYTicks - 1);
    return { y: cH * (1 - t), label: fmt(Math.round(minV + t * range), isEn) };
  });

  const step = Math.max(1, Math.ceil(allYears.length / (compact ? 5 : 9)));
  const xLabels = allYears.filter((_, i) => i % step === 0);
  const fs = compact ? 10 : 11;

  // Build tooltip data for hovered year
  const hoveredRows = hoveredYear !== null
    ? series.map(({ car, rows }) => {
        const r = rows.find(row => row.year === hoveredYear);
        if (!r) return null;
        const avg = getVal(r, isEn);
        if (avg == null) return null;
        const lo = getMin(r, isEn);
        const hi = getMax(r, isEn);
        return { car, label: lo && hi ? `${fmt(lo, isEn)}–${fmt(hi, isEn)}` : fmt(avg, isEn), dotY: yOf(avg) };
      }).filter((x): x is NonNullable<typeof x> => x !== null)
    : [];

  const ttRowH = 18;
  const ttW = 148;
  const ttH = 28 + hoveredRows.length * ttRowH + 6;
  const hovX = hoveredYear != null ? xOf(hoveredYear) : 0;
  const ttXRaw = hovX < cW * 0.55 ? hovX + 10 : hovX - ttW - 10;
  const ttX = Math.max(0, Math.min(cW - ttW, ttXRaw));
  const refY = hoveredRows[0]?.dotY ?? cH / 2;
  const ttY = Math.max(4, Math.min(cH - ttH - 4, refY - ttH / 2));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }} dir="ltr">
      <defs>
        <filter id="pch-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="rgba(0,0,0,0.55)" />
        </filter>
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {/* Subtle chart background */}
        <rect x={0} y={0} width={cW} height={cH} fill="rgba(255,255,255,0.018)" rx={3} />

        {/* Y axis grid lines + labels */}
        {yTicks.map(({ y, label }, i) => (
          <g key={i}>
            <line x1={0} x2={cW} y1={y} y2={y}
              stroke="var(--border)"
              strokeWidth={i === 0 ? 1 : 0.5}
              strokeDasharray={i === 0 ? undefined : '4 3'}
            />
            <text x={-10} y={y + 4} textAnchor="end" fontSize={fs} fill="var(--text-muted)"
              fontFamily="system-ui,sans-serif">
              {label}
            </text>
          </g>
        ))}

        {/* X axis year labels */}
        {xLabels.map(year => (
          <text key={year} x={xOf(year)} y={cH + (compact ? 18 : 24)}
            textAnchor="middle" fontSize={fs} fill="var(--text-muted)" fontFamily="system-ui,sans-serif">
            {year}
          </text>
        ))}

        {/* Per-car: shaded min-max band + avg line + data dots */}
        {series.map(({ car, rows }) => {
          if (!rows.length) return null;
          const bandPts = [
            ...rows.map(r => `${xOf(r.year)},${yOf(getMin(r, isEn) ?? getVal(r, isEn)!)}`),
            ...[...rows].reverse().map(r => `${xOf(r.year)},${yOf(getMax(r, isEn) ?? getVal(r, isEn)!)}`),
          ].join(' ');
          const avgPts = rows.map(r => `${xOf(r.year)},${yOf(getVal(r, isEn)!)}`).join(' ');
          return (
            <g key={car.makeSlug + car.modelSlug}>
              <polygon points={bandPts} fill={car.color} fillOpacity={0.13} />
              <polyline points={avgPts} fill="none" stroke={car.color}
                strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {rows.map(r => (
                <circle key={r.year}
                  cx={xOf(r.year)} cy={yOf(getVal(r, isEn)!)}
                  r={hoveredYear === r.year ? 6 : 3.5}
                  fill={car.color} stroke="var(--surface)" strokeWidth={2}
                  style={{ transition: 'r 0.08s' }}
                />
              ))}
            </g>
          );
        })}

        {/* Transparent overlay for nearest-year detection on mouse and touch */}
        <rect x={0} y={0} width={cW} height={cH}
          fill="transparent" style={{ cursor: 'crosshair' }}
          onMouseMove={(e) => {
            const svgEl = e.currentTarget.closest('svg') as SVGSVGElement | null;
            if (!svgEl) return;
            const rect = svgEl.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
            const nearest = allYears.reduce((a, b) =>
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
            const nearest = allYears.reduce((a, b) =>
              Math.abs(xOf(a) - touchX) < Math.abs(xOf(b) - touchX) ? a : b
            );
            setHoveredYear(nearest);
          }}
          onTouchEnd={() => setHoveredYear(null)}
        />

        {/* Hover crosshair + tooltip box */}
        {hoveredYear !== null && hoveredRows.length > 0 && (
          <>
            <line x1={hovX} x2={hovX} y1={0} y2={cH}
              stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none"
            />
            <g pointerEvents="none" filter="url(#pch-shadow)">
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={7}
                fill="#1a2540" stroke="var(--border)" strokeWidth={1}
              />
              <text x={ttX + ttW / 2} y={ttY + 17} textAnchor="middle"
                fontSize={12} fontWeight={700} fill="#f1f5f9" fontFamily="system-ui,sans-serif" direction="ltr">
                {hoveredYear}
              </text>
              {hoveredRows.map((row, i) => (
                <g key={row.car.makeSlug}>
                  <circle cx={ttX + 13} cy={ttY + 32 + i * ttRowH} r={4} fill={row.car.color} />
                  <text x={ttX + 24} y={ttY + 37 + i * ttRowH}
                    fontSize={11} fontWeight={600} fill="#f1f5f9" fontFamily="system-ui,sans-serif" direction="ltr">
                    {row.label}
                  </text>
                </g>
              ))}
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

// ── Main exported component ────────────────────────────────────────────────────
export default function PriceHistoryChart({ cars, isEn, compact, withCard }: Props) {
  const [series, setSeries] = useState<{ car: CarSpec; rows: PriceRow[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Zoom/pan state for the modal (transform with origin 0,0)
  const [panState, setPanState] = useState({ scale: 1, x: 0, y: 0 });
  const panRef = useRef(panState);
  useEffect(() => { panRef.current = panState; }, [panState]);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mx: number; my: number; sx: number; sy: number } | null>(null);
  const isDragging = useRef(false);

  // Fetch price history
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      cars.map(car =>
        fetch(`/api/price-history?make=${car.makeSlug}&model=${car.modelSlug}&makeEn=${encodeURIComponent(car.makeEn)}&modelEn=${encodeURIComponent(car.modelEn)}&locale=${LOCALE_PARAM(isEn)}`)
          .then(r => r.json())
          .then((d: { points: PriceRow[] }) => ({
            car,
            rows: (d.points ?? []).filter(p => getVal(p, isEn) != null),
          }))
          .catch(() => ({ car, rows: [] as PriceRow[] })),
      ),
    ).then(results => {
      if (!cancelled) { setSeries(results); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [cars.map(c => c.makeSlug + c.modelSlug).join(','), isEn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when modal open
  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  // Escape key closes modal
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setExpanded(false); setPanState({ scale: 1, x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded]);

  // Attach native wheel listener with passive:false so we can preventDefault
  useEffect(() => {
    const el = zoomContainerRef.current;
    if (!el || !expanded) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      setPanState(prev => {
        const newScale = Math.min(5, Math.max(1, prev.scale * factor));
        if (newScale === prev.scale) return prev;
        // Zoom toward cursor
        const contentX = (cursorX - prev.x) / prev.scale;
        const contentY = (cursorY - prev.y) / prev.scale;
        let nx = cursorX - contentX * newScale;
        let ny = cursorY - contentY * newScale;
        nx = Math.min(0, Math.max(rect.width * (1 - newScale), nx));
        ny = Math.min(0, Math.max(rect.height * (1 - newScale), ny));
        return { scale: newScale, x: nx, y: ny };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [expanded]);

  const resetZoom = () => setPanState({ scale: 1, x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panRef.current.scale <= 1) return;
    e.preventDefault();
    isDragging.current = true;
    dragRef.current = { mx: e.clientX, my: e.clientY, sx: panRef.current.x, sy: panRef.current.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.mx;
    const dy = e.clientY - dragRef.current.my;
    const rect = zoomContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { scale } = panRef.current;
    setPanState(prev => ({
      ...prev,
      x: Math.min(0, Math.max(rect.width * (1 - scale), dragRef.current!.sx + dx)),
      y: Math.min(0, Math.max(rect.height * (1 - scale), dragRef.current!.sy + dy)),
    }));
  };
  const handleMouseUp = () => { isDragging.current = false; dragRef.current = null; };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    const msg = (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '32px 0' }}>
        {isEn ? 'Loading market prices...' : 'טוען נתוני שוק...'}
      </div>
    );
    if (withCard) return (
      <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>💰</span>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>{withCard}</h2>
        </div>
        <div style={{ padding: '16px 20px 12px' }}>{msg}</div>
      </div>
    );
    return msg;
  }

  const allYears = Array.from(new Set(series.flatMap(s => s.rows.map(r => r.year)))).sort((a, b) => a - b);
  const hasData = series.every(s => s.rows.length > 0) && allYears.length > 1;

  if (!hasData) {
    if (withCard) return null;
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '32px 0' }}>
        {isEn ? 'No pricing data available yet.' : 'אין נתוני מחיר זמינים עדיין.'}
      </div>
    );
  }

  // ── Shared sub-elements ──────────────────────────────────────────────────────
  const legend = cars.length > 1 && (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
      {cars.map(car => (
        <div key={car.makeSlug} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div style={{ width: 22, height: 3, background: car.color, borderRadius: 2, flexShrink: 0 }} />
          <span>{car.name}</span>
        </div>
      ))}
    </div>
  );

  const sourceNote = (
    <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8 }}>
      {isEn
        ? 'Average used car market value per model year'
        : 'שווי שוק ממוצע יד שניה לפי שנת ייצור'}
    </div>
  );

  const expandBtn = (
    <button
      onClick={() => setExpanded(true)}
      title={isEn ? 'Expand chart' : 'הגדל תרשים'}
      style={{
        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 6, color: '#cbd5e1', cursor: 'pointer',
        padding: '3px 8px', fontSize: '0.78rem', lineHeight: 1.5,
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}
    >
      ⤢
    </button>
  );

  // ── Fullscreen modal ─────────────────────────────────────────────────────────
  const modal = expanded && (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) { setExpanded(false); resetZoom(); } }}
    >
      <div style={{
        width: '100%', maxWidth: 920,
        background: 'var(--surface, #0f172a)',
        borderRadius: 16, border: '1px solid var(--border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>💰</span>
          <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', flex: 1 }}>
            {withCard ?? (isEn ? 'Price History' : 'היסטוריית מחירים')}
          </span>
          {panState.scale > 1 && (
            <button onClick={resetZoom} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6, color: '#94a3b8', cursor: 'pointer', padding: '3px 10px', fontSize: '0.75rem',
            }}>
              {isEn ? 'Reset zoom' : 'אפס זום'}
            </button>
          )}
          <span style={{ color: '#475569', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
            {isEn ? 'Scroll to zoom · Drag to pan · Esc' : 'גלגל לזום · גרור להזזה · Esc'}
          </span>
          <button
            onClick={() => { setExpanded(false); resetZoom(); }}
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1, padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>

        {/* Zoom / pan area */}
        <div
          ref={zoomContainerRef}
          style={{
            overflow: 'hidden',
            cursor: panState.scale > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
            padding: '20px 24px 8px',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div style={{
            transform: `translate(${panState.x}px, ${panState.y}px) scale(${panState.scale})`,
            transformOrigin: '0 0',
          }}>
            <ChartSVG
              series={series} allYears={allYears} isEn={isEn}
              hoveredYear={hoveredYear} setHoveredYear={setHoveredYear}
              height={380}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 16px' }}>
          {legend}
          {sourceNote}
        </div>
      </div>
    </div>
  );

  // ── Inline chart ─────────────────────────────────────────────────────────────
  const chartContent = (
    <>
      <ChartSVG
        series={series} allYears={allYears} isEn={isEn}
        hoveredYear={hoveredYear} setHoveredYear={setHoveredYear}
        height={compact ? 160 : 260}
        compact={compact}
      />
      {legend}
      {!compact && sourceNote}
    </>
  );

  if (withCard) {
    return (
      <>
        {modal}
        <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>💰</span>
            <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem', flex: 1 }}>{withCard}</h2>
            {expandBtn}
          </div>
          <div style={{ padding: '16px 20px 12px' }}>{chartContent}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {modal}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, insetInlineEnd: 0, zIndex: 1 }}>
          {expandBtn}
        </div>
        {chartContent}
      </div>
    </>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import type { Recall } from '@/app/api/recalls/route';
import { ilRecallYears } from '@/lib/recallYears';

interface Props {
  makeEn: string;
  modelEn: string;
  years?: number[];
  isEn: boolean;
}

const IL_COLOR = '#2563eb';
const US_COLOR = '#f97316';

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
    const params = new URLSearchParams({ make: makeEn, model: modelEn, locale: isEn ? 'en' : 'he' });
    // Hebrew site: add the Israeli notices (data.gov.il) to the US ones
    if (!isEn) params.set('il', '1');
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
      <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e4e9f2', background: '#fff', width: '100%', height: '100%' }}>
        {header(isEn)}
        <div style={{ textAlign: 'center', color: '#5b6a86', fontSize: '0.875rem', padding: '32px 20px' }}>
          {isEn ? 'Loading recall data...' : 'טוען נתוני ריקולים...'}
        </div>
      </div>
    );
  }

  // Group by model year, US and Israeli notices counted separately
  const covered = years?.length ? years : [];
  const usByYear = new Map<number, number>();
  const ilByYear = new Map<number, number>();
  let ilTotal = 0;
  let usTotal = 0;
  let ilUnplaced = 0;
  for (const r of recalls) {
    if (r.source === 'il') {
      ilTotal++;
      const ys = ilRecallYears(r, covered);
      if (ys.length === 0) ilUnplaced++;
      for (const y of ys) ilByYear.set(y, (ilByYear.get(y) ?? 0) + 1);
    } else if (r.year) {
      usTotal++;
      usByYear.set(r.year, (usByYear.get(r.year) ?? 0) + 1);
    }
  }
  const hasIl = ilByYear.size > 0;
  const countByYear = new Map<number, number>();
  for (const [y, n] of usByYear) countByYear.set(y, n);
  for (const [y, n] of ilByYear) countByYear.set(y, (countByYear.get(y) ?? 0) + n);

  if (countByYear.size === 0) return null;

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
    <div ref={containerRef} style={{ overflow: 'hidden', borderRadius: 16, border: '1px solid #e4e9f2', background: '#fff', width: '100%', height: '100%' }}>
      {header(isEn, hasIl)}

      <div style={{ padding: '16px 20px 12px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible', direction: 'ltr' }}>
          <defs>
            <filter id="rbc-shadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgba(0,0,0,0.12)" />
            </filter>
          </defs>
          <g transform={`translate(${PAD.left},${PAD.top})`}>
            {/* Y grid + labels */}
            {yTicks.map(({ y, label }, i) => (
              <g key={i}>
                <line x1={0} x2={cW} y1={y} y2={y}
                  stroke="#eef2f9" strokeWidth={1} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={compact ? 9 : 10} fill="#a8b5c4" fontFamily="system-ui,sans-serif">
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
              const color = hasIl ? 'var(--text)' : barColor(count);
              const ilH = hasIl ? ((ilByYear.get(year) ?? 0) / (maxCount || 1)) * cH : 0;
              return (
                <g key={year} opacity={hoveredYear !== null && !isHovered ? 0.4 : 1} style={{ transition: 'opacity 0.1s' }}>
                  {hasIl ? (
                    <>
                      {/* US on top, Israel at the base */}
                      {bH - ilH > 0 && <rect x={x} y={y} width={barW} height={bH - ilH} fill={US_COLOR} rx={3} />}
                      {ilH > 0 && <rect x={x} y={cH - ilH} width={barW} height={ilH} fill={IL_COLOR} rx={3} />}
                    </>
                  ) : (
                    <rect x={x} y={y} width={barW} height={bH} fill={color} rx={3} />
                  )}
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

            {/* X labels - every year, rotated to avoid overlap */}
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
              const ttW = hasIl ? 120 : 90;
              const ttH = hasIl ? 62 : 44;
              const ttX = Math.max(0, Math.min(cW - ttW, bx - ttW / 2));
              const ttY = Math.max(4, yOf(count) - ttH - 6);
              return (
                <g pointerEvents="none" filter="url(#rbc-shadow)">
                  <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={7}
                    fill="#1b2c4a" stroke="#e4e9f2" strokeWidth={1} />
                  <text x={ttX + ttW / 2} y={ttY + 15} textAnchor="middle"
                    fontSize={12} fontWeight={700} fill="#f1f5f9" fontFamily="system-ui,sans-serif">
                    {hoveredYear}
                  </text>
                  {hasIl ? (
                    <>
                      <text x={ttX + ttW / 2} y={ttY + 33} textAnchor="middle" fontSize={11} fill="#93c5fd" fontWeight={700} fontFamily="system-ui,sans-serif">
                        {`ישראל: ${ilByYear.get(hoveredYear) ?? 0}`}
                      </text>
                      <text x={ttX + ttW / 2} y={ttY + 50} textAnchor="middle" fontSize={11} fill="#fdba74" fontWeight={700} fontFamily="system-ui,sans-serif">
                        {`ארה״ב: ${usByYear.get(hoveredYear) ?? 0}`}
                      </text>
                    </>
                  ) : (
                    <text x={ttX + ttW / 2} y={ttY + 33} textAnchor="middle"
                      fontSize={11} fill={barColor(count)} fontWeight={700} fontFamily="system-ui,sans-serif">
                      {count} {isEn ? (count === 1 ? 'recall' : 'recalls') : count === 1 ? 'ריקול' : 'ריקולים'}
                    </text>
                  )}
                </g>
              );
            })()}
          </g>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 11.5, color: '#5b6a86' }}>
          {(hasIl ? [
            { color: IL_COLOR, label: 'ישראל (משרד התחבורה)' },
            { color: US_COLOR, label: 'ארה״ב (NHTSA)' },
          ] : [
            { color: '#f59e0b', label: isEn ? '1–2 recalls' : '1–2 ריקולים' },
            { color: '#f97316', label: isEn ? '3–4' : '3–4' },
            { color: '#dc2626', label: isEn ? '5+' : '5+' },
          ]).map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, background: color, borderRadius: 3 }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: '#fdf6ee', borderRadius: 9,
          fontSize: 13, color: '#41506c',
        }}>
          {isEn
            ? `${totalRecalls} total recall${totalRecalls !== 1 ? 's' : ''} · most in ${worstYear} (${countByYear.get(worstYear)})`
            : hasIl || ilTotal > 0
              ? `${ilTotal} קריאות שירות בישראל ו-${usTotal} בארה״ב · שנת הדגם עם הכי הרבה: ${worstYear} (${countByYear.get(worstYear)})`
              : `סה"כ ${totalRecalls === 1 ? 'ריקול אחד' : `${totalRecalls} ריקולים`} · שנה עם הכי הרבה: ${worstYear} (${countByYear.get(worstYear)})`}
          {!isEn && hasIl && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#5b6a86', lineHeight: 1.5 }}>
              קריאת שירות ישראלית נספרת בכל שנת דגם שבטווח הייצור שלה, ולכן אותה קריאה יכולה להופיע בכמה שנים.
              {ilUnplaced > 0 ? ` ${ilUnplaced === 1 ? 'קריאה אחת' : `${ilUnplaced} קריאות`} עם טווח ייצור רחב או לא ידוע לא מוצגות בגרף.` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function header(isEn: boolean, withIl = false) {
  return (
    <div style={{
      padding: '16px 18px',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
      borderBottom: '1px solid #eef2f9',
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#0d1b2f' }}>
        {isEn ? 'Recalls by Model Year' : 'ריקולים לפי שנת דגם'}
      </span>
      <span style={{ fontSize: 12, color: '#5b6a86' }}>{isEn ? 'US' : withIl ? 'ישראל וארה״ב' : 'ארה״ב'}</span>
    </div>
  );
}

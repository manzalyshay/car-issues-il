'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Recall } from '@/app/api/recalls/route';
import { useLocale } from '@/lib/localeContext';
import CarDiagramRecalls from '@/components/CarDiagramRecalls';

interface Props {
  makeEn: string;
  modelEn: string;
  year?: number;
  years?: number[]; // all model years to query
}

export default function RecallsSection({ makeEn, modelEn, year, years }: Props) {
  const { t, locale } = useLocale();
  const rc = t.recalls;
  const isHe = locale === 'he';

  const [recalls, setRecalls]     = useState<Recall[]>([]);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ make: makeEn, model: modelEn, locale });
    if (year) params.set('year', String(year));
    else if (years?.length) params.set('years', years.join(','));
    fetch(`/api/recalls?${params}`)
      .then(r => r.json())
      .then(d => setRecalls(d.recalls ?? []))
      .catch(() => setRecalls([]))
      .finally(() => setLoading(false));
  }, [makeEn, modelEn, year, locale]);

  // Collect unique years for the filter
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    for (const r of recalls) { if (r.year) ys.add(r.year); }
    return Array.from(ys).sort((a, b) => b - a);
  }, [recalls]);

  const filtered = useMemo(() =>
    filterYear === 'all' ? recalls : recalls.filter(r => r.year === filterYear),
  [recalls, filterYear]);

  // Group by component for the summary stat
  const componentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of recalls) {
      const k = r.component || 'Other';
      map[k] = (map[k] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [recalls]);

  return (
    <div id="recalls" style={{ marginBottom: 48 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: loading ? 24 : recalls.length > 0 ? 20 : 24, flexWrap: 'wrap' }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: '#dc2626', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{rc.title}</h2>
        {!loading && recalls.length > 0 && (
          <span style={{
            fontSize: '0.75rem', color: '#fff',
            background: '#dc2626', padding: '2px 10px', borderRadius: 999,
            fontWeight: 700,
          }}>
            {recalls.length}
          </span>
        )}
        {!loading && recalls.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {rc.source}
          </span>
        )}
        {!loading && recalls.length > 0 && (
          <a
            href={`/embed?make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}${year ? `&year=${year}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0, marginInlineStart: 'auto' }}
          >
            {isHe ? '‹/› הטמע' : '‹/› Embed'}
          </a>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 80, borderRadius: 12, background: 'var(--bg-muted)',
              animation: 'recalls-pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 24px',
          background: 'var(--bg-muted)', borderRadius: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>✅</div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            {year || filterYear !== 'all'
              ? `${rc.noneForYear} ${year ?? filterYear}`
              : rc.noneFound}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {isHe ? 'אין ריקולים רשומים במאגר הריקולים בארה״ב (NHTSA).' : 'No recalls on record in the NHTSA database.'}
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Summary bar */}
          {recalls.length > 1 && componentCounts.length > 0 && filterYear === 'all' && (
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.05em', alignSelf: 'center', marginInlineEnd: 4 }}>
                {isHe ? 'מרוכזים ב:' : 'Top areas:'}
              </span>
              {componentCounts.map(([comp, cnt]) => (
                <span key={comp} style={{
                  fontSize: '0.75rem', padding: '3px 10px', borderRadius: 999,
                  background: '#fff', border: '1px solid rgba(220,38,38,0.2)', color: '#7f1d1d', fontWeight: 600,
                }}>
                  {comp} <span style={{ opacity: 0.6 }}>×{cnt}</span>
                </span>
              ))}
            </div>
          )}

          {/* Interactive car diagram */}
          <CarDiagramRecalls recalls={recalls} />

          {/* Year filter tabs */}
          {!year && availableYears.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, marginTop: 16 }}>
              <button
                onClick={() => setFilterYear('all')}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600,
                  background: filterYear === 'all' ? '#dc2626' : 'var(--bg-muted)',
                  color: filterYear === 'all' ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {rc.allYears}
              </button>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setFilterYear(y)}
                  style={{
                    height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600,
                    background: filterYear === y ? '#dc2626' : 'var(--bg-muted)',
                    color: filterYear === y ? '#fff' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Recall cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  borderRadius: 12, border: '1px solid var(--border)',
                  background: '#fff', overflow: 'hidden',
                  boxShadow: expanded === r.id ? '0 4px 16px rgba(0,0,0,0.07)' : 'none',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {/* Card header */}
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  {/* Index badge */}
                  <span style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800, marginTop: 1,
                  }}>
                    {idx + 1}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                      {r.year && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700,
                          background: 'var(--bg-muted)', color: 'var(--text-muted)',
                          padding: '1px 7px', borderRadius: 4,
                        }}>
                          {r.year}
                        </span>
                      )}
                      {r.date && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.date}</span>
                      )}
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.5 }}>
                        #{r.id}
                      </span>
                    </div>

                    {/* Component title */}
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.35, marginBottom: 4, color: 'var(--text)' }}>
                      {r.component || rc.component}
                    </div>

                    {/* Summary preview */}
                    {r.summary && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {expanded === r.id ? null : (r.summary.length > 120 ? r.summary.slice(0, 120) + '…' : r.summary)}
                      </div>
                    )}
                  </div>

                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0, paddingTop: 6, transition: 'transform 0.2s', transform: expanded === r.id ? 'rotate(180deg)' : 'none' }}>
                    ▼
                  </span>
                </div>

                {/* Expanded detail */}
                {expanded === r.id && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    background: 'var(--bg-muted)',
                  }}>
                    {r.summary && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {rc.descLabel}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.summary}</p>
                      </div>
                    )}
                    {r.consequence && (
                      <div style={{ borderInlineStart: '3px solid #dc2626', paddingInlineStart: 10 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {rc.riskLabel}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.consequence}</p>
                      </div>
                    )}
                    {r.remedy && (
                      <div style={{ borderInlineStart: '3px solid #16a34a', paddingInlineStart: 10 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {rc.fixLabel}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.remedy}</p>
                      </div>
                    )}
                    <a
                      href={`https://www.nhtsa.gov/vehicle-safety/recalls#${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      {rc.moreDetails} →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes recalls-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

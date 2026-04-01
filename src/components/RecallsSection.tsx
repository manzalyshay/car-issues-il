'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Recall } from '@/app/api/recalls/route';

interface Props {
  makeEn: string;
  modelEn: string;
  year?: number;
  years?: number[]; // all model years to query
}

export default function RecallsSection({ makeEn, modelEn, year, years }: Props) {
  const [recalls, setRecalls]     = useState<Recall[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ make: makeEn, model: modelEn });
    if (year) params.set('year', String(year));
    else if (years?.length) params.set('years', years.join(','));
    fetch(`/api/recalls?${params}`)
      .then(r => r.json())
      .then(d => setRecalls(d.recalls ?? []))
      .catch(() => setRecalls([]))
      .finally(() => setLoading(false));
  }, [makeEn, modelEn, year]);

  // Collect unique years for the filter
  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    for (const r of recalls) { if (r.year) ys.add(r.year); }
    return Array.from(ys).sort((a, b) => b - a);
  }, [recalls]);

  const filtered = useMemo(() =>
    filterYear === 'all' ? recalls : recalls.filter(r => r.year === filterYear),
  [recalls, filterYear]);

  return (
    <div id="recalls" style={{ marginBottom: 48 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--brand-red)', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>ריקולים וקריאות חזרה</h2>
        {!loading && recalls.length > 0 && (
          <span style={{
            fontSize: '0.75rem', color: 'var(--text-muted)',
            background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999,
          }}>
            {recalls.length}
          </span>
        )}
        {!loading && recalls.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
            מקור: NHTSA
          </span>
        )}
      </div>

      {/* Year filter tabs — only when we have multiple years */}
      {!loading && !year && availableYears.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            onClick={() => setFilterYear('all')}
            style={{
              height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600,
              background: filterYear === 'all' ? 'var(--brand-red)' : 'var(--bg-muted)',
              color: filterYear === 'all' ? '#fff' : 'var(--text-secondary)',
              border: 'none', cursor: 'pointer',
            }}
          >
            כל השנים
          </button>
          {availableYears.map(y => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              style={{
                height: 30, padding: '0 14px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600,
                background: filterYear === y ? 'var(--brand-red)' : 'var(--bg-muted)',
                color: filterYear === y ? '#fff' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔍</div>
          טוען ריקולים...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ margin: 0 }}>
            לא נמצאו ריקולים{year ? ` לשנת ${year}` : filterYear !== 'all' ? ` לשנת ${filterYear}` : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => (
            <div key={r.id} className="card" style={{ padding: '16px 20px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div style={{ flex: 1 }}>
                  {/* Badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    {r.year && (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        background: 'var(--bg-muted)', color: 'var(--text-secondary)',
                        padding: '2px 8px', borderRadius: 4,
                      }}>
                        {r.year}
                      </span>
                    )}
                    {r.date && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date}</span>
                    )}
                    <span style={{
                      fontSize: '0.65rem', color: 'var(--text-muted)',
                      fontFamily: 'monospace', opacity: 0.6,
                    }}>
                      #{r.id}
                    </span>
                  </div>

                  {/* Component = title */}
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 4, lineHeight: 1.4 }}>
                    {r.component || 'ריקול'}
                  </div>

                  {/* Summary preview */}
                  {r.summary && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {r.summary.length > 140 ? r.summary.slice(0, 140) + '...' : r.summary}
                    </div>
                  )}
                </div>

                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', flexShrink: 0, paddingTop: 2 }}>
                  {expanded === r.id ? '▲' : '▼'}
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === r.id && (
                <div style={{
                  marginTop: 16, borderTop: '1px solid var(--border)',
                  paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  {r.summary && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        תיאור הבעיה
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.summary}</p>
                    </div>
                  )}
                  {r.consequence && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        סכנה אפשרית
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.consequence}</p>
                    </div>
                  )}
                  {r.remedy && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        פתרון / תיקון
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{r.remedy}</p>
                    </div>
                  )}
                  <a
                    href={`https://www.nhtsa.gov/vehicle-safety/recalls#${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8125rem', color: 'var(--brand-red)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    פרטים נוספים באתר NHTSA ←
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

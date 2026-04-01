'use client';

import { useState, useEffect } from 'react';
import type { Recall } from '@/app/api/recalls/route';

interface Props {
  makeEn: string;
  modelEn: string;
  year?: number;
}

export default function RecallsSection({ makeEn, modelEn, year }: Props) {
  const [recalls, setRecalls]   = useState<Recall[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ make: makeEn, model: modelEn });
    if (year) params.set('year', String(year));
    fetch(`/api/recalls?${params}`)
      .then(r => r.json())
      .then(d => setRecalls(d.recalls ?? []))
      .catch(() => setRecalls([]))
      .finally(() => setLoading(false));
  }, [makeEn, modelEn, year]);

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--brand-red)', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>ריקולים וקריאות חזרה</h2>
        {!loading && recalls.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999 }}>
            {recalls.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>טוען...</div>
      ) : recalls.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <p style={{ margin: 0 }}>לא נמצאו ריקולים{year ? ` לשנת ${year}` : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recalls.map(r => (
            <div key={r.id} className="card" style={{ padding: '16px 20px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(220,38,38,0.1)', color: '#dc2626', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>
                      NHTSA {r.id}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 2 }}>{r.component}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {r.summary.slice(0, 160)}{r.summary.length > 160 ? '...' : ''}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}>
                  {expanded === r.id ? '▲' : '▼'}
                </span>
              </div>

              {expanded === r.id && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>תיאור הבעיה</div>
                    <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{r.summary}</p>
                  </div>
                  {r.consequence && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>סכנה אפשרית</div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{r.consequence}</p>
                    </div>
                  )}
                  {r.remedy && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>פתרון / תיקון</div>
                      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{r.remedy}</p>
                    </div>
                  )}
                  <a
                    href={`https://www.nhtsa.gov/vehicle-safety/recalls#${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8125rem', color: 'var(--brand-red)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    מידע נוסף ב-NHTSA →
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

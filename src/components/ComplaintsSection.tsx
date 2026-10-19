'use client';

import { useState, useEffect } from 'react';
import type { NHTSAComplaint } from '@/app/api/complaints/route';
import { useLocale } from '@/lib/localeContext';

interface Props {
  makeEn: string;
  modelEn: string;
  years?: number[];
}

// Component name mapping — NHTSA uses ALL CAPS strings
const COMPONENT_MAP: Record<string, { he: string; en: string; emoji: string }> = {
  'ELECTRICAL SYSTEM':           { he: 'מערכת חשמל',       en: 'Electrical',        emoji: '⚡' },
  'POWER TRAIN':                 { he: 'מערכת הנעה',       en: 'Powertrain',        emoji: '⚙️' },
  'ENGINE':                      { he: 'מנוע',              en: 'Engine',            emoji: '🔧' },
  'FUEL/PROPULSION SYSTEM':      { he: 'מערכת דלק',        en: 'Propulsion',        emoji: '⛽' },
  'SERVICE BRAKES':              { he: 'בלמים',             en: 'Brakes',            emoji: '🛑' },
  'FORWARD COLLISION AVOIDANCE': { he: 'מניעת התנגשות',    en: 'Collision Avoid.',  emoji: '🚨' },
  'VEHICLE SPEED CONTROL':       { he: 'בקרת מהירות',      en: 'Speed Control',     emoji: '🏎️' },
  'STEERING':                    { he: 'היגוי',             en: 'Steering',          emoji: '🔄' },
  'AIR BAGS':                    { he: 'כריות אוויר',      en: 'Air Bags',          emoji: '💨' },
  'SEAT BELTS':                  { he: 'חגורות בטיחות',    en: 'Seat Belts',        emoji: '🪢' },
  'SUSPENSION':                  { he: 'מתלים',             en: 'Suspension',        emoji: '🔩' },
  'TIRES':                       { he: 'צמיגים',            en: 'Tires',             emoji: '🛞' },
  'STRUCTURE':                   { he: 'מבנה',              en: 'Structure',         emoji: '🏗️' },
  'SEATS':                       { he: 'מושבים',            en: 'Seats',             emoji: '💺' },
  'EXTERIOR LIGHTING':           { he: 'תאורה חיצונית',    en: 'Lighting',          emoji: '💡' },
  'BACK OVER PREVENTION':        { he: 'מערכת גיבוי',      en: 'Back-Up System',    emoji: '📷' },
  'VISIBILITY':                  { he: 'ראות',              en: 'Visibility',        emoji: '👁️' },
  'UNKNOWN OR OTHER':            { he: 'אחר',               en: 'Other',             emoji: '❓' },
};

function getComponentLabel(raw: string, locale: 'he' | 'en') {
  const key = raw.trim().toUpperCase();
  const entry = COMPONENT_MAP[key];
  if (entry) return { label: locale === 'he' ? entry.he : entry.en, emoji: entry.emoji };
  // Fallback: title-case the raw string
  const label = raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  return { label, emoji: '⚠️' };
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  return dateStr;
}

export default function ComplaintsSection({ makeEn, modelEn, years }: Props) {
  const { t, locale } = useLocale();
  const cc = t.complaints;
  const requestKey = `${makeEn}|${modelEn}|${years?.slice(0, 6).join(',') ?? ''}`;
  const [result, setResult] = useState<{
    key: string;
    complaints: NHTSAComplaint[];
    available: boolean;
  } | null>(null);
  const loading = Boolean(years?.length && result?.key !== requestKey);
  const complaints = result?.key === requestKey ? result.complaints : null;
  const available = result?.key === requestKey ? result.available : true;
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!years?.length) return;
    let cancelled = false;
    const recentYears = years.slice(0, 6).join(',');
    fetch(`/api/complaints?make=${encodeURIComponent(makeEn)}&model=${encodeURIComponent(modelEn)}&years=${recentYears}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setResult({ key: requestKey, complaints: d.complaints ?? [], available: d.available !== false });
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, complaints: [], available: true });
      });
    return () => { cancelled = true; };
  }, [makeEn, modelEn, requestKey]);

  // Component breakdown counts
  const componentCounts: Record<string, number> = {};
  if (complaints) {
    for (const c of complaints) {
      for (const comp of c.components.split(',')) {
        const key = comp.trim().toUpperCase();
        componentCounts[key] = (componentCounts[key] ?? 0) + 1;
      }
    }
  }
  const sortedComponents = Object.entries(componentCounts)
    .sort((a, b) => b[1] - a[1]);

  const crashes = complaints?.filter(c => c.crash).length ?? 0;
  const fires = complaints?.filter(c => c.fire).length ?? 0;
  const injuries = complaints?.reduce((s, c) => s + c.numberOfInjuries, 0) ?? 0;

  const visibleComplaints = showAll ? (complaints ?? []) : (complaints ?? []).slice(0, 5);

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: '#ef4444', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{cc.title}</h2>
        {!loading && complaints !== null && complaints.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999 }}>
            {complaints.length} {cc.total}
          </span>
        )}
        {!loading && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cc.source}</span>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔍</div>
          {cc.loading}
        </div>
      ) : !available || complaints === null || complaints.length === 0 ? (
        null
      ) : (
        <>
          {/* Component breakdown */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {cc.byComponent}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sortedComponents.map(([comp, count]) => {
                const { label, emoji } = getComponentLabel(comp, locale as 'he' | 'en');
                return (
                  <span key={comp} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg-muted)', border: '1px solid var(--border)',
                    borderRadius: 999, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600,
                  }}>
                    <span>{emoji}</span>
                    <span>{label}</span>
                    <span style={{
                      background: 'var(--accent)', color: '#fff',
                      borderRadius: 999, padding: '0 5px', fontSize: '0.7rem', fontWeight: 700,
                    }}>{count}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Safety flags */}
          {(crashes > 0 || fires > 0 || injuries > 0) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {crashes > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#dc2626' }}>
                  💥 {crashes} {cc.crash}
                </span>
              )}
              {fires > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#ea580c' }}>
                  🔥 {fires} {cc.fire}
                </span>
              )}
              {injuries > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#ca8a04' }}>
                  🤕 {injuries} {cc.injury}
                </span>
              )}
            </div>
          )}

          {/* Complaint list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleComplaints.map(c => {
              const compLabels = c.components.split(',')
                .map(raw => getComponentLabel(raw.trim().toUpperCase(), locale as 'he' | 'en'));
              const year = c.products[0]?.productYear ?? '';
              const isOpen = expanded === c.odiNumber;
              return (
                <div key={c.odiNumber} className="card" style={{ padding: '14px 18px' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
                    onClick={() => setExpanded(isOpen ? null : c.odiNumber)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Badges row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        {year && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-muted)', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 4 }}>
                            {year}
                          </span>
                        )}
                        {c.crash && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '2px 7px', borderRadius: 4 }}>💥 {cc.crash}</span>}
                        {c.fire && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(249,115,22,0.1)', color: '#ea580c', padding: '2px 7px', borderRadius: 4 }}>🔥 {cc.fire}</span>}
                        {c.numberOfInjuries > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(234,179,8,0.1)', color: '#ca8a04', padding: '2px 7px', borderRadius: 4 }}>🤕 {cc.injury}</span>}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatDate(c.dateComplaintFiled)}</span>
                      </div>

                      {/* Component labels as title */}
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, lineHeight: 1.4 }}>
                        {compLabels.map(({ emoji, label }) => `${emoji} ${label}`).join(' · ')}
                      </div>

                      {/* Summary preview */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, direction: 'ltr', textAlign: 'start' }}>
                        {c.summary.length > 160 ? c.summary.slice(0, 160) + '...' : c.summary}
                      </div>
                    </div>

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', flexShrink: 0, paddingTop: 2 }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <p style={{ margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.7, direction: 'ltr', textAlign: 'start' }}>
                        {c.summary}
                      </p>
                      <a
                        href={`https://www.nhtsa.gov/vehicle-safety/complaints#${c.odiNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {cc.moreDetails}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show more */}
          {!showAll && complaints.length > 5 && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                marginTop: 12, width: '100%', padding: '10px', borderRadius: 10,
                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              + {complaints.length - 5} {locale === 'he' ? 'תלונות נוספות' : 'more complaints'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { TrimSpec } from '@/data/cars';
import { TRIM_FEATURES } from '@/data/cars';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
}

// ── Labels ────────────────────────────────────────────────────────────────────

const ENGINE_TYPE_HE: Record<string, string> = {
  petrol: 'בנזין',
  hybrid: 'היברידי',
  phev: 'PHEV (תקע)',
  electric: 'חשמלי',
  diesel: 'דיזל',
};

const TRANSMISSION_HE: Record<string, string> = {
  manual: 'ידני',
  automatic: 'אוטומטי',
  cvt: 'CVT',
  dct: 'DCT (דו-מצמד)',
};

const DRIVE_HE: Record<string, string> = {
  fwd: 'קדמית',
  rwd: 'אחורית',
  awd: '4×4 / AWD',
};

const SEATS_HE: Record<string, string> = {
  fabric: 'בד',
  leatherette: 'דמוי-עור',
  leather: 'עור אמיתי',
};

// ── Feature groups shown in order ─────────────────────────────────────────────

const FEATURE_GROUPS: { label: string; icon: string; keys: (keyof typeof TRIM_FEATURES)[] }[] = [
  {
    label: 'טכנולוגיה',
    icon: '📱',
    keys: ['apple_carplay', 'wireless_carplay', 'wireless_charging', 'digital_cluster', 'hud', 'premium_audio'],
  },
  {
    label: 'בטיחות',
    icon: '🛡️',
    keys: ['aeb', 'adaptive_cruise', 'lane_keep', 'blind_spot', 'traffic_sign', 'rear_camera', 'camera_360', 'parking_sensors'],
  },
  {
    label: 'נוחות',
    icon: '✨',
    keys: ['heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats', 'memory_seats',
           'heated_steering', 'sunroof', 'panoramic_roof', 'keyless_entry', 'push_start',
           'ambient_lighting', 'led_lights', 'auto_lights'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasFeature(trim: TrimSpec, key: string) {
  return trim.features.includes(key);
}

/** Returns true if at least one trim in the list has this feature — so we hide irrelevant rows */
function anyHas(trims: TrimSpec[], key: string) {
  return trims.some(t => t.features.includes(key));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Check({ yes }: { yes: boolean }) {
  return (
    <span style={{
      fontSize: '1rem',
      color: yes ? '#16a34a' : 'var(--border-strong)',
      fontWeight: yes ? 700 : 400,
    }}>
      {yes ? '✓' : '–'}
    </span>
  );
}

function SectionHeader({ label, icon, colCount }: { label: string; icon: string; colCount: number }) {
  return (
    <tr>
      <td
        colSpan={colCount + 1}
        style={{
          padding: '10px 14px 6px',
          background: 'var(--bg-muted)',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {icon} {label}
      </td>
    </tr>
  );
}

function SpecRow({ label, values }: { label: string; values: React.ReactNode[] }) {
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{
        padding: '9px 14px',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        background: 'var(--bg-card)',
        position: 'sticky',
        right: 0,
        zIndex: 1,
        borderLeft: '1px solid var(--border)',
      }}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} style={{ padding: '9px 14px', textAlign: 'center', fontSize: '0.875rem', minWidth: 110 }}>
          {v}
        </td>
      ))}
    </tr>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function NoSpecs({ makeNameHe, modelNameHe }: { makeNameHe: string; modelNameHe: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '56px 24px',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔧</div>
      <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 6, color: 'var(--text-secondary)' }}>
        אין עדיין מפרט גימור ל{makeNameHe} {modelNameHe}
      </p>
      <p style={{ fontSize: '0.875rem' }}>
        נעדכן בהמשך. בינתיים תוכלו לבדוק באתר היבואן הרשמי.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrimSpecsTab({ makeSlug, modelSlug, makeNameHe, modelNameHe }: Props) {
  const [trims, setTrims] = useState<TrimSpec[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/trim-specs?make=${makeSlug}&model=${modelSlug}`)
      .then(r => r.json())
      .then((data: TrimSpec[]) => {
        setTrims(data);
        // Select all by default (up to first 4 to avoid overcrowding on mobile)
        setSelected(data.slice(0, 4).map(t => t.name));
      })
      .catch(() => setTrims([]))
      .finally(() => setLoading(false));
  }, [makeSlug, modelSlug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        טוען מפרטים...
      </div>
    );
  }

  if (!trims || trims.length === 0) {
    return <NoSpecs makeNameHe={makeNameHe} modelNameHe={modelNameHe} />;
  }

  const visible = trims.filter(t => selected.includes(t.name));

  // Which spec rows actually have data across visible trims?
  const hasEngine = visible.some(t => t.engineType || t.engineCc || t.engineHp || t.transmission || t.drive);
  const hasInterior = visible.some(t => t.seats || t.screenSize || (t.seatCount && t.seatCount !== 5));

  return (
    <div>
      {/* Trim selector pills */}
      {trims.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            בחר גימורים להשוואה:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trims.map(t => {
              const on = selected.includes(t.name);
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    if (on && selected.length === 1) return; // keep at least one
                    setSelected(prev =>
                      on ? prev.filter(n => n !== t.name) : [...prev, t.name],
                    );
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 999,
                    border: on ? '1.5px solid var(--brand-red)' : '1.5px solid var(--border)',
                    background: on ? 'rgba(230,57,70,.08)' : 'var(--bg-card)',
                    color: on ? 'var(--brand-red)' : 'var(--text-secondary)',
                    fontWeight: on ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div style={{
        overflowX: 'auto',
        borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          direction: 'rtl',
          background: 'var(--bg-card)',
          fontSize: '0.875rem',
        }}>
          <thead>
            <tr style={{ background: 'var(--text-primary)' }}>
              <th style={{
                padding: '12px 14px',
                textAlign: 'right',
                fontWeight: 700,
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.7)',
                position: 'sticky',
                right: 0,
                background: 'var(--text-primary)',
                zIndex: 2,
                whiteSpace: 'nowrap',
              }}>
                מפרט
              </th>
              {visible.map((t, i) => (
                <th key={t.name} style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: i === visible.length - 1 ? '#fbbf24' : '#fff',
                  minWidth: 110,
                  whiteSpace: 'nowrap',
                }}>
                  {t.name}
                  {t.priceIls && (
                    <div style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.8, marginTop: 2 }}>
                      ₪{t.priceIls.toLocaleString('he-IL')}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Engine ── */}
            {hasEngine && (
              <>
                <SectionHeader label="מנוע ותיבת הילוכים" icon="🔧" colCount={visible.length} />
                {visible.some(t => t.engineType) && (
                  <SpecRow
                    label="סוג מנוע"
                    values={visible.map(t => t.engineType ? ENGINE_TYPE_HE[t.engineType] ?? t.engineType : '–')}
                  />
                )}
                {visible.some(t => t.engineCc) && (
                  <SpecRow
                    label={'נפח (סמ"ק)'}
                    values={visible.map(t => t.engineCc ? t.engineCc.toLocaleString('he-IL') : '–')}
                  />
                )}
                {visible.some(t => t.engineHp) && (
                  <SpecRow
                    label={'כוח סוס (כ"ס)'}
                    values={visible.map(t => t.engineHp ? (
                      <span style={{ fontWeight: 700 }}>{t.engineHp}</span>
                    ) : '–')}
                  />
                )}
                {visible.some(t => t.transmission) && (
                  <SpecRow
                    label="תיבת הילוכים"
                    values={visible.map(t => t.transmission ? TRANSMISSION_HE[t.transmission] ?? t.transmission : '–')}
                  />
                )}
                {visible.some(t => t.drive) && (
                  <SpecRow
                    label="הנעה"
                    values={visible.map(t => t.drive ? DRIVE_HE[t.drive] ?? t.drive : '–')}
                  />
                )}
              </>
            )}

            {/* ── Interior ── */}
            {hasInterior && (
              <>
                <SectionHeader label="פנים הרכב" icon="🪑" colCount={visible.length} />
                {visible.some(t => t.seats) && (
                  <SpecRow
                    label="ריפוד"
                    values={visible.map(t => t.seats ? (
                      <span style={{
                        fontWeight: t.seats === 'leather' ? 700 : 400,
                        color: t.seats === 'leather' ? 'var(--text-primary)' : undefined,
                      }}>
                        {SEATS_HE[t.seats]}
                      </span>
                    ) : '–')}
                  />
                )}
                {visible.some(t => t.seatCount && t.seatCount !== 5) && (
                  <SpecRow
                    label="מספר מושבים"
                    values={visible.map(t => t.seatCount ? `${t.seatCount}` : '5')}
                  />
                )}
                {visible.some(t => t.screenSize) && (
                  <SpecRow
                    label="מסך מולטימדיה"
                    values={visible.map(t => t.screenSize ? (
                      <span style={{ fontWeight: 600 }}>{t.screenSize}&quot;</span>
                    ) : '–')}
                  />
                )}
              </>
            )}

            {/* ── Feature groups ── */}
            {FEATURE_GROUPS.map(group => {
              // Only show rows where at least one visible trim has the feature
              const relevantKeys = group.keys.filter(k => anyHas(visible, k));
              if (relevantKeys.length === 0) return null;
              return (
                <>
                  <SectionHeader key={`hdr-${group.label}`} label={group.label} icon={group.icon} colCount={visible.length} />
                  {relevantKeys.map(key => (
                    <SpecRow
                      key={key}
                      label={TRIM_FEATURES[key].labelHe}
                      values={visible.map(t => <Check key={t.name} yes={hasFeature(t, key)} />)}
                    />
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
        המפרט מבוסס על נתוני שוק ישראל. ייתכנו שינויים בין שנות ייצור שונות. מומלץ לאמת מול היבואן.
      </p>
    </div>
  );
}

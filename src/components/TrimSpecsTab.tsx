'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TrimSpec } from '@/data/cars';
import { TRIM_FEATURES } from '@/data/cars';

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface TrimWithYear extends TrimSpec {
  modelYear: number | null;
  isIsrael: boolean;
}

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  defaultYear?: number; // year page passes this
}

const ENGINE_TYPE_HE: Record<string, string> = {
  petrol: 'בנזין', hybrid: 'היברידי', phev: 'PHEV', electric: 'חשמלי', diesel: 'דיזל',
};
const TRANSMISSION_HE: Record<string, string> = {
  manual: 'ידני', automatic: 'אוטומטי', cvt: 'CVT', dct: 'DCT',
};
const DRIVE_HE: Record<string, string> = {
  fwd: 'קדמי', rwd: 'אחורי', awd: 'AWD / 4×4',
};
const SEATS_HE: Record<string, string> = {
  fabric: 'בד', leatherette: 'דמוי-עור', leather: 'עור',
};

const FEATURE_GROUPS: { label: string; icon: string; keys: (keyof typeof TRIM_FEATURES)[] }[] = [
  { label: 'טכנולוגיה', icon: '📱', keys: ['apple_carplay', 'wireless_carplay', 'wireless_charging', 'digital_cluster', 'hud', 'premium_audio'] },
  { label: 'בטיחות', icon: '🛡️', keys: ['aeb', 'adaptive_cruise', 'lane_keep', 'blind_spot', 'traffic_sign', 'rear_camera', 'camera_360', 'parking_sensors'] },
  { label: 'נוחות', icon: '✨', keys: ['heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats', 'memory_seats', 'heated_steering', 'sunroof', 'panoramic_roof', 'keyless_entry', 'push_start', 'ambient_lighting', 'led_lights', 'auto_lights'] },
];

function anyHas(trims: TrimWithYear[], key: string) {
  return trims.some(t => t.features.includes(key));
}

export default function TrimSpecsTab({ makeSlug, modelSlug, makeNameHe, modelNameHe, defaultYear }: Props) {
  const [allTrims, setAllTrims] = useState<TrimWithYear[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    const yearParam = defaultYear ? `&year=${defaultYear}` : '';
    fetch(`/api/trim-specs?make=${makeSlug}&model=${modelSlug}${yearParam}`)
      .then(r => r.json())
      .then((data: TrimWithYear[]) => {
        setAllTrims(data);
        setSelected(data[0]?.name ?? '');
      })
      .catch(() => setAllTrims([]))
      .finally(() => setLoading(false));
  }, [makeSlug, modelSlug, defaultYear]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>טוען מפרטים...</div>
  );

  if (!allTrims || allTrims.length === 0) return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔧</div>
      <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>אין עדיין מפרט גימור ל{makeNameHe} {modelNameHe}</p>
      <p style={{ fontSize: '0.875rem' }}>נעדכן בהמשך. בינתיים ניתן לבדוק באתר היבואן.</p>
    </div>
  );

  const trim = allTrims.find(t => t.name === selected) ?? allTrims[0];

  const hasEngine = !!(trim.engineType || trim.engineCc || trim.engineHp || trim.transmission || trim.drive);
  const hasInterior = !!(trim.seats || trim.screenSize || (trim.seatCount && trim.seatCount !== 5));

  const row = (label: string, value: React.ReactNode) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  const featureRow = (labelHe: string, key: string) => (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{labelHe}</span>
      <span style={{
        fontSize: '0.8rem', fontWeight: 700,
        color: trim.features.includes(key) ? '#16a34a' : 'var(--border-strong)',
      }}>
        {trim.features.includes(key) ? '✓ כלול' : '–'}
      </span>
    </div>
  );

  return (
    <div>
      {/* Trim selector */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
          בחר גימור:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allTrims.map(t => {
            const on = selected === t.name;
            return (
              <button
                key={t.name}
                onClick={() => setSelected(t.name)}
                style={{
                  padding: '6px 16px', borderRadius: 999,
                  border: on ? '2px solid var(--brand-red)' : '1.5px solid var(--border)',
                  background: on ? 'var(--brand-red)' : 'var(--bg-card)',
                  color: on ? '#fff' : 'var(--text-secondary)',
                  fontWeight: on ? 700 : 500,
                  fontSize: '0.83rem', cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {t.name}
                {t.priceIls && (
                  <span style={{ fontSize: '0.72rem', opacity: on ? 0.85 : 0.6 }}>
                    ₪{Math.round(t.priceIls / 1000)}K
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail card for selected trim */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ background: 'var(--brand-red)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{trim.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {makeNameHe} {modelNameHe}
            </div>
          </div>
          {trim.priceIls && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>₪{trim.priceIls.toLocaleString('he-IL')}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>מחיר מומלץ</div>
            </div>
          )}
        </div>

        <div style={{ padding: '4px 20px 16px' }}>
          {/* Engine */}
          {hasEngine && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 0 4px' }}>
                🔧 מנוע ותיבת הילוכים
              </div>
              {trim.engineType && row('סוג מנוע', ENGINE_TYPE_HE[trim.engineType] ?? trim.engineType)}
              {trim.engineCc && row('נפח מנוע', `${trim.engineCc.toLocaleString()} סמ"ק`)}
              {trim.engineHp && row('הספק', <span style={{ color: 'var(--brand-red)' }}>{trim.engineHp} כ"ס</span>)}
              {trim.transmission && row('תיבת הילוכים', TRANSMISSION_HE[trim.transmission] ?? trim.transmission)}
              {trim.drive && row('הנעה', DRIVE_HE[trim.drive] ?? trim.drive)}
            </div>
          )}

          {/* Interior */}
          {hasInterior && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 0 4px' }}>
                🪑 פנים הרכב
              </div>
              {trim.seats && row('ריפוד', SEATS_HE[trim.seats])}
              {trim.seatCount && trim.seatCount !== 5 && row('מושבים', trim.seatCount)}
              {trim.screenSize && row('מסך מולטימדיה', `${trim.screenSize}"`)}
            </div>
          )}

          {/* Feature groups */}
          {FEATURE_GROUPS.map(group => {
            const relevantKeys = group.keys.filter(k => anyHas(allTrims, k));
            if (relevantKeys.length === 0) return null;
            return (
              <div key={group.label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 0 4px' }}>
                  {group.icon} {group.label}
                </div>
                {relevantKeys.map(k => featureRow(TRIM_FEATURES[k].labelHe, k))}
              </div>
            );
          })}
        </div>

        {/* Footer link */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', background: 'var(--bg-secondary)' }}>
          <Link
            href={`/cars/${makeSlug}/${modelSlug}/trim/${toTrimSlug(trim.name)}`}
            style={{ fontSize: '0.83rem', color: 'var(--brand-red)', fontWeight: 600, textDecoration: 'none' }}
          >
            פרטים מלאים על גימור {trim.name} ←
          </Link>
        </div>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
        מפרט לשוק ישראל · ייתכנו שינויים בין שנות ייצור · מומלץ לאמת מול היבואן
      </p>
    </div>
  );
}

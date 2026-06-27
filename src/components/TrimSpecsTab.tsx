'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TrimSpec } from '@/data/cars';
import { TRIM_FEATURES } from '@/data/cars';
import { useLocale } from '@/lib/localeContext';

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

const FEATURE_GROUPS: { sectionKey: 'tech' | 'safety' | 'comfort'; icon: string; keys: (keyof typeof TRIM_FEATURES)[] }[] = [
  { sectionKey: 'tech', icon: '📱', keys: ['apple_carplay', 'wireless_carplay', 'wireless_charging', 'digital_cluster', 'hud', 'premium_audio'] },
  { sectionKey: 'safety', icon: '🛡️', keys: ['aeb', 'adaptive_cruise', 'lane_keep', 'blind_spot', 'traffic_sign', 'rear_camera', 'camera_360', 'parking_sensors'] },
  { sectionKey: 'comfort', icon: '✨', keys: ['heated_seats_front', 'heated_seats_rear', 'ventilated_seats', 'electric_seats', 'memory_seats', 'heated_steering', 'sunroof', 'panoramic_roof', 'keyless_entry', 'push_start', 'ambient_lighting', 'led_lights', 'auto_lights'] },
];

function anyHas(trims: TrimWithYear[], key: string) {
  return trims.some(t => t.features.includes(key));
}

// ILS → USD fixed rate (approximate)
const ILS_TO_USD = 3.65;
function fmtPrice(priceIls: number, locale: string) {
  if (locale === 'en') {
    const usd = Math.round(priceIls / ILS_TO_USD);
    return `$${Math.round(usd / 1000)}K`;
  }
  return `₪${Math.round(priceIls / 1000)}K`;
}

export default function TrimSpecsTab({ makeSlug, modelSlug, makeNameHe, modelNameHe, defaultYear }: Props) {
  const { t, locale } = useLocale();
  const ts = t.trimSpecs;
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
    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{ts.loading}</div>
  );

  if (!allTrims || allTrims.length === 0) return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔧</div>
      <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
        {ts.noData} {makeNameHe} {modelNameHe}{ts.noDataSuffix}
      </p>
    </div>
  );

  const trim = allTrims.find(t => t.name === selected) ?? allTrims[0];

  const hasEngine = !!(trim.engineType || trim.engineCc || trim.engineHp || trim.transmission || trim.drive);
  const hasInterior = !!(trim.seats || trim.screenSize || (trim.seatCount && trim.seatCount !== 5));

  const row = (label: string, value: React.ReactNode) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );

  const featureRow = (labelHe: string, key: string) => {
    const feat = TRIM_FEATURES[key as keyof typeof TRIM_FEATURES];
    const label = locale === 'en' && feat?.labelEn ? feat.labelEn : labelHe;
    return (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontSize: '0.8rem', fontWeight: 700,
        color: trim.features.includes(key) ? '#16a34a' : 'var(--border-strong)',
      }}>
        {trim.features.includes(key) ? ts.included : ts.notIncluded}
      </span>
    </div>
  );
  };

  return (
    <div>
      {/* Trim selector */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
          {ts.selectTrim}
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
                  border: on ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                  background: on ? 'var(--accent)' : 'var(--surface)',
                  color: on ? '#fff' : 'var(--text-muted)',
                  fontWeight: on ? 700 : 500,
                  fontSize: '0.83rem', cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {t.name}
                {t.priceIls && (
                  <span style={{ fontSize: '0.72rem', opacity: on ? 0.85 : 0.6 }}>
                    {fmtPrice(t.priceIls, locale)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail card for selected trim */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ background: 'var(--accent)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{trim.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {makeNameHe} {modelNameHe}
            </div>
          </div>
          {trim.priceIls && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>{locale === 'en' ? `$${Math.round(trim.priceIls / ILS_TO_USD).toLocaleString('en-US')}` : `₪${trim.priceIls.toLocaleString('he-IL')}`}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>{ts.recommended}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '4px 20px 16px' }}>
          {/* Engine */}
          {hasEngine && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 0 4px' }}>
                {ts.engine}
              </div>
              {trim.engineType && row(ts.engineType, ts.engineTypes[trim.engineType as keyof typeof ts.engineTypes] ?? trim.engineType)}
              {trim.engineCc && row(ts.engineCc, `${trim.engineCc.toLocaleString()} ${ts.cc}`)}
              {trim.engineHp && row(ts.engineHp, <span style={{ color: 'var(--accent)' }}>{trim.engineHp} {ts.hp}</span>)}
              {trim.transmission && row(ts.transmission, ts.transmissions[trim.transmission as keyof typeof ts.transmissions] ?? trim.transmission)}
              {trim.drive && row(ts.drive, ts.drives[trim.drive as keyof typeof ts.drives] ?? trim.drive)}
            </div>
          )}

          {/* Interior */}
          {hasInterior && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 0 4px' }}>
                {ts.interior}
              </div>
              {trim.seats && row(ts.upholstery, ts.upholsteries[trim.seats as keyof typeof ts.upholsteries] ?? trim.seats)}
              {trim.seatCount && trim.seatCount !== 5 && row(ts.seats, trim.seatCount)}
              {trim.screenSize && row(ts.screen, `${trim.screenSize}"`)}
            </div>
          )}

          {/* Feature groups */}
          {FEATURE_GROUPS.map(group => {
            const relevantKeys = group.keys.filter(k => anyHas(allTrims, k));
            if (relevantKeys.length === 0) return null;
            return (
              <div key={group.sectionKey} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 0 4px' }}>
                  {group.icon} {ts.sections[group.sectionKey]}
                </div>
                {relevantKeys.map(k => featureRow(TRIM_FEATURES[k].labelHe, k))}
              </div>
            );
          })}
        </div>

        {/* Footer link */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', background: 'var(--surface-2)' }}>
          <Link
            href={`/cars/${makeSlug}/${modelSlug}/trim/${toTrimSlug(trim.name)}`}
            style={{ fontSize: '0.83rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
          >
            {ts.moreDetails} {trim.name} ←
          </Link>
        </div>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
        {ts.disclaimer}
      </p>
    </div>
  );
}

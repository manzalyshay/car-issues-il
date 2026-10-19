'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TrimSpec } from '@/data/cars';
import { TRIM_FEATURES } from '@/data/cars';
import { useLocale } from '@/lib/localeContext';

function toTrimSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function setTrimInUrl(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('trim', toTrimSlug(name));
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
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
  makeNameEn?: string;
  modelNameEn?: string;
  defaultYear?: number; // year page passes this
  safetyHe?: string | null;
  techComfortHe?: string | null;
  mode?: 'specs' | 'safety'; // specs = trim selector only, safety = cards + text only
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

export default function TrimSpecsTab({ makeSlug, modelSlug, makeNameHe, modelNameHe, makeNameEn, modelNameEn, defaultYear, safetyHe, techComfortHe, mode = 'specs' }: Props) {
  const { t, locale } = useLocale();
  const ts = t.trimSpecs;
  const [allTrims, setAllTrims] = useState<TrimWithYear[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const [ncap, setNcap] = useState<{ overall_stars: number; adult_occupant_pct: number; child_occupant_pct: number; vulnerable_road_users_pct: number; safety_assist_pct: number; test_year: number } | null>(null);

  useEffect(() => {
    const yearParam = defaultYear ? `&year=${defaultYear}` : '';
    Promise.all([
      fetch(`/api/trim-specs?make=${makeSlug}&model=${modelSlug}${yearParam}`).then(r => r.json()),
      fetch(`/api/ncap?make=${makeSlug}&model=${modelSlug}`).then(r => r.json()).catch(() => null),
    ]).then(([data, ncapData]) => {
      setAllTrims(data);
      const requestedTrim = new URLSearchParams(window.location.search).get('trim');
      const matchedTrim = data.find((trim: TrimWithYear) => toTrimSlug(trim.name) === requestedTrim);
      const initialTrim = matchedTrim?.name ?? data[0]?.name ?? '';
      setSelected(initialTrim);
      if (initialTrim && !matchedTrim) setTrimInUrl(initialTrim);
      setNcap(ncapData);
    }).catch(() => setAllTrims([])).finally(() => setLoading(false));
  }, [makeSlug, modelSlug, defaultYear]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{ts.loading}</div>
  );

  const displayMakeName = locale === 'en' ? (makeNameEn ?? makeNameHe) : makeNameHe;
  const displayModelName = locale === 'en' ? (modelNameEn ?? modelNameHe) : modelNameHe;

  const noTrims = !allTrims || allTrims.length === 0;

  // In specs mode, show "no data" when there are no trims.
  // In safety mode, only bail out if there's also no safety content.
  if (noTrims && (mode === 'specs' || (!ncap && !safetyHe && !techComfortHe))) return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔧</div>
      <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
        {ts.noData} {displayMakeName} {displayModelName}{ts.noDataSuffix}
      </p>
    </div>
  );

  const trim = noTrims ? null : (allTrims!.find(t => t.name === selected) ?? allTrims![0]);

  const hasEngine = !!(trim?.engineType || trim?.engineCc || trim?.engineHp || trim?.transmission || trim?.drive);
  const hasInterior = !!(trim?.seats || trim?.screenSize || (trim?.seatCount && trim?.seatCount !== 5));

  const row = (label: string, value: React.ReactNode) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );

  const featureRow = (labelHe: string, key: string) => {
    const feat = TRIM_FEATURES[key as keyof typeof TRIM_FEATURES];
    const label = locale === 'en' && feat?.labelEn ? feat.labelEn : labelHe;
    const has = trim?.features.includes(key) ?? false;
    return (
    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontSize: '0.8rem', fontWeight: 700,
        color: has ? '#16a34a' : 'var(--border-strong)',
      }}>
        {has ? ts.included : ts.notListed}
      </span>
    </div>
  );
  };

  // Compute highlight tech/safety features for the cards
  const safetyKeys: (keyof typeof TRIM_FEATURES)[] = ['aeb', 'adaptive_cruise', 'lane_keep', 'blind_spot', 'traffic_sign', 'rear_camera', 'camera_360', 'parking_sensors'];
  const techKeys: (keyof typeof TRIM_FEATURES)[] = ['apple_carplay', 'wireless_carplay', 'wireless_charging', 'digital_cluster', 'hud', 'premium_audio'];
  const comfortKeys: (keyof typeof TRIM_FEATURES)[] = ['heated_seats_front', 'ventilated_seats', 'sunroof', 'panoramic_roof', 'keyless_entry', 'ambient_lighting'];

  // Gather checklist items for tech card: features present in at least one trim
  const techChecklist = noTrims ? [] : [...techKeys, ...comfortKeys].filter(k => anyHas(allTrims!, k));
  // For the selected trim, which features it has
  const trimHasFeat = (k: string) => trim?.features.includes(k) ?? false;

  // Tech highlight stats (from the selected trim)
  const techStats: { value: string; label: string }[] = [];
  if (trim?.screenSize) techStats.push({ value: `${trim.screenSize}"`, label: locale === 'en' ? 'Multimedia Screen' : 'מסך מולטימדיה' });
  if (trim?.cargoLiters) techStats.push({ value: locale === 'en' ? `${trim.cargoLiters}L` : `${trim.cargoLiters} ל׳`, label: locale === 'en' ? 'Cargo Volume' : 'נפח תא מטען' });
  if (trim?.seatCount && trim.seatCount !== 5) techStats.push({ value: `${trim.seatCount}`, label: locale === 'en' ? 'Seats' : 'מושבים' });
  if (trim?.engineHp) techStats.push({ value: `${trim.engineHp}`, label: locale === 'en' ? 'Horsepower' : 'כ"ס' });

  const hasSafetyCard = ncap != null || !!safetyHe;
  const hasTechCard = techStats.length > 0 || techChecklist.length > 0 || !!techComfortHe;

  const trimSelector = trim && (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
        {ts.selectTrim}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {allTrims!.map(t => {
          const on = selected === t.name;
          return (
            <button
              key={t.id ?? t.name}
              onClick={() => { setSelected(t.name); setTrimInUrl(t.name); }}
              aria-pressed={on}
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
  );

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : '#B9BFC8'} strokeWidth={filled ? 0 : 1.6} aria-hidden="true">
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z" />
    </svg>
  );

  return (
    <div>
      {mode === 'safety' && trimSelector}
      {/* Safety & Tech Cards — only in safety mode */}
      {mode === 'safety' && (hasSafetyCard || hasTechCard || !!safetyHe || !!techComfortHe) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
          {/* Safety Card */}
          {hasSafetyCard && (
            <article style={{ flex: '1 1 440px', minWidth: 0, background: '#fff', border: '1px solid #E3E6EB', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF0FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F4FD1' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{locale === 'en' ? 'Safety' : 'בטיחות'}</h3>
                {ncap && (
                  <span style={{ marginInlineStart: 'auto', fontSize: 13, color: '#565D68', border: '1px solid #E3E6EB', borderRadius: 999, padding: '4px 10px' }}>
                    Euro NCAP · {ncap.test_year}
                  </span>
                )}
              </div>
              {/* Star rating row */}
              {ncap && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', borderRadius: 12, background: '#F7F8FA' }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{locale === 'en' ? 'Overall Rating' : 'דירוג כולל'}</span>
                    <span style={{ display: 'flex', gap: 4, color: '#15181D' }}>
                      {[1,2,3,4,5].map(s => <StarIcon key={s} filled={s <= ncap.overall_stars} />)}
                    </span>
                  </div>
                </div>
              )}
              {/* Percentage breakdown */}
              {ncap && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                  {[
                    { label: locale === 'en' ? 'Adult Occupant' : 'מבוגרים', val: ncap.adult_occupant_pct },
                    { label: locale === 'en' ? 'Child Occupant' : 'ילדים', val: ncap.child_occupant_pct },
                    { label: locale === 'en' ? 'Vulnerable Users' : 'הולכי רגל', val: ncap.vulnerable_road_users_pct },
                    { label: locale === 'en' ? 'Safety Assist' : 'עזרי בטיחות', val: ncap.safety_assist_pct },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '6px 0' }}>
                      <span style={{ color: '#565D68' }}>{label}</span>
                      <span style={{ fontWeight: 700, color: val >= 80 ? '#16a34a' : val >= 65 ? '#d97706' : '#dc2626' }}>{val}%</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Safety features checklist */}
              {!noTrims && safetyKeys.filter(k => anyHas(allTrims!, k)).length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {safetyKeys.filter(k => anyHas(allTrims!, k)).map(k => {
                    const feat = TRIM_FEATURES[k];
                    const label = locale === 'en' && feat?.labelEn ? feat.labelEn : feat.labelHe;
                    const has = trimHasFeat(k);
                    return (
                      <li key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.5 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={has ? '#1F4FD1' : '#B9BFC8'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}><path d="M5 12l5 5L19 7" /></svg>
                        <span style={{ color: has ? '#15181D' : '#565D68', opacity: has ? 1 : 0.72 }}>
                          {label}{!has && <span style={{ fontSize: 12 }}> · {ts.notListedInTrim}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {safetyHe && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#565D68' }}>{ts.modelLevelNote}</p>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#565D68' }}>{safetyHe}</p>
                </div>
              )}
            </article>
          )}

          {/* Tech & Comfort Card */}
          {(hasTechCard || !!techComfortHe) && (
            <article style={{ flex: '1 1 440px', minWidth: 0, background: '#fff', border: '1px solid #E3E6EB', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EAF0FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F4FD1' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{locale === 'en' ? 'Tech & Comfort' : 'טכנולוגיה ונוחות'}</h3>
              </div>
              {/* 2x2 stats grid */}
              {techStats.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  {techStats.slice(0, 4).map(s => (
                    <div key={s.label} style={{ padding: '14px 16px', borderRadius: 12, background: '#F7F8FA', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</span>
                      <span style={{ fontSize: 14, color: '#565D68' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Feature checklist */}
              {techChecklist.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {techChecklist.slice(0, 8).map(k => {
                    const feat = TRIM_FEATURES[k];
                    const label = locale === 'en' && feat?.labelEn ? feat.labelEn : feat.labelHe;
                    const has = trimHasFeat(k);
                    return (
                      <li key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.5 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={has ? '#1F4FD1' : '#B9BFC8'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 3 }}><path d="M5 12l5 5L19 7" /></svg>
                        <span style={{ color: has ? '#15181D' : '#565D68', opacity: has ? 1 : 0.55 }}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {techComfortHe && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#565D68' }}>{ts.modelLevelNote}</p>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#565D68' }}>{techComfortHe}</p>
                </div>
              )}
            </article>
          )}
        </div>
      )}

      {/* Specs mode includes the same trim selector, with full technical details. */}
      {mode === 'specs' && trim && (<>
      {trimSelector}

      {/* Detail card for selected trim */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ background: 'var(--accent)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{trim.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {displayMakeName} {displayModelName}
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

          {/* Feature groups — only features NOT already shown in the cards above */}
          {FEATURE_GROUPS.map(group => {
            const shownInCards = new Set<string>([...safetyKeys, ...techChecklist]);
            const relevantKeys = group.keys.filter(k => anyHas(allTrims ?? [], k) && !shownInCards.has(k));
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
      </>)}
    </div>
  );
}

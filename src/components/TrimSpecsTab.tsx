'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { TrimSpec } from '@/data/cars';
import { TRIM_FEATURES } from '@/data/cars';
import { useLocale } from '@/lib/localeContext';
import { trimDisplayName, trimShortLabels, trimValueLabel, driveKey, engineKey, transmissionKey, transmissionGears } from '@/lib/trimLabels';

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
  return trims.some(t => Array.isArray(t.features) && t.features.includes(key));
}

/** Section labels carry a leading emoji; the trim card headings drop it. */
const plain = (label: string) => label.replace(/^[^\p{L}\p{N}]+/u, '');

const ENGINE_COLORS: Record<string, string> = { petrol: '#2f62e0', hybrid: '#1b9e77', phev: '#7a4fd6', electric: '#0f9bb0', diesel: '#e0832f' };

const TRIM_PICKER_LABELS: Record<string, { choose: string; count: (n: number) => string; sorted: string; noPrice: string; unpricedTitle: string; unpricedSub: string; other: string; fullSpecs: string; compare: string }> = {
  he: { choose: 'בחרו גימור', count: n => n === 1 ? 'גימור אחד' : `${n} גימורים`, sorted: 'ממוין לפי סוג הנעה ומחיר', noPrice: 'אין מחיר', unpricedTitle: 'ללא מחיר עדכני', unpricedSub: '', other: 'אחר', fullSpecs: 'מפרט מלא', compare: 'השוואה לדגם אחר' },
  en: { choose: 'Choose a trim', count: n => `${n} trim${n === 1 ? '' : 's'}`, sorted: 'Sorted by powertrain and price', noPrice: 'No price', unpricedTitle: 'No current price', unpricedSub: '', other: 'Other', fullSpecs: 'Full specs', compare: 'Compare with another model' },
  ru: { choose: 'Выберите комплектацию', count: n => `Комплектаций: ${n}`, sorted: 'По типу двигателя и цене', noPrice: 'Нет цены', unpricedTitle: 'Без актуальной цены', unpricedSub: '', other: 'Другое', fullSpecs: 'Все характеристики', compare: 'Сравнить с другой моделью' },
};

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
  if (noTrims && (mode === 'specs' || (!ncap && !(locale !== 'en' && safetyHe) && !(locale !== 'en' && techComfortHe)))) return (
    <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔧</div>
      <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
        {ts.noData} {displayMakeName} {displayModelName}{ts.noDataSuffix}
      </p>
    </div>
  );

  const trim = noTrims ? null : (allTrims!.find(t => t.name === selected) ?? allTrims![0]);

  const gears = transmissionGears(trim?.transmission);
  const engineLabel = trimValueLabel(trim?.engineType, engineKey(trim?.engineType), ts.engineTypes, locale);
  const transmissionLabel = trimValueLabel(trim?.transmission, transmissionKey(trim?.transmission), ts.transmissions, locale,
    gears ? (locale === 'ru' ? `(${gears} ступ.)` : locale === 'en' ? `(${gears}-speed)` : undefined) : undefined);
  const driveLabel = trimValueLabel(trim?.drive, driveKey(trim?.drive), ts.drives, locale);
  const seatsLabel = trimValueLabel(trim?.seats, trim?.seats ?? null, ts.upholsteries, locale);
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
    const has = Array.isArray(trim?.features) ? trim!.features.includes(key) : false;
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
  const trimHasFeat = (k: string) => Array.isArray(trim?.features) ? trim!.features.includes(k) : false;

  // Tech highlight stats (from the selected trim)
  const techStats: { value: string; label: string }[] = [];
  if (trim?.screenSize) techStats.push({ value: `${trim.screenSize}"`, label: locale === 'en' ? 'Multimedia Screen' : 'מסך מולטימדיה' });
  if (trim?.cargoLiters) techStats.push({ value: locale === 'en' ? `${trim.cargoLiters}L` : `${trim.cargoLiters} ל׳`, label: locale === 'en' ? 'Cargo Volume' : 'נפח תא מטען' });
  if (trim?.seatCount && trim.seatCount !== 5) techStats.push({ value: `${trim.seatCount}`, label: locale === 'en' ? 'Seats' : 'מושבים' });
  if (trim?.engineHp) techStats.push({ value: `${trim.engineHp}`, label: locale === 'en' ? 'Horsepower' : 'כ"ס' });

  const hasSafetyCard = ncap != null || (locale !== 'en' && !!safetyHe);
  const hasTechCard = techStats.length > 0 || techChecklist.length > 0 || (locale !== 'en' && !!techComfortHe);

  // auto.co.il version names are long spec strings: buttons show a short label, full name on hover
  const shortLabels = noTrims ? [] : trimShortLabels(allTrims!.map(t => t.name), locale);
  // Trim picker groups: by powertrain (cheapest first); trims with no current price last.
  const tl = TRIM_PICKER_LABELS[locale] ?? TRIM_PICKER_LABELS.he;
  const trimSpecLine = (t: TrimWithYear) => [
    t.engineCc ? (locale === 'en' ? `${(t.engineCc / 1000).toFixed(1)}L` : locale === 'ru' ? `${(t.engineCc / 1000).toFixed(1)} л` : `${(t.engineCc / 1000).toFixed(1)} ל׳`) : null,
    t.engineHp ? `${t.engineHp} ${ts.hp}` : null,
    trimValueLabel(t.drive, driveKey(t.drive), ts.drives, locale),
  ].filter(Boolean).join(' · ');
  const trimGroups: { key: string; title: string; sub?: string; color: string; items: TrimWithYear[] }[] = [];
  if (!noTrims) {
    const byKey = new Map<string, TrimWithYear[]>();
    const unpriced: TrimWithYear[] = [];
    for (const t of allTrims!) {
      if (!t.priceIls) { unpriced.push(t); continue; }
      const k = engineKey(t.engineType) ?? 'other';
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(t);
    }
    const groups = [...byKey.entries()].map(([k, items]) => ({
      key: k,
      title: k === 'other' ? tl.other : (ts.engineTypes[k] ?? k),
      color: ENGINE_COLORS[k] ?? '#5b6a86',
      items: items.sort((x, y) => (x.priceIls ?? 0) - (y.priceIls ?? 0)),
    })).sort((x, y) => (x.items[0].priceIls ?? 0) - (y.items[0].priceIls ?? 0));
    trimGroups.push(...groups);
    if (unpriced.length) trimGroups.push({ key: 'unpriced', title: tl.unpricedTitle, sub: tl.unpricedSub, color: '#8a94aa', items: unpriced });
  }
  const selectedGroup = trim ? trimGroups.find(g => g.items.some(t => t.name === trim.name)) : undefined;

  const trimSelector = trim && (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
        {ts.selectTrim}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {allTrims!.map((t, i) => {
          const on = selected === t.name;
          return (
            <button
              key={t.id ?? t.name}
              onClick={() => { setSelected(t.name); setTrimInUrl(t.name); }}
              aria-pressed={on}
              title={trimDisplayName(t.name, locale)}
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
              {shortLabels[i]}
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
      {/* Safety & Tech Cards - only in safety mode */}
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
                    {locale === 'en' ? `Crash test ${ncap.test_year}` : `מבחן התנגשות ${ncap.test_year}`}
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
              {safetyHe && locale !== 'en' && (
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
              {techComfortHe && locale !== 'en' && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#565D68' }}>{ts.modelLevelNote}</p>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#565D68' }}>{techComfortHe}</p>
                </div>
              )}
            </article>
          )}
        </div>
      )}

      {/* Specs mode: trims grouped by powertrain, with the selected trim's details beside them. */}
      {mode === 'specs' && trim && (<>
      <div className="trim-layout">
        <div className="trim-list" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(20px,2vw,26px)', fontWeight: 800 }}>{tl.choose}</h2>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{tl.count(allTrims!.length)}{defaultYear ? ` · ${defaultYear}` : ''}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>{tl.sorted}</p>
          </div>

          {trimGroups.map(g => (
            <div key={g.key} role="radiogroup" aria-label={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flex: 'none' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{g.title}</h3>
                {g.sub && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{g.sub}</span>}
              </div>
              <div className="trim-cards">
                {g.items.map(t => {
                  const on = t.name === trim.name;
                  return (
                    <button
                      key={t.id ?? t.name}
                      role="radio"
                      aria-checked={on}
                      onClick={() => { setSelected(t.name); setTrimInUrl(t.name); }}
                      className="trim-card"
                      title={trimDisplayName(t.name, locale)}
                      style={{
                        background: on ? 'var(--accent-soft)' : 'var(--surface)',
                        border: on ? '2px solid var(--accent)' : '1px solid var(--border)',
                        padding: on ? '12px 14px' : '13px 15px',
                      }}
                    >
                      <span className="trim-card-radio" aria-hidden="true" style={{ border: `2px solid ${on ? 'var(--accent)' : '#a3abbd'}` }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? 'var(--accent)' : 'transparent' }} />
                      </span>
                      <span className="trim-card-info">
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{shortLabels[allTrims!.indexOf(t)] ?? trimDisplayName(t.name, locale)}</span>
                        {trimSpecLine(t) && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{trimSpecLine(t)}</span>}
                      </span>
                      <span className="trim-card-price">
                        <span style={{ fontSize: 17, fontWeight: 800, color: t.priceIls ? 'var(--text)' : 'var(--text-muted)' }}>
                          {t.priceIls ? fmtPrice(t.priceIls, locale) : '—'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.priceIls ? ts.recommended : tl.noPrice}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detail card for selected trim */}
        <aside className="trim-aside" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ background: 'var(--accent)', color: '#fff', padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#c3cde3' }}>{displayMakeName} {displayModelName}{selectedGroup ? ` · ${selectedGroup.title}` : ''}</span>
            <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{trimDisplayName(trim.name, locale)}</span>
            {trim.priceIls && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'clamp(28px,2.6vw,34px)', fontWeight: 800 }}>{locale === 'en' ? `$${Math.round(trim.priceIls / ILS_TO_USD).toLocaleString('en-US')}` : `₪${trim.priceIls.toLocaleString('he-IL')}`}</span>
                <span style={{ fontSize: 14, color: '#c3cde3' }}>{ts.recommended}</span>
              </div>
            )}
          </div>

          <div style={{ padding: '4px 20px 8px' }}>
            {/* Engine */}
            {hasEngine && (
              <div style={{ marginBottom: 8 }}>
                <h4 style={{ margin: '14px 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{plain(ts.engine)}</h4>
                {/* Raw values may be stored as Hebrew text: label them by key; no row rather than Hebrew on en/ru */}
                {engineLabel && row(ts.engineType, engineLabel)}
                {trim.engineCc && row(ts.engineCc, `${trim.engineCc.toLocaleString()} ${ts.cc}`)}
                {trim.engineHp && row(ts.engineHp, <span style={{ color: 'var(--accent)' }}>{trim.engineHp} {ts.hp}</span>)}
                {transmissionLabel && row(ts.transmission, transmissionLabel)}
                {driveLabel && row(ts.drive, driveLabel)}
              </div>
            )}

            {/* Interior */}
            {hasInterior && (
              <div style={{ marginBottom: 8 }}>
                <h4 style={{ margin: '14px 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{plain(ts.interior)}</h4>
                {seatsLabel && row(ts.upholstery, seatsLabel)}
                {trim.seatCount && trim.seatCount !== 5 && row(ts.seats, trim.seatCount)}
                {trim.screenSize && row(ts.screen, `${trim.screenSize}"`)}
              </div>
            )}

            {/* Feature groups - only features NOT already shown in the safety tab cards */}
            {FEATURE_GROUPS.map(group => {
              const shownInCards = new Set<string>([...safetyKeys, ...techChecklist]);
              const relevantKeys = group.keys.filter(k => anyHas(allTrims ?? [], k) && !shownInCards.has(k));
              if (relevantKeys.length === 0) return null;
              return (
                <div key={group.sectionKey} style={{ marginBottom: 8 }}>
                  <h4 style={{ margin: '14px 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{plain(ts.sections[group.sectionKey])}</h4>
                  {relevantKeys.map(k => featureRow(TRIM_FEATURES[k].labelHe, k))}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '12px 20px 20px', flexWrap: 'wrap' }}>
            <Link
              href={`/cars/${makeSlug}/${modelSlug}/trim/${toTrimSlug(trim.name)}`}
              style={{ flex: '1 1 120px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
            >
              {tl.fullSpecs}
            </Link>
            <Link
              href={`/cars/compare?car1=${makeSlug}/${modelSlug}`}
              style={{ flex: '1 1 120px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: '1px solid var(--border-strong)', color: 'var(--accent)', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}
            >
              {tl.compare}
            </Link>
          </div>
        </aside>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
        {ts.disclaimer}
      </p>
      <style>{`
        .trim-layout { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-start; }
        .trim-list { flex: 999 1 560px; min-width: 0; }
        .trim-aside { flex: 1 1 340px; min-width: 0; }
        .trim-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
        .trim-card { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px 12px; min-height: 112px; border-radius: 14px; cursor: pointer; font-family: inherit; box-sizing: border-box; width: 100%; text-align: start; }
        .trim-card-radio { order: 1; flex: none; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
        .trim-card-price { order: 2; margin-inline-start: auto; display: flex; flex-direction: column; align-items: flex-end; }
        .trim-card-info { order: 3; flex-basis: 100%; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        @media (max-width: 768px) {
          .trim-layout { gap: 20px; }
          .trim-cards { grid-template-columns: 1fr; gap: 8px; }
          .trim-card { flex-wrap: nowrap; align-items: center; min-height: 64px; }
          .trim-card-info { order: 2; flex: 1 1 auto; }
          .trim-card-price { order: 3; margin-inline-start: 0; }
        }
      `}</style>
      </>)}
    </div>
  );
}

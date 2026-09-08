'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Vehicle } from '@/lib/vehicleLookup';
import { detectCountry } from '@/lib/vehicleLookup';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtPlate(raw: string): string {
  const p = raw.replace(/\D/g, '');
  if (!p) return raw.toUpperCase();
  return p.length === 7
    ? `${p.slice(0, 3)}-${p.slice(3, 5)}-${p.slice(5)}`
    : `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
}

function fmtDate(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-');
    return `${m}/${y}`;
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Map raw data.gov.il baalut values to user-friendly Hebrew labels */
const OWNERSHIP_LABEL: Record<string, string> = {
  'פרטי':    'פרטי',
  'סוחר':    'סוחר',
  'ליסינג':  'ליסינג',
  'השכרה':   'השכרה',
  'החכר':    'ליסינג',
  'חברה':    'חברה',
  'מדינה':   'מדינה',
  'עירייה':  'עירייה',
  'צבא':     'צבא',
  'עסקי':    'עסקי',
};

function normalizeOwnership(raw: string): string {
  if (!raw) return raw;
  // Exact match first
  if (OWNERSHIP_LABEL[raw]) return OWNERSHIP_LABEL[raw];
  // Partial match (e.g. "סוחר רכב" → "סוחר")
  for (const [key, label] of Object.entries(OWNERSHIP_LABEL)) {
    if (raw.includes(key)) return label;
  }
  return raw;
}

// ── Progress bar hook ──────────────────────────────────────────────────────

function useProgressBar(loading: boolean): number {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading) {
      startedRef.current = true;
      setProgress(2);
      let p = 2;
      timerRef.current = setInterval(() => {
        p = Math.min(p + Math.random() * 12 * (1 - p / 100), 85);
        setProgress(p);
      }, 200);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (!startedRef.current) return;
      startedRef.current = false;
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(t);
    }
  }, [loading]);

  return progress;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusChip({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const bad = warn ?? !ok;
  const color = bad ? '#f87171' : '#86efac';
  const bg = bad ? 'rgba(248,113,113,0.15)' : 'rgba(134,239,172,0.15)';
  const border = bad ? 'rgba(248,113,113,0.3)' : 'rgba(134,239,172,0.3)';
  return (
    <div style={{ padding: '5px 12px', borderRadius: 20, background: bg, border: `1px solid ${border}`, fontSize: '0.78rem', fontWeight: 700, color }}>
      {!bad ? '✓' : '⚠'} {label}
    </div>
  );
}

function FlagRow({ color, label, value }: { color: 'amber' | 'neutral'; label: string; value: string }) {
  const isAmber = color === 'amber';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderRadius: 9, background: isAmber ? 'rgba(234,179,8,0.06)' : 'var(--surface)', border: `1px solid ${isAmber ? 'rgba(234,179,8,0.2)' : 'var(--border)'}` }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isAmber ? '#ca8a04' : 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isAmber ? '#ca8a04' : 'var(--text)' }}>{isAmber ? '⚠ ' : ''}{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  initialPlate: string;
  initialVehicle: Vehicle | null;
  initialStatus: 'found' | 'not_found' | 'error';
  isHe: boolean;
  base: string;
}

export default function VehicleLookupClient({ initialPlate, initialVehicle, initialStatus, isHe, base }: Props) {
  const [plate, setPlate]       = useState(initialPlate);
  const [inputVal, setInputVal] = useState(initialPlate.replace(/\D/g, ''));
  const [vehicle, setVehicle]   = useState<Vehicle | null>(initialVehicle);
  const [status, setStatus]     = useState<'found' | 'not_found' | 'error' | 'idle'>(initialStatus === 'found' ? 'found' : initialStatus === 'not_found' ? 'not_found' : 'idle');
  const [loading, setLoading]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const resultRef               = useRef<HTMLDivElement>(null);
  const progress                = useProgressBar(loading);

  const isUk = detectCountry(inputVal) === 'uk';

  const L = isHe ? {
    placeholder: 'הזן מספר רישוי', btn: 'בדיקה', checking: 'בודק...',
    hint: 'לדוגמה: 1234567 • ניתן גם לוחית בריטית',
    notFound: 'לא נמצא רכב עם מספר רישוי זה', apiError: 'שגיאה בבדיקה, נסה שוב',
    source: 'מקור: משרד התחבורה (data.gov.il)', sourceUk: 'Source: DVLA',
    color: 'צבע', fuel: 'דלק', ownership: 'בעלות', firstRoad: 'עלייה לכביש',
    tires: 'צמיגים', vin: 'מסגרת', engine: 'מנוע',
    motValid: 'טסט בתוקף עד', motExpired: 'טסט פג תוקף',
    licValid: 'רישיון בתוקף עד', licExpired: 'רישיון פג תוקף',
    lastTest: 'טסט אחרון',
    taxPaid: 'מס דרכים בתוקף', taxNotPaid: 'מס דרכים לא שולם',
    odometer: 'קילומטראז׳ (טסט אחרון)', damage: 'היסטוריית נזק',
    damageYes: 'נרשם נזק', damageNo: 'ללא נזק רשום',
    repaint: 'צביעה מחדש', origin: 'מקור', structuralChange: 'שינוי מבנה', tireChange: 'שינוי צמיגים',
    firstReg: 'רישום ראשון', odometerNote: 'הקילומטראז׳ מדווח בטסט האחרון בלבד.',
    reviews: 'ביקורות ובעיות נפוצות', checkTitle: 'בדיקת רכב לפי מספר רישוי',
    ownershipHistory: 'היסטוריית בעלות',
    ownershipNote: 'נתוני רישום ממשרד התחבורה — לא בהכרח העברת בעלות בפועל',
    noHistory: 'אין רשומות נוספות במאגר', periodCount: 'תקופות',
    wasCommercial: 'שימוש מסחרי בעבר', currentOwnership: 'כיום',
    detailsFree: 'ישראל • בדיקה חינמית',
  } : {
    placeholder: 'Enter license plate', btn: 'Check', checking: 'Checking...',
    hint: 'e.g. 1234567 (IL) or AB12 CDE (UK)',
    notFound: 'No vehicle found with this plate number', apiError: 'Error checking vehicle, please try again',
    source: 'Source: Ministry of Transport (data.gov.il)', sourceUk: 'Source: DVLA (UK Government)',
    color: 'Color', fuel: 'Fuel', ownership: 'Ownership', firstRoad: 'First on road',
    tires: 'Tires', vin: 'VIN/Frame', engine: 'Engine',
    motValid: 'MOT valid until', motExpired: 'MOT expired',
    licValid: 'License valid until', licExpired: 'License expired',
    lastTest: 'Last MOT',
    taxPaid: 'Road tax paid', taxNotPaid: 'Road tax not paid',
    odometer: 'Last MOT odometer', damage: 'Damage history',
    damageYes: 'Damage recorded', damageNo: 'No damage recorded',
    repaint: 'Repainted', origin: 'Origin', structuralChange: 'Structural change', tireChange: 'Tire change',
    firstReg: 'First registered', odometerNote: 'Mileage at last MOT only — not current odometer.',
    reviews: 'Reviews & common issues', checkTitle: 'Israeli License Plate Lookup',
    ownershipHistory: 'Ownership History',
    ownershipNote: 'Ministry of Transport registration records',
    noHistory: 'No additional records found', periodCount: 'periods',
    wasCommercial: 'Previously used commercially', currentOwnership: 'Current',
    detailsFree: 'Israel • Free lookup',
  };

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const country = detectCountry(inputVal);
    const cleaned = country === 'uk'
      ? inputVal.replace(/[\s\-]/g, '').toUpperCase()
      : inputVal.replace(/\D/g, '');
    if (cleaned.length < 2) return;

    setLoading(true);
    setVehicle(null);
    setStatus('idle');
    setPlate(cleaned);

    // Update URL without full navigation
    window.history.pushState(null, '', `/vehicle-lookup/${encodeURIComponent(cleaned)}`);

    try {
      const res = await fetch(`/api/vehicle-lookup?plate=${encodeURIComponent(cleaned)}`);
      const data = await res.json() as { vehicle?: Vehicle; error?: string };
      if (!res.ok || data.error) {
        setStatus(res.status === 404 ? 'not_found' : 'error');
      } else if (data.vehicle) {
        setVehicle(data.vehicle);
        setStatus('found');
        // Scroll to top so the hero remains visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  const displayPlate = fmtPlate(plate);
  const v = vehicle;
  const isVehicleUk = v?.country === 'uk';
  const motExpired  = v?.validUntil ? new Date(v.validUntil) < new Date() : false;
  const taxOk       = v?.taxStatus?.toLowerCase() === 'taxed';

  return (
    <>
      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2c4d 60%, #1a3a5c 100%)', padding: '44px 0 40px', position: 'relative', overflow: 'hidden' }}>
        {/* decorative radial */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(96,165,250,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container" style={{ maxWidth: 640, position: 'relative' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', color: '#60a5fa', textTransform: 'uppercase', marginBottom: 10 }}>
            {L.detailsFree}
          </div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 8 }}>
            {L.checkTitle}
          </h1>

          {/* white search card */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginTop: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.25)' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              {/* plate input */}
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', height: 52, borderRadius: 10,
                background: isUk ? '#fff' : '#fefce8',
                border: `2px solid ${isUk ? '#f59e0b' : '#ca8a04'}`,
                overflow: 'hidden', direction: 'ltr',
                transition: 'border-color 0.2s',
              }}>
                {isUk ? (
                  <div style={{ width: 28, height: '100%', flexShrink: 0, background: '#003399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>🇬🇧</span>
                  </div>
                ) : (
                  <div style={{ width: 28, height: '100%', flexShrink: 0, background: 'linear-gradient(180deg, #003399 33%, #fff 33%, #fff 66%, #cc0000 66%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                    <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, lineHeight: 1 }}>IL</span>
                  </div>
                )}
                <input
                  ref={inputRef}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value.toUpperCase())}
                  placeholder={L.placeholder}
                  inputMode={isUk ? 'text' : 'numeric'}
                  maxLength={10}
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: '1.15rem', fontWeight: 700, color: '#1a1a1a',
                    letterSpacing: '0.08em', padding: '0 12px', fontFamily: 'monospace',
                    direction: 'ltr', textAlign: 'center',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || inputVal.replace(/[\s\-]/g, '').length < 2}
                style={{
                  height: 52, padding: '0 22px', borderRadius: 10,
                  background: loading ? '#94a3b8' : '#1b4f8a',
                  color: '#fff', border: 'none', fontWeight: 700,
                  fontSize: '0.9rem', cursor: loading ? 'default' : 'pointer',
                  flexShrink: 0, transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? L.checking : L.btn}
              </button>
            </form>

            {/* hint */}
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 8, paddingInlineStart: 2 }}>
              {L.hint}
            </div>

            {/* ── PROGRESS BAR ── */}
            {progress > 0 && (
              <div style={{ marginTop: 14, height: 4, borderRadius: 4, background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  borderRadius: 4,
                  transition: progress === 100 ? 'width 0.25s ease' : 'width 0.3s linear',
                }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RESULT ── */}
      <div ref={resultRef} className="container" style={{ maxWidth: 680, padding: '28px 16px 64px' }}>

        {status === 'found' && v && (() => {
          return (
            <>
              {/* Car identity card */}
              <div className="card" style={{ padding: '18px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
                {/* Plate badge */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    background: isVehicleUk ? '#fff' : '#fefce8',
                    border: `2px solid ${isVehicleUk ? '#f59e0b' : '#ca8a04'}`,
                    borderRadius: 8, padding: '6px 14px',
                    fontFamily: 'monospace', fontWeight: 900,
                    fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)',
                    letterSpacing: '0.08em', direction: 'ltr', color: '#1a1a1a',
                  }}>
                    {displayPlate}
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {isVehicleUk ? 'UK' : isHe ? 'ישראל' : 'IL'}
                  </span>
                </div>

                {/* Divider */}
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)', flexShrink: 0 }} />

                {/* Name block */}
                <div style={{ minWidth: 0 }}>
                  {v.makeHe && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {v.makeHe}
                    </div>
                  )}
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em', color: 'var(--text)' }}>
                    {v.name || v.makeHe}
                  </div>
                  {v.year && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',
                      }}>
                        {v.year}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {isVehicleUk ? (
                  <>
                    <StatusChip ok={!motExpired} label={motExpired ? L.motExpired : `${L.motValid} ${v.motExpiryDate ? fmtDate(v.motExpiryDate) : ''}`} />
                    <StatusChip ok={taxOk} label={taxOk ? L.taxPaid : L.taxNotPaid} />
                  </>
                ) : (
                  <>
                    {v.lastTestDate && <StatusChip ok={true} label={`${L.lastTest}: ${fmtDate(v.lastTestDate)}`} />}
                    <StatusChip ok={!motExpired} label={motExpired ? L.licExpired : `${L.licValid} ${v.validUntil ? fmtDate(v.validUntil) : ''}`} />
                    {v.hasAccident !== null && <StatusChip ok={!v.hasAccident} label={v.hasAccident ? L.damageYes : L.damageNo} warn={v.hasAccident ?? false} />}
                  </>
                )}
              </div>

              {/* Specs card */}
              <div className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
                  {isHe ? 'פרטי הרכב' : 'Vehicle Details'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                  {[
                    { label: L.color, value: v.color },
                    { label: L.fuel, value: v.fuel },
                    !isVehicleUk && { label: L.ownership, value: normalizeOwnership(v.ownership) },
                    { label: L.firstRoad, value: v.firstRoad ? fmtDate(v.firstRoad) : '' },
                    !isVehicleUk && v.frontTire && { label: L.tires, value: v.frontTire },
                    !isVehicleUk && v.vin && { label: L.vin, value: v.vin.slice(-8) },
                    isVehicleUk && v.engineCapacity && { label: L.engine, value: `${v.engineCapacity}cc` },
                    !isVehicleUk && v.firstRegistrationDate && { label: L.firstReg, value: fmtDate(v.firstRegistrationDate) },
                  ].filter(Boolean).filter((r): r is { label: string; value: string } => !!r && !!(r as { value: string }).value).map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Odometer + flags */}
              {!isVehicleUk && (v.odometer || v.wasRepainted || v.origin || v.structuralChange || v.tireChange) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {v.odometer && v.odometer > 0 && (
                    <div className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3 }}>{L.odometer}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{v.odometer.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>km</span></div>
                      </div>
                    </div>
                  )}
                  {v.wasRepainted    && <FlagRow color="amber"   label={L.repaint}          value={isHe ? 'הרכב נצבע מחדש' : 'Vehicle was repainted'} />}
                  {v.structuralChange && <FlagRow color="amber"  label={L.structuralChange} value={isHe ? 'נרשם שינוי מבנה' : 'Structural change recorded'} />}
                  {v.tireChange      && <FlagRow color="amber"   label={L.tireChange}        value={isHe ? 'שינוי צמיגים רשום' : 'Non-standard tires recorded'} />}
                  {v.origin          && <FlagRow color="neutral" label={L.origin}            value={v.origin} />}
                </div>
              )}

              {v.odometer && v.odometer > 0 && !isVehicleUk && (
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                  * {L.odometerNote}
                </p>
              )}

              {/* Ownership History */}
              {!isVehicleUk && (() => {
                const hasHistory = v.ownershipHistory?.length > 0;
                const currentEntry = { ownershipType: v.ownership, dateLabel: L.currentOwnership };
                return (
                  <div className="card" style={{ padding: '20px 22px', marginBottom: 24 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {L.ownershipHistory}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                      {L.ownershipNote}
                    </p>

                    {hasHistory && v.ownershipAnalysis && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {v.ownershipAnalysis.periodCount} {L.periodCount}
                        </span>
                        {v.ownershipAnalysis.wasCommercial && (
                          <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>
                            ! {L.wasCommercial}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ position: 'relative', paddingInlineStart: 22 }}>
                      <div style={{ position: 'absolute', insetInlineStart: 7, top: 8, bottom: 8, width: 2, background: 'var(--border)', borderRadius: 2 }} />
                      {(v.ownershipHistory ?? []).map((rec, i) => {
                        const isPrivate = rec.ownershipType === 'פרטי';
                        const isCommercial = ['סוחר', 'ליסינג', 'החכר', 'השכרה', 'חברה'].some(t => rec.ownershipType.includes(t));
                        const dotColor = isPrivate ? '#16a34a' : isCommercial ? '#ca8a04' : '#6366f1';
                        return (
                          <div key={i} style={{ position: 'relative', marginBottom: 12, paddingInlineStart: 14 }}>
                            <div style={{ position: 'absolute', insetInlineStart: -2, top: 5, width: 10, height: 10, borderRadius: '50%', background: dotColor, border: '2px solid var(--bg)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{normalizeOwnership(rec.ownershipType)}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.dateLabel}</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Only show "current" dot if there's no history OR current type differs from last history entry */}
                      {(() => {
                        const history = v.ownershipHistory ?? [];
                        const lastType = history.length > 0 ? history[history.length - 1].ownershipType : null;
                        const showCurrent = !hasHistory || lastType !== currentEntry.ownershipType;
                        if (!showCurrent) return null;
                        const isPrivate = currentEntry.ownershipType === 'פרטי';
                        const isCommercial = ['סוחר', 'ליסינג', 'החכר', 'השכרה', 'חברה'].some(t => currentEntry.ownershipType.includes(t));
                        const dotColor = isPrivate ? '#16a34a' : isCommercial ? '#ca8a04' : '#6366f1';
                        return (
                          <div style={{ position: 'relative', paddingInlineStart: 14 }}>
                            <div style={{ position: 'absolute', insetInlineStart: -2, top: 5, width: 12, height: 12, borderRadius: '50%', background: dotColor, border: '2px solid var(--bg)', boxShadow: `0 0 0 3px ${dotColor}33` }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dotColor }}>{normalizeOwnership(currentEntry.ownershipType)}</span>
                              <span style={{ fontSize: '0.72rem', color: dotColor, fontWeight: 700, fontFamily: 'monospace' }}>{currentEntry.dateLabel}</span>
                            </div>
                            {!hasHistory && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{L.noHistory}</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* CTA */}
              {v.dbMatch?.modelSlug && (
                <Link
                  href={`/cars/${v.dbMatch.makeSlug}/${v.dbMatch.modelSlug}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '13px 20px', borderRadius: 10, background: 'var(--accent)',
                    color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem',
                    marginBottom: 16,
                  }}
                >
                  {L.reviews} →
                </Link>
              )}

              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {isVehicleUk ? L.sourceUk : L.source}
              </p>
            </>
          );
        })()}

        {/* Not found */}
        {status === 'not_found' && !loading && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>
            {L.notFound}: <strong style={{ fontFamily: 'monospace' }}>{displayPlate}</strong>
          </div>
        )}

        {/* Error */}
        {status === 'error' && !loading && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>
            {L.apiError}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[100, 60, 80, 45].map((w, i) => (
              <div key={i} style={{ height: 20, borderRadius: 6, background: 'var(--surface)', width: `${w}%`, animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </>
  );
}

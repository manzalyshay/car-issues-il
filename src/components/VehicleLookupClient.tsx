'use client';

import { useState, useEffect, useRef } from 'react';
import type { ModelInfo } from '@/lib/modelInfo';
import Link from 'next/link';
import type { Vehicle } from '@/lib/vehicleLookup';
import { detectCountry } from '@/lib/vehicleLookup';
import { COLOR_EN, FUEL_EN, ORIGIN_EN, translateValue, normalizeOwnership } from '@/lib/vehicleLookupLabels';
import { AI_SCORE_CAPTION_HE, AI_SCORE_CAPTION_EN } from '@/lib/aiScore';
import { sizedImageUrl } from '@/lib/imageSizing';
import Car3DViewer from './Car3DViewer';
import ScoreSourcesInfo from './ScoreSourcesInfo';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtPlate(raw: string): string {
  const p = raw.replace(/\D/g, '');
  if (!p) return raw.toUpperCase();
  return p.length === 7
    ? `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`
    : `${p.slice(0, 3)}-${p.slice(3, 5)}-${p.slice(5)}`;
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

/** Format a slug like "corolla-cross" → "Corolla Cross" */
function slugToDisplay(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
  initialModelInfo?: ModelInfo | null;
}

export default function VehicleLookupClient({ initialPlate, initialVehicle, initialStatus, isHe, base, initialModelInfo = null }: Props) {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(initialModelInfo);
  const [plate, setPlate]       = useState(initialPlate);
  const [inputVal, setInputVal] = useState(initialPlate.replace(/\D/g, ''));
  const [vehicle, setVehicle]   = useState<Vehicle | null>(initialVehicle);
  const [status, setStatus]     = useState<'found' | 'not_found' | 'error' | 'invalid' | 'idle'>(initialStatus === 'found' ? 'found' : initialStatus === 'not_found' ? 'not_found' : 'idle');
  const [loading, setLoading]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);
  const resultRef               = useRef<HTMLDivElement>(null);
  const progress                = useProgressBar(loading);

  const isUk = detectCountry(inputVal) === 'uk';

  const L = isHe ? {
    placeholder: 'הזן מספר רישוי', btn: 'בדיקה', checking: 'בודק...',
    hint: 'לדוגמה: 1234567 • ניתן גם לוחית בריטית',
    notFound: 'לא נמצא רכב עם מספר רישוי זה', apiError: 'שגיאה בבדיקה, נסה שוב',
    invalidInput: 'הזן מספר רישוי של 7 או 8 ספרות',
    source: 'הנתונים מתעדכנים אחת ליום', sourceUk: 'הנתונים מתעדכנים אחת ליום',
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
    ownershipNote: 'נתוני רישום רשמיים - לא בהכרח העברת בעלות בפועל',
    noHistory: 'אין רשומות נוספות במאגר', periodCount: 'תקופות',
    wasCommercial: 'שימוש מסחרי בעבר', currentOwnership: 'כיום',
    detailsFree: 'ישראל • בדיקה חינמית',
    recallsChip: 'בדקו ריקולים פתוחים לדגם', modelImageCaption: 'תמונה להמחשה',
    fullModelPage: 'לעמוד הדגם המלא ←', fuelHybridSuffix: 'היברידי',
    whatToKnow: 'מה כדאי לדעת על הדגם הזה', whatToKnowSub: 'לפני שקונים - מה בעלים ומעבדות דיווחו',
    commonProblems: 'בעיות נפוצות', mostReported: 'הכי מדווח', allProblems: 'ראו את כל הבעיות ←',
    recallsForModel: 'ריקולים לדגם', recallsCount: 'קריאות שירות', noRecalls: 'אין ריקולים ידועים לדגם זה', recallsDetails: 'לפרטי הריקולים ←',
    repairCosts: 'עלויות תיקון', repairCostsSub: 'טיפול שנתי ותיקונים נפוצים', repairCostsLink: 'למחירון התיקונים ←',
    recentReviews: 'ביקורות אחרונות של בעלי', allReviewsLink: 'לכל הביקורות ←', writeReview: 'כתבו ביקורת',
    fullRegistry: 'כל פרטי הרישוי', manufacturer: 'יצרן', model: 'דגם', year: 'שנת ייצור', frame: 'מסגרת',
    reliabilityScore: 'ציון הדגם', notEnoughData: 'אין מספיק נתונים', noSources: 'אין מקורות מבחן ישימים לשנה/דגם זה', ownersReportMostly: 'בעלים מדווחים בעיקר על',
    compareSimilar: 'השוו לרכבים דומים', comparison: 'השוואה',
    consideringBuying: 'שוקלים לקנות את הרכב הזה?', consideringBuyingDesc: 'רשימת בדיקה לקנייה יד 2 - מה לבדוק במוסך לפני שסוגרים.', checklistLink: 'לרשימת הבדיקה ←',
  } : {
    placeholder: 'Enter license plate', btn: 'Check', checking: 'Checking...',
    hint: 'e.g. 1234567 (IL) or AB12 CDE (UK)',
    notFound: 'No vehicle found with this plate number', apiError: 'Error checking vehicle, please try again',
    invalidInput: 'Enter a license plate with 7 or 8 digits',
    source: 'Data updates once a day', sourceUk: 'Data updates once a day',
    color: 'Color', fuel: 'Fuel', ownership: 'Ownership', firstRoad: 'First on road',
    tires: 'Tires', vin: 'VIN/Frame', engine: 'Engine',
    motValid: 'MOT valid until', motExpired: 'MOT expired',
    licValid: 'License valid until', licExpired: 'License expired',
    lastTest: 'Last MOT',
    taxPaid: 'Road tax paid', taxNotPaid: 'Road tax not paid',
    odometer: 'Last MOT odometer', damage: 'Damage history',
    damageYes: 'Damage recorded', damageNo: 'No damage recorded',
    repaint: 'Repainted', origin: 'Origin', structuralChange: 'Structural change', tireChange: 'Tire change',
    firstReg: 'First registered', odometerNote: 'Mileage at last MOT only - not current odometer.',
    reviews: 'Reviews & common issues', checkTitle: 'Israeli License Plate Lookup',
    ownershipHistory: 'Ownership History',
    ownershipNote: 'Official registration records',
    noHistory: 'No additional records found', periodCount: 'periods',
    wasCommercial: 'Previously used commercially', currentOwnership: 'Current',
    detailsFree: 'Israel • Free lookup',
    recallsChip: 'Check open recalls for this model', modelImageCaption: 'Illustrative photo',
    fullModelPage: 'Full model page →', fuelHybridSuffix: 'Hybrid',
    whatToKnow: 'What to know about this model', whatToKnowSub: 'Before you buy - what owners and shops reported',
    commonProblems: 'Common problems', mostReported: 'Most reported', allProblems: 'See all problems →',
    recallsForModel: 'Recalls for this model', recallsCount: 'service bulletins', noRecalls: 'No known recalls for this model', recallsDetails: 'Recall details →',
    repairCosts: 'Repair costs', repairCostsSub: 'Annual service and common repairs', repairCostsLink: 'Repair price list →',
    recentReviews: 'Recent reviews from owners of', allReviewsLink: 'All reviews →', writeReview: 'Write a review',
    fullRegistry: 'Full registration details', manufacturer: 'Manufacturer', model: 'Model', year: 'Year', frame: 'Frame',
    reliabilityScore: 'Model score', notEnoughData: 'Not enough data', noSources: 'No applicable test sources for this year/model', ownersReportMostly: 'Owners mostly report',
    compareSimilar: 'Compare to similar vehicles', comparison: 'Compare',
    consideringBuying: 'Considering buying this vehicle?', consideringBuyingDesc: 'A used-buying checklist - what to check at the garage before closing the deal.', checklistLink: 'Checklist →',
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
    setModelInfo(null);
    setStatus('idle');
    setPlate(cleaned);

    // Update URL without full navigation
    window.history.pushState(null, '', `/vehicle-lookup/${encodeURIComponent(cleaned)}`);

    try {
      const res = await fetch(`/api/vehicle-lookup?plate=${encodeURIComponent(cleaned)}`, {
        signal: AbortSignal.timeout(20000),
      });
      const data = await res.json() as { vehicle?: Vehicle; modelInfo?: ModelInfo | null; error?: string };
      if (!res.ok || data.error) {
        setStatus(res.status === 404 ? 'not_found' : res.status === 400 ? 'invalid' : 'error');
      } else if (data.vehicle) {
        setVehicle(data.vehicle);
        setModelInfo(data.modelInfo ?? null);
        setStatus('found');
        // Scroll to top so the hero remains visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      // Covers network failure and the 20s timeout above - either way the
      // request can no longer resolve on its own, so surface a clear error
      // instead of leaving the "searching" state up forever. The form stays
      // enabled, so re-submitting is the retry path.
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
      {/* ── Compact search band ── */}
      <div className="vl-band" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2c4d 60%, #1a3a5c 100%)', padding: 'clamp(20px,3vw,28px) 0 clamp(90px,10vw,120px)', position: 'relative', overflow: 'hidden' }}>
        {/* decorative radial */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(96,165,250,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container" style={{ maxWidth: 1240, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', color: '#60a5fa', textTransform: 'uppercase' }}>
              {L.detailsFree}
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2 }}>
              {L.checkTitle}
            </h1>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '0 1 460px', minWidth: 280 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', height: 48, borderRadius: 10,
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
                  <div style={{ width: 28, height: '100%', flexShrink: 0, background: '#003399', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <svg width="18" height="13" viewBox="0 0 22 16" aria-hidden="true" style={{ display: 'block', borderRadius: 1 }}>
                      <rect width="22" height="16" fill="#fff" />
                      <rect y="1.5" width="22" height="2.4" fill="#0038b8" />
                      <rect y="12.1" width="22" height="2.4" fill="#0038b8" />
                      <g fill="none" stroke="#0038b8" strokeWidth="0.9">
                        <polygon points="11,4.9 13.6,9.4 8.4,9.4" />
                        <polygon points="11,11.1 8.4,6.6 13.6,6.6" />
                      </g>
                    </svg>
                    <span style={{ fontSize: 9, color: '#fff', fontWeight: 800, lineHeight: 1 }}>IL</span>
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
                    fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a',
                    letterSpacing: '0.08em', padding: '0 12px', fontFamily: 'monospace',
                    direction: 'ltr', textAlign: 'center', minWidth: 0,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || inputVal.replace(/[\s\-]/g, '').length < 2}
                style={{
                  height: 48, padding: '0 22px', borderRadius: 10,
                  background: loading ? '#94a3b8' : 'var(--accent)',
                  color: '#fff', border: 'none', fontWeight: 700,
                  fontSize: '0.9rem', cursor: loading ? 'default' : 'pointer',
                  flexShrink: 0, transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? L.checking : L.btn}
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', paddingInlineStart: 2 }}>
              {L.hint}
            </div>
            {progress > 0 && (
              <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  borderRadius: 4,
                  transition: progress === 100 ? 'width 0.25s ease' : 'width 0.3s linear',
                }} />
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ── RESULT ── */}
      <div ref={resultRef} className="container vl-result" style={{ maxWidth: 1240, margin: 'clamp(-70px,-7vw,-96px) auto 0', padding: '0 16px 64px', position: 'relative' }}>

        {status === 'found' && v && (() => {
          return (
            <>
              {(() => {
                const fuelValue = isHe ? v.fuel : translateValue(v.fuel, FUEL_EN);
                const fuelDisplay = (v.fuel === 'בנזין' && modelInfo?.isHybrid) ? `${fuelValue} · ${L.fuelHybridSuffix}` : fuelValue;
                const history = !isVehicleUk ? (v.ownershipHistory ?? []) : [];
                const hasHistory = history.length > 0;
                const currentEntry = { ownershipType: v.ownership, dateLabel: L.currentOwnership };
                const lastType = history.length > 0 ? history[history.length - 1].ownershipType : null;
                const showCurrent = !hasHistory || lastType !== currentEntry.ownershipType;
                const displayedPeriodCount = history.length + (showCurrent ? 1 : 0);
                const dotColorFor = (type: string) => {
                  const isPrivate = type === 'פרטי';
                  const isCommercial = ['סוחר', 'ליסינג', 'החכר', 'השכרה', 'חברה'].some(t => type.includes(t));
                  return isPrivate ? '#16a34a' : isCommercial ? '#ca8a04' : '#6366f1';
                };
                return (
            <>
              {/* ── Result card ── */}
              <article className="card vl-card" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'hidden', padding: 0, marginBottom: 28 }}>
                <div className="vl-summary" style={{ flex: '999 1 560px', minWidth: 0, padding: 'clamp(20px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    {/* Plate badge (hidden on phones - the search box right above already shows the number) */}
                    <div className="vl-plate-badge" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
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
                      <span className="vl-muted" style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {isVehicleUk ? 'UK' : isHe ? 'ישראל' : 'IL'}
                      </span>
                    </div>

                    {/* Name block */}
                    <div style={{ minWidth: 0 }}>
                      {v.makeHe && (
                        <div className="vl-muted" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                          {isHe ? v.makeHe : (v.dbMatch?.makeSlug ? slugToDisplay(v.dbMatch.makeSlug) : v.makeHe)}
                          {v.year ? ` · ${v.year}` : ''}
                        </div>
                      )}
                      <div className="vl-name" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.01em', color: 'var(--text)' }}>
                        {isHe ? (v.name || v.makeHe) : (v.dbMatch?.modelSlug ? slugToDisplay(v.dbMatch.modelSlug) : v.name || v.makeHe)}
                      </div>
                    </div>

                    {/* Phones: model score sits at the side of the name (the separate score card is hidden there) */}
                    {modelInfo && modelInfo.aiScore != null && modelInfo.yearsCovered && (
                      <div className="vl-m-only" style={{ marginInlineStart: 'auto', textAlign: 'center' }}>
                        <svg width="60" height="60" viewBox="0 0 84 84" role="img" aria-label={`${L.reliabilityScore} ${modelInfo.aiScore.toFixed(1)} / 10`} style={{ display: 'block', margin: '0 auto' }}>
                          <circle cx="42" cy="42" r="36" fill="none" stroke="#2a3c63" strokeWidth="9" />
                          <circle cx="42" cy="42" r="36" fill="none" stroke={modelInfo.aiScore >= 7.5 ? 'var(--good)' : 'var(--warn)'} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(modelInfo.aiScore / 10) * 226} 226`} transform="rotate(-90 42 42)" />
                          <text x="42" y="50" textAnchor="middle" fontFamily="Heebo, sans-serif" fontSize="25" fontWeight="800" fill="#fff">{modelInfo.aiScore.toFixed(1)}</text>
                        </svg>
                        <div className="vl-muted" style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {L.reliabilityScore}
                          {modelInfo.proReviewScoreSets && modelInfo.proReviewScoreSets.length > 0 && (
                            <ScoreSourcesInfo sets={modelInfo.proReviewScoreSets} isHe={isHe} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status chips */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isVehicleUk ? (
                      <>
                        <StatusChip ok={!motExpired} label={motExpired ? L.motExpired : `${L.motValid} ${v.motExpiryDate ? fmtDate(v.motExpiryDate) : ''}`} />
                        <StatusChip ok={taxOk} label={taxOk ? L.taxPaid : L.taxNotPaid} />
                      </>
                    ) : (
                      <>
                        {v.lastTestDate && <StatusChip ok={!motExpired} label={`${L.lastTest}: ${fmtDate(v.lastTestDate)}`} />}
                        <StatusChip ok={!motExpired} label={motExpired ? L.licExpired : `${L.licValid} ${v.validUntil ? fmtDate(v.validUntil) : ''}`} />
                        {v.hasAccident !== null && <StatusChip ok={!v.hasAccident} label={v.hasAccident ? L.damageYes : L.damageNo} warn={v.hasAccident ?? false} />}
                      </>
                    )}
                    {modelInfo && modelInfo.recallCount > 0 && (
                      <Link href={`${modelInfo.modelUrl}?tab=recalls`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bad-bg)', color: 'var(--bad)', fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 20, textDecoration: 'none' }}>
                        ⚠ {L.recallsChip}
                      </Link>
                    )}
                  </div>

                  {/* Summary specs */}
                  <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px 20px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    {[
                      { label: L.color, value: isHe ? v.color : translateValue(v.color, COLOR_EN) },
                      { label: L.fuel, value: fuelDisplay },
                      !isVehicleUk && { label: L.ownership, value: normalizeOwnership(v.ownership, isHe) },
                      { label: L.firstRoad, value: v.firstRoad ? fmtDate(v.firstRoad) : '' },
                    ].filter(Boolean).filter((r): r is { label: string; value: string } => !!r && !!(r as { value: string }).value).map(({ label, value }) => (
                      <div key={label}>
                        <dt style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</dt>
                        <dd style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Model visual panel — 3D when the generation matches the car's year, else a
                    photo only when the model's own covered years include this car, else nothing.
                    A single model-wide photo has no reliable generation tag of its own, so it is
                    only trustworthy when the vehicle's year falls inside what the site covers. */}
                {modelInfo && (modelInfo.sketchfabModel || (modelInfo.leadingImageUrl && modelInfo.yearsCovered)) && (
                  <div className="vl-visual" style={{ flex: '1 1 320px', minWidth: 0, background: 'var(--surface-2)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 260 }}>
                    {modelInfo.sketchfabModel ? (
                      <div style={{ width: '100%', maxWidth: 320, aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden' }}>
                        <Car3DViewer
                          uid={modelInfo.sketchfabModel.uid}
                          modelName={modelInfo.name}
                          makeSlug={v.dbMatch?.makeSlug}
                          modelSlug={v.dbMatch?.modelSlug}
                          carImageUrl={modelInfo.leadingImageUrl ?? undefined}
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sizedImageUrl(modelInfo.leadingImageUrl, 400) ?? undefined} alt={modelInfo.name} style={{ width: '100%', maxWidth: 320, aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12 }} />
                    )}
                    <span style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>{L.modelImageCaption} · {modelInfo.name}</span>
                  </div>
                )}

                {/* Phones: the score card's content (top faults + model page link), merged into this card */}
                {modelInfo && (
                  <div className="vl-m-only vl-summary-extra" style={{ flex: '1 1 100%', padding: '0 16px 22px' }}>
                    {modelInfo.topProblems.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#fff' }}>{L.ownersReportMostly}</div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {modelInfo.topProblems.map((p) => (
                            <li key={p.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, color: '#dfe6f3' }}>
                              <span>{p.title}</span>
                              <span style={{ color: p.severity === 'שכיח' ? 'var(--warn)' : '#aab6cf', flexShrink: 0 }}>{p.severity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Link href={modelInfo.modelUrl} style={{ display: 'block', background: 'var(--accent)', color: '#fff', textDecoration: 'none', textAlign: 'center', borderRadius: 12, padding: 14, fontSize: 16, fontWeight: 700 }}>
                      {L.fullModelPage}
                    </Link>
                  </div>
                )}
              </article>

              {/* ── Body: main + rail ── */}
              <div className="vl-body-cols" style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>

                {/* MAIN column */}
                <main className="vl-col-main" style={{ flex: '999 1 600px', minWidth: 0, gap: 24 }}>

                  {/* o1: what to know */}
                  {modelInfo && (modelInfo.problems.length > 0 || modelInfo.repairCostTeaser || true) && (
                    <section className="vl-o1 card" style={{ padding: 'clamp(18px,4vw,28px)' }}>
                      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{L.whatToKnow}</h2>
                      <p style={{ margin: '6px 0 20px', fontSize: 15, color: 'var(--text-muted)' }}>{L.whatToKnowSub}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
                        {modelInfo.problems.length > 0 && (
                          <Link href={modelInfo.issuesUrl} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 18, textDecoration: 'none', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--warn-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔧</span>
                            <span style={{ fontSize: 17, fontWeight: 700 }}>{L.commonProblems}</span>
                            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{L.mostReported}: {modelInfo.problems[0].items[0]}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 'auto' }}>{L.allProblems}</span>
                          </Link>
                        )}
                        <Link href={`${modelInfo.modelUrl}?tab=recalls`} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 18, textDecoration: 'none', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bad-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚠️</span>
                          <span style={{ fontSize: 17, fontWeight: 700 }}>{L.recallsForModel}</span>
                          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{modelInfo.recallCount > 0 ? `${modelInfo.recallCount} ${L.recallsCount}` : L.noRecalls}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 'auto' }}>{L.recallsDetails}</span>
                        </Link>
                        {modelInfo.repairCostTeaser && (
                          <Link href={`${modelInfo.modelUrl}#repair`} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 18, textDecoration: 'none', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>₪</span>
                            <span style={{ fontSize: 17, fontWeight: 700 }}>{L.repairCosts}</span>
                            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{modelInfo.repairCostTeaser}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 'auto' }}>{L.repairCostsLink}</span>
                          </Link>
                        )}
                      </div>
                    </section>
                  )}

                  {/* o3: recent reviews - hidden when there are none (no empty box) */}
                  {modelInfo && modelInfo.recentReviews.length > 0 && (
                    <section className="vl-o3 card" style={{ padding: 'clamp(18px,4vw,28px)' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{L.recentReviews} {modelInfo.name}</h2>
                        {modelInfo.reviewCount > 0 && <Link href={`${modelInfo.modelUrl}#reviews`} style={{ fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>{L.allReviewsLink}</Link>}
                      </div>
                      {modelInfo.recentReviews.length > 0 && (
                        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                          {modelInfo.recentReviews.map((rv) => (
                            <figure key={rv.id} style={{ margin: 0, background: 'var(--surface-2)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--star)', fontSize: 16, letterSpacing: 2 }}>
                                  {'★'.repeat(rv.rating)}<span style={{ color: 'var(--star-empty)' }}>{'★'.repeat(5 - rv.rating)}</span>
                                </span>
                              </div>
                              <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text)' }}>{isHe ? rv.title : (rv.titleEn ?? rv.title)}{isHe ? ` ${rv.body}` : ` ${rv.bodyEn ?? ''}`}</blockquote>
                              <figcaption style={{ fontSize: 13, color: 'var(--text-muted)' }}>{rv.authorName}{rv.mileage ? ` · ${rv.mileage.toLocaleString()} ${isHe ? 'ק״מ' : 'km'}` : ''}</figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                      <Link href={`${modelInfo.modelUrl}#write-review`} style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px dashed var(--border-strong)', borderRadius: 14, padding: 14, textDecoration: 'none', fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
                        + {L.writeReview}
                      </Link>
                    </section>
                  )}

                  {/* o4: full registry details */}
                  <section className="vl-o4 card" style={{ padding: 'clamp(18px,4vw,28px)' }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>{L.fullRegistry}</h2>
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px 24px' }}>
                      {[
                        { label: L.manufacturer, value: isHe ? v.makeHe : (v.dbMatch?.makeSlug ? slugToDisplay(v.dbMatch.makeSlug) : v.makeHe) },
                        { label: L.model, value: isHe ? (v.name || v.makeHe) : (v.dbMatch?.modelSlug ? slugToDisplay(v.dbMatch.modelSlug) : v.name || v.makeHe) },
                        v.year && { label: L.year, value: String(v.year) },
                        !isVehicleUk && v.frontTire && { label: L.tires, value: v.frontTire },
                        !isVehicleUk && v.vin && { label: L.frame, value: v.vin.slice(-8) },
                        isVehicleUk && v.engineCapacity && { label: L.engine, value: `${v.engineCapacity}cc` },
                        !isVehicleUk && v.firstRegistrationDate && { label: L.firstReg, value: fmtDate(v.firstRegistrationDate) },
                      ].filter(Boolean).filter((r): r is { label: string; value: string } => !!r && !!(r as { value: string }).value).map(({ label, value }) => (
                        <div key={label}>
                          <dt style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</dt>
                          <dd style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 600 }}>{value}</dd>
                        </div>
                      ))}
                    </dl>

                    {/* Odometer + flags */}
                    {!isVehicleUk && (v.odometer || v.wasRepainted || v.origin || v.structuralChange || v.tireChange) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                        {v.odometer && v.odometer > 0 && (
                          <div style={{ padding: '14px 18px', borderRadius: 9, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3 }}>{L.odometer}</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{v.odometer.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>km</span></div>
                            </div>
                          </div>
                        )}
                        {v.wasRepainted    && <FlagRow color="amber"   label={L.repaint}          value={isHe ? 'הרכב נצבע מחדש' : 'Vehicle was repainted'} />}
                        {v.structuralChange && <FlagRow color="amber"  label={L.structuralChange} value={isHe ? 'נרשם שינוי מבנה' : 'Structural change recorded'} />}
                        {v.tireChange      && <FlagRow color="amber"   label={L.tireChange}        value={isHe ? 'שינוי צמיגים רשום' : 'Non-standard tires recorded'} />}
                        {v.origin          && <FlagRow color="neutral" label={L.origin}            value={isHe ? v.origin : translateValue(v.origin, ORIGIN_EN)} />}
                      </div>
                    )}
                    {v.odometer && v.odometer > 0 && !isVehicleUk && (
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>* {L.odometerNote}</p>
                    )}

                    {/* Ownership History */}
                    {!isVehicleUk && (
                      <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{L.ownershipHistory}</h3>
                        <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>{L.ownershipNote}</p>
                        {v.ownershipAnalysis && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600 }}>
                              {isHe
                                ? (displayedPeriodCount === 1 ? 'תקופה אחת' : `${displayedPeriodCount} תקופות`)
                                : `${displayedPeriodCount} ${displayedPeriodCount === 1 ? 'period' : 'periods'}`}
                            </span>
                            {v.ownershipAnalysis.wasCommercial && (
                              <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', fontSize: '0.75rem', fontWeight: 600, color: '#92400e' }}>
                                {L.wasCommercial} !
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ position: 'relative', paddingInlineStart: 22 }}>
                          <div style={{ position: 'absolute', insetInlineStart: 7, top: 8, bottom: 8, width: 2, background: 'var(--border)', borderRadius: 2 }} />
                          {history.map((rec, i) => (
                            <div key={i} style={{ position: 'relative', marginBottom: 12, paddingInlineStart: 14 }}>
                              <div style={{ position: 'absolute', insetInlineStart: -2, top: 5, width: 10, height: 10, borderRadius: '50%', background: dotColorFor(rec.ownershipType), border: '2px solid var(--bg)' }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{normalizeOwnership(rec.ownershipType, isHe)}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.dateLabel}</span>
                              </div>
                            </div>
                          ))}
                          {showCurrent && (
                            <div style={{ position: 'relative', paddingInlineStart: 14 }}>
                              <div style={{ position: 'absolute', insetInlineStart: -2, top: 5, width: 12, height: 12, borderRadius: '50%', background: dotColorFor(currentEntry.ownershipType), border: '2px solid var(--bg)', boxShadow: `0 0 0 3px ${dotColorFor(currentEntry.ownershipType)}33` }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: dotColorFor(currentEntry.ownershipType) }}>{normalizeOwnership(currentEntry.ownershipType, isHe)}</span>
                                <span style={{ fontSize: '0.72rem', color: dotColorFor(currentEntry.ownershipType), fontWeight: 700, fontFamily: 'monospace' }}>{currentEntry.dateLabel}</span>
                              </div>
                              {!hasHistory && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{L.noHistory}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                </main>

                {/* RAIL column */}
                {modelInfo && (
                  <aside className="vl-col-rail" aria-label={isHe ? 'על הדגם' : 'About this model'} style={{ flex: '1 1 340px', minWidth: 0, gap: 20 }}>

                    {/* o2: model score */}
                    <section className="vl-o2" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--r)', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {modelInfo.aiScore != null && modelInfo.yearsCovered ? (
                          <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`${modelInfo.aiScore.toFixed(1)} / 10`}>
                            <circle cx="42" cy="42" r="36" fill="none" stroke="#2a3c63" strokeWidth="8" />
                            <circle cx="42" cy="42" r="36" fill="none" stroke={modelInfo.aiScore >= 7.5 ? 'var(--good)' : 'var(--warn)'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(modelInfo.aiScore / 10) * 226} 226`} transform="rotate(-90 42 42)" />
                            <text x="42" y="49" textAnchor="middle" fontFamily="Heebo, sans-serif" fontSize="22" fontWeight="800" fill="#fff">{modelInfo.aiScore.toFixed(1)}</text>
                          </svg>
                        ) : (
                          <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={L.notEnoughData}>
                            <circle cx="42" cy="42" r="36" fill="none" stroke="#2a3c63" strokeWidth="8" />
                            <text x="42" y="47" textAnchor="middle" fontFamily="Heebo, sans-serif" fontSize="11" fontWeight="700" fill="#aab6cf">{L.notEnoughData}</text>
                          </svg>
                        )}
                        <div>
                          <div style={{ fontSize: 13, color: '#aab6cf', display: 'flex', alignItems: 'center' }}>
                            {L.reliabilityScore}
                            {modelInfo.aiScore != null && modelInfo.yearsCovered && modelInfo.proReviewScoreSets && modelInfo.proReviewScoreSets.length > 0 && (
                              <ScoreSourcesInfo sets={modelInfo.proReviewScoreSets} isHe={isHe} />
                            )}
                          </div>
                          {modelInfo.aiScore != null && modelInfo.yearsCovered && (!modelInfo.proReviewScoreSets || modelInfo.proReviewScoreSets.length === 0) && (
                            <div style={{ fontSize: 11, color: '#aab6cf', marginTop: 2 }}>{L.noSources}</div>
                          )}
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{modelInfo.name}</div>
                        </div>
                      </div>
                      {modelInfo.aiScore != null && modelInfo.yearsCovered && (
                        <p style={{ margin: 0, fontSize: 11.5, color: '#aab6cf', lineHeight: 1.5 }}>
                          {isHe ? AI_SCORE_CAPTION_HE : AI_SCORE_CAPTION_EN}
                        </p>
                      )}
                      {modelInfo.topProblems.length > 0 && (
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{L.ownersReportMostly}</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {modelInfo.topProblems.map((p) => (
                              <li key={p.title} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#dfe6f3' }}>
                                <span>{p.title}</span>
                                <span style={{ color: p.severity === 'שכיח' ? 'var(--warn)' : '#aab6cf' }}>{p.severity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Link href={modelInfo.modelUrl} style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none', textAlign: 'center', borderRadius: 12, padding: 14, fontSize: 16, fontWeight: 700 }}>
                        {L.fullModelPage}
                      </Link>
                    </section>

                    {/* o5: compare similar */}
                    {modelInfo.compares.length > 0 && (
                      <section className="vl-o5 card" style={{ padding: 22 }}>
                        <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>{L.compareSimilar}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {modelInfo.compares.map((c) => (
                            <Link key={c.path} href={c.path} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, textDecoration: 'none', color: 'var(--text)' }}>
                              <span style={{ fontWeight: 600 }}>{c.label}</span>
                              <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>{L.comparison}</span>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* o6: checklist CTA */}
                    <section className="vl-o6" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', borderRadius: 'var(--r)', padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{L.consideringBuying}</h2>
                      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{L.consideringBuyingDesc}</p>
                      <Link href="/checklist" style={{ fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>{L.checklistLink}</Link>
                    </section>
                  </aside>
                )}
              </div>

              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 28 }}>
                {isVehicleUk ? L.sourceUk : L.source}
              </p>
            </>
                );
              })()}
            </>
          );
        })()}

        {/* Not found */}
        {status === 'not_found' && !loading && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>
            {L.notFound}: <strong style={{ fontFamily: 'monospace' }}>{displayPlate}</strong>
          </div>
        )}

        {/* Invalid input */}
        {status === 'invalid' && !loading && (
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.9rem', textAlign: 'center' }}>
            {L.invalidInput}
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
        .vl-col-main, .vl-col-rail { display: flex; flex-direction: column; }
        .vl-m-only { display: none; }
        @media (max-width: 960px) {
          /* !important: the container's inline alignItems:flex-start otherwise shrinks cards to content width */
          .vl-body-cols { flex-direction: column !important; flex-wrap: nowrap !important; align-items: stretch !important; gap: 16px !important; }
          .vl-col-main, .vl-col-rail { display: contents; }
          /* Buyer facts first: registry, mileage and ownership history; then model context */
          .vl-o4 { order: 1; } .vl-o1 { order: 2; } .vl-o2 { order: 3; }
          .vl-o5 { order: 4; } .vl-o3 { order: 5; } .vl-o6 { order: 6; }
        }
        @media (max-width: 600px) {
          /* Phones: the search band and the vehicle summary read as one continuous blue block */
          .vl-band { padding-bottom: 4px !important; background: #0f2c4d !important; }
          .vl-result { margin-top: 0 !important; }
          .vl-card { margin: 0 -16px 16px !important; border-radius: 0 !important; border: 0 !important; box-shadow: none !important; }
          .vl-summary { background: #0f2c4d; color: #f1f5f9; padding-top: 12px !important; }
          .vl-summary .vl-name { color: #fff !important; }
          .vl-summary .vl-muted, .vl-summary dt { color: #9fb3d1 !important; }
          .vl-summary dl { border-top-color: rgba(255,255,255,.16) !important; }
          .vl-visual { min-height: 0 !important; padding: 4px 16px 20px !important; background: #0f2c4d !important; }
          .vl-visual > span { color: #9fb3d1 !important; }
          .vl-m-only { display: block; }
          .vl-plate-badge { display: none !important; }
          .vl-summary-extra { background: #0f2c4d; }
          .vl-o2 { display: none !important; }
          .vl-visual > img, .vl-visual > div { max-width: 240px !important; }
        }
      `}</style>
    </>
  );
}

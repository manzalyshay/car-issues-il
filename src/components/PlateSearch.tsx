'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Vehicle } from '@/lib/vehicleLookup';

interface Props { isHe: boolean; navigateOnSearch?: boolean; initialVehicle?: Vehicle | null; initialPlate?: string; }

function fmtDate(raw: string) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isExpired(raw: string) {
  if (!raw) return false;
  return new Date(raw) < new Date();
}

export default function PlateSearch({ isHe, navigateOnSearch, initialVehicle, initialPlate }: Props) {
  const router                  = useRouter();
  const [plate, setPlate]       = useState(initialPlate ?? '');
  const [loading, setLoading]   = useState(false);
  const [vehicle, setVehicle]   = useState<Vehicle | null>(initialVehicle ?? null);
  const [error, setError]       = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const t = isHe ? {
    placeholder: 'הזן מספר רכב',
    btn: 'בדוק רכב',
    loading: 'מחפש...',
    notFound: 'לא נמצא רכב עם מספר זה',
    apiError: 'שגיאה בבדיקת הרכב, נסה שוב',
    testValid: 'טסט בתוקף עד',
    testExpired: 'טסט פג תוקף',
    validUntil: 'רישיון בתוקף עד',
    expired: 'רישיון פג תוקף',
    firstRoad: 'עלייה לכביש',
    fuel: 'דלק',
    color: 'צבע',
    ownership: 'בעלות',
    tires: 'צמיגים',
    vin: 'מסגרת',
    viewModel: 'לביקורות ובעיות נפוצות →',
    yearPage: 'לשנת',
    source: 'מקור: משרד התחבורה (data.gov.il)',
    odometer: 'ק"מ בטסט אחרון',
    accident: 'היסטוריית נזק',
    accidentYes: '⚠ נרשם נזק',
    accidentNo: '✓ ללא נזק רשום',
    repaint: 'צבע',
    repaintYes: 'הרכב נצבע מחדש',
    origin: 'מקור',
    hint: 'לדוגמה: 1234567 או 12-345-67',
  } : {
    placeholder: 'Enter license plate',
    btn: 'Check Vehicle',
    loading: 'Searching...',
    notFound: 'No vehicle found with this plate number',
    apiError: 'Error checking vehicle, please try again',
    testValid: 'Last test',
    testExpired: 'Test expired',
    validUntil: 'License valid until',
    expired: 'License expired',
    firstRoad: 'First registered',
    fuel: 'Fuel',
    color: 'Color',
    ownership: 'Ownership',
    tires: 'Tires',
    vin: 'VIN/Frame',
    viewModel: 'View reviews & common issues →',
    yearPage: 'Year',
    source: 'Source: Ministry of Transport (data.gov.il)',
    odometer: 'Odometer (last test)',
    accident: 'Damage history',
    accidentYes: '⚠ Damage recorded',
    accidentNo: '✓ No damage recorded',
    repaint: 'Color',
    repaintYes: 'Vehicle was repainted',
    origin: 'Origin',
    hint: 'e.g. 1234567 or 12-345-67',
  };

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = plate.replace(/\D/g, '');
    if (cleaned.length < 5) return;
    setLoading(true);
    setVehicle(null);
    setError(null);
    try {
      const res = await fetch(`/api/vehicle-lookup?plate=${cleaned}`);
      const d = await res.json() as { vehicle?: Vehicle; error?: string };
      if (!res.ok || d.error) {
        setError(res.status === 404 ? t.notFound : t.apiError);
      } else if (d.vehicle) {
        if (navigateOnSearch) {
          router.push(`/vehicle-lookup/${cleaned}`);
        } else {
          setVehicle(d.vehicle);
        }
      }
    } catch {
      setError(t.apiError);
    } finally {
      setLoading(false);
    }
  }

  const testExpired  = vehicle ? isExpired(vehicle.lastTestDate) : false;
  const licExpired   = vehicle ? isExpired(vehicle.validUntil) : false;
  const match        = vehicle?.dbMatch;

  return (
    <div>
      {/* Input */}
      <form onSubmit={search} style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          height: 54, borderRadius: 12,
          background: '#fefce8',
          border: '2px solid #ca8a04',
          overflow: 'hidden',
          direction: 'ltr',
        }}>
          {/* Israeli plate flag strip */}
          <div style={{
            width: 28, height: '100%', flexShrink: 0,
            background: 'linear-gradient(180deg, #003399 33%, #fff 33%, #fff 66%, #cc0000 66%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 4,
          }}>
            <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, lineHeight: 1, letterSpacing: 0 }}>IL</span>
          </div>
          <input
            ref={inputRef}
            value={plate}
            onChange={e => setPlate(e.target.value)}
            placeholder={t.placeholder}
            inputMode="numeric"
            maxLength={10}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: '1.1rem', fontWeight: 700,
              color: '#1a1a1a', letterSpacing: '0.08em',
              padding: '0 12px',
              fontFamily: 'monospace',
              direction: 'ltr', textAlign: 'center',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || plate.replace(/\D/g,'').length < 5}
          style={{
            height: 54, padding: '0 22px', borderRadius: 12,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '0.9rem',
            cursor: 'pointer', flexShrink: 0,
            opacity: loading || plate.replace(/\D/g,'').length < 5 ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? t.loading : t.btn}
        </button>
      </form>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, paddingInlineStart: 4 }}>
        {t.hint}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Result card */}
      {vehicle && (
        <div style={{
          marginTop: 16, borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          overflow: 'hidden',
          maxWidth: 480,
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
                {vehicle.name || vehicle.makeHe}
              </div>
              {vehicle.year && (
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>{vehicle.year}</div>
              )}
            </div>
            {/* Plate badge */}
            <div style={{
              background: '#fefce8', border: '2px solid #ca8a04',
              borderRadius: 6, padding: '4px 10px',
              fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem',
              color: '#1a1a1a', letterSpacing: '0.06em', flexShrink: 0,
              direction: 'ltr',
            }}>
              {vehicle.displayPlate}
            </div>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Test + license row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: testExpired ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                border: `1px solid ${testExpired ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: testExpired ? '#dc2626' : '#16a34a', textTransform: 'uppercase', marginBottom: 2 }}>
                  {testExpired ? '⚠ ' + t.testExpired : '✓ ' + t.testValid}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                  {fmtDate(vehicle.lastTestDate)}
                </div>
              </div>
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: licExpired ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                border: `1px solid ${licExpired ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: licExpired ? '#dc2626' : '#16a34a', textTransform: 'uppercase', marginBottom: 2 }}>
                  {licExpired ? '⚠ ' + t.expired : '✓ ' + t.validUntil}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                  {fmtDate(vehicle.validUntil)}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {[
                { label: t.color,     value: vehicle.color },
                { label: t.fuel,      value: vehicle.fuel },
                { label: t.ownership, value: vehicle.ownership },
                { label: t.firstRoad, value: vehicle.firstRoad },
                { label: t.tires,     value: vehicle.frontTire && vehicle.rearTire && vehicle.frontTire !== vehicle.rearTire ? `${vehicle.frontTire} / ${vehicle.rearTire}` : vehicle.frontTire },
                { label: t.vin,       value: vehicle.vin ? vehicle.vin.slice(-8) : '' },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginTop: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Extra data: odometer, damage, repaint, origin */}
            {(vehicle.odometer !== null || vehicle.hasAccident !== null || vehicle.wasRepainted !== null || vehicle.origin) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {vehicle.odometer !== null && vehicle.odometer > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'var(--bg-muted)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t.odometer}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{vehicle.odometer.toLocaleString()} km</span>
                  </div>
                )}
                {vehicle.hasAccident !== null && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 8,
                    background: vehicle.hasAccident ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                    border: `1px solid ${vehicle.hasAccident ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: vehicle.hasAccident ? '#dc2626' : '#16a34a' }}>{t.accident}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: vehicle.hasAccident ? '#dc2626' : '#16a34a' }}>
                      {vehicle.hasAccident ? t.accidentYes : t.accidentNo}
                    </span>
                  </div>
                )}
                {vehicle.wasRepainted && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04' }}>{t.repaint}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ca8a04' }}>{t.repaintYes}</span>
                  </div>
                )}
                {vehicle.origin && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'var(--bg-muted)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t.origin}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{vehicle.origin}</span>
                  </div>
                )}
              </div>
            )}

            {/* CTA to model page */}
            {match && (
              <div style={{ marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link
                  href={`/cars/${match.makeSlug}/${match.modelSlug}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '9px 16px', borderRadius: 9999,
                    background: 'var(--accent)', color: '#fff',
                    textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem',
                    flex: 1, justifyContent: 'center',
                  }}
                >
                  {t.viewModel}
                </Link>
                {match.year && (
                  <Link
                    href={`/cars/${match.makeSlug}/${match.modelSlug}/${match.year}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '9px 14px', borderRadius: 9999,
                      background: 'transparent', color: 'var(--accent)',
                      textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem',
                      border: '1px solid var(--accent)', flexShrink: 0,
                    }}
                  >
                    {t.yearPage} {match.year}
                  </Link>
                )}
              </div>
            )}

            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>
              {t.source}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { lookupVehicle, detectCountry } from '@/lib/vehicleLookup';
import { lookupUkVehicle } from '@/lib/vehicleLookupUk';
import PlateSearch from '@/components/PlateSearch';
import Link from 'next/link';

interface Props { params: Promise<{ plate: string }> }

function fmtPlate(raw: string): string {
  const p = raw.replace(/\D/g, '');
  if (!p) return raw.toUpperCase(); // UK plate — return as-is
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

async function lookupByPlate(plate: string) {
  const country = detectCountry(plate);
  if (country === 'uk') return lookupUkVehicle(plate);
  return lookupVehicle(plate);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { plate } = await params;
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const displayPlate = fmtPlate(plate);
  const result = await lookupByPlate(plate);
  const isHe = locale === 'he';

  const langs = {
    he: `https://carissues.co.il/vehicle-lookup/${plate}`,
    en: `https://carissues.net/vehicle-lookup/${plate}`,
    'x-default': `https://carissues.net/vehicle-lookup/${plate}`,
  };

  if (result.status !== 'found') {
    return {
      title: isHe ? `בדיקת רכב ${displayPlate} | CarIssues` : `Vehicle Check ${displayPlate} | CarIssues`,
      robots: { index: false, follow: true },
      alternates: { canonical: `${base}/vehicle-lookup/${plate}`, languages: langs },
    };
  }

  const v = result.vehicle;
  const name = v.name || v.makeHe;
  const yearStr = v.year ? ` ${v.year}` : '';
  const damageStr = isHe
    ? (v.hasAccident === true ? ' נרשם נזק.' : v.hasAccident === false ? ' ללא נזק רשום.' : '')
    : (v.hasAccident === true ? ' Damage recorded.' : v.hasAccident === false ? ' No damage recorded.' : '');
  const kmStr = v.odometer ? (isHe ? ` ${v.odometer.toLocaleString()} ק"מ.` : ` ${v.odometer.toLocaleString()} km.`) : '';

  return {
    title: isHe
      ? `${name}${yearStr} – בדיקת רכב ${displayPlate} | CarIssues`
      : `${name}${yearStr} – Vehicle Check ${displayPlate} | CarIssues`,
    description: isHe
      ? `פרטי הרכב ${displayPlate}: ${name}${yearStr}. דלק: ${v.fuel}. צבע: ${v.color}. בעלות: ${v.ownership}.${kmStr}${damageStr} תוקף טסט, קילומטראז׳ ועוד ממשרד התחבורה.`
      : `Vehicle ${displayPlate}: ${name}${yearStr}. Fuel: ${v.fuel}. Color: ${v.color}.${kmStr}${damageStr} MOT status, damage history and more from Israel's Ministry of Transport.`,
    alternates: { canonical: `${base}/vehicle-lookup/${plate}`, languages: langs },
    openGraph: {
      title: `${name}${yearStr} – ${displayPlate}`,
      description: isHe ? `בדיקת רכב ${displayPlate}` : `Vehicle check for plate ${displayPlate}`,
      url: `${base}/vehicle-lookup/${plate}`,
    },
  };
}

export default async function VehiclePlatePage({ params }: Props) {
  const { plate } = await params;
  const locale = await getHostLocale();
  const isHe = locale === 'he';
  const base = getBaseUrl(locale);
  const result = await lookupByPlate(plate);
  const displayPlate = fmtPlate(plate);
  const isUk = detectCountry(plate) === 'uk';

  // Labels
  const L = isHe ? {
    home: 'בית', lookup: 'בדיקת רכב', plateLabel: 'מספר רישוי',
    make: 'יצרן', model: 'דגם', year: 'שנה', color: 'צבע', fuel: 'דלק',
    ownership: 'בעלות', firstRoad: 'עלייה לכביש', vin: 'מסגרת',
    odometer: 'קילומטראז׳', damage: 'היסטוריית נזק',
    damageYes: 'נרשם נזק', damageNo: 'ללא נזק רשום',
    repaint: 'צובע מחדש', origin: 'מקור',
    motValid: 'MOT בתוקף עד', motExpired: 'MOT פג תוקף',
    licValid: 'רישיון בתוקף עד', licExpired: 'רישיון פג תוקף',
    taxPaid: 'מס דרכים בתוקף', taxNotPaid: 'מס דרכים לא שולם',
    engine: 'מנוע', source: 'מקור: משרד התחבורה (data.gov.il)',
    sourceUk: 'Source: DVLA (UK Government)',
    reviews: 'ביקורות ובעיות נפוצות ←', notFound: 'לא נמצא רכב עם מספר רישוי זה', tryAnother: 'חפש מספר אחר',
  } : {
    home: 'Home', lookup: 'Vehicle Check', plateLabel: 'License plate',
    make: 'Make', model: 'Model', year: 'Year', color: 'Color', fuel: 'Fuel',
    ownership: 'Ownership', firstRoad: 'First registered', vin: 'VIN/Frame',
    odometer: 'Odometer (last test)', damage: 'Damage history',
    damageYes: 'Damage recorded', damageNo: 'No damage recorded',
    repaint: 'Repainted', origin: 'Origin',
    motValid: 'MOT valid until', motExpired: 'MOT expired',
    licValid: 'License valid until', licExpired: 'License expired',
    taxPaid: 'Road tax paid', taxNotPaid: 'Road tax not paid',
    engine: 'Engine', source: 'Source: Ministry of Transport (data.gov.il)',
    sourceUk: 'Source: DVLA (UK Government)',
    reviews: 'View reviews & common issues →', notFound: 'No vehicle found with this plate number', tryAnother: 'Search another plate',
  };

  // Build JSON-LD
  const jsonLd: object[] = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: L.home, item: base },
        { '@type': 'ListItem', position: 2, name: L.lookup, item: `${base}/vehicle-lookup` },
        { '@type': 'ListItem', position: 3, name: displayPlate, item: `${base}/vehicle-lookup/${plate}` },
      ],
    },
  ];

  if (result.status === 'found') {
    const v = result.vehicle;
    jsonLd.push({
      '@type': 'Car',
      name: v.name || v.makeHe,
      ...(v.year ? { modelDate: String(v.year) } : {}),
      ...(v.color ? { color: v.color } : {}),
      ...(v.fuel ? { fuelType: v.fuel } : {}),
      ...(v.vin ? { vehicleIdentificationNumber: v.vin } : {}),
      ...(v.odometer ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.odometer, unitCode: 'KMT' } } : {}),
      url: `${base}/vehicle-lookup/${plate}`,
      ...(v.dbMatch?.makeSlug && v.dbMatch?.modelSlug ? {
        offers: {
          '@type': 'Offer',
          url: `${base}/cars/${v.dbMatch.makeSlug}/${v.dbMatch.modelSlug}`,
        },
      } : {}),
    });
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLd }) }} />

      <div className="page-section">
        <div className="container" style={{ maxWidth: 600 }}>

          {/* Breadcrumb */}
          <nav style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{L.home}</Link>
            <span>›</span>
            <Link href="/vehicle-lookup" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{L.lookup}</Link>
            <span>›</span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{displayPlate}</span>
          </nav>

          {result.status === 'found' ? (() => {
            const v = result.vehicle;
            const motExpired = v.validUntil ? new Date(v.validUntil) < new Date() : false;
            const testExpired = !isUk && v.lastTestDate ? new Date(v.lastTestDate) < new Date() : false;
            const taxOk = v.taxStatus?.toLowerCase() === 'taxed';

            return (
              <>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>
                  {v.name || v.makeHe}
                  {v.year && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem', marginInlineStart: 8 }}>{v.year}</span>}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                  {L.plateLabel}: <strong style={{ color: 'var(--text)' }}>{displayPlate}</strong>
                </p>

                {/* ── SERVER-RENDERED VEHICLE SUMMARY (crawlable by Google) ── */}
                <section aria-label={isHe ? 'פרטי הרכב' : 'Vehicle details'} style={{ marginBottom: 20 }}>
                  {/* Status badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {isUk ? (
                      <>
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: motExpired ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)', border: `1px solid ${motExpired ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}` }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: motExpired ? '#dc2626' : '#16a34a', letterSpacing: '0.06em' }}>
                            {motExpired ? `⚠ ${L.motExpired}` : `✓ ${L.motValid}`}
                          </div>
                          {v.motExpiryDate && <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 3 }}>{fmtDate(v.motExpiryDate)}</div>}
                        </div>
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: taxOk ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${taxOk ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}` }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: taxOk ? '#16a34a' : '#dc2626', letterSpacing: '0.06em' }}>
                            {taxOk ? `✓ ${L.taxPaid}` : `⚠ ${L.taxNotPaid}`}
                          </div>
                          {v.taxDueDate && <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 3 }}>{fmtDate(v.taxDueDate)}</div>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: testExpired ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)', border: `1px solid ${testExpired ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}` }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: testExpired ? '#dc2626' : '#16a34a', letterSpacing: '0.06em' }}>
                            {testExpired ? `⚠ ${L.licExpired}` : `✓ ${L.motValid}`}
                          </div>
                          {v.lastTestDate && <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 3 }}>{fmtDate(v.lastTestDate)}</div>}
                        </div>
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: motExpired ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)', border: `1px solid ${motExpired ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}` }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: motExpired ? '#dc2626' : '#16a34a', letterSpacing: '0.06em' }}>
                            {motExpired ? `⚠ ${L.licExpired}` : `✓ ${L.licValid}`}
                          </div>
                          {v.validUntil && <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 3 }}>{fmtDate(v.validUntil)}</div>}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Key data grid */}
                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', margin: 0 }}>
                    {[
                      { label: L.color, value: v.color },
                      { label: L.fuel, value: v.fuel },
                      !isUk && { label: L.ownership, value: v.ownership },
                      { label: L.firstRoad, value: v.firstRoad ? fmtDate(v.firstRoad) : '' },
                      !isUk && v.frontTire && { label: isHe ? 'צמיגים' : 'Tires', value: v.frontTire },
                      !isUk && v.vin && { label: L.vin, value: v.vin.slice(-8) },
                      isUk && v.engineCapacity && { label: L.engine, value: `${v.engineCapacity}cc` },
                    ].filter(Boolean).filter((r): r is { label: string; value: string } => !!r && !!(r as { value: string }).value).map(({ label, value }) => (
                      <div key={label} style={{ paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                        <dt style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</dt>
                        <dd style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* Damage / odometer / repaint / origin */}
                  {!isUk && (v.odometer || v.hasAccident !== null || v.wasRepainted || v.origin) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {v.odometer && v.odometer > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{L.odometer}</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{v.odometer.toLocaleString()} km</span>
                        </div>
                      )}
                      {v.hasAccident !== null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: v.hasAccident ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.06)', border: `1px solid ${v.hasAccident ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}` }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: v.hasAccident ? '#dc2626' : '#16a34a' }}>{L.damage}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: v.hasAccident ? '#dc2626' : '#16a34a' }}>
                            {v.hasAccident ? `⚠ ${L.damageYes}` : `✓ ${L.damageNo}`}
                          </span>
                        </div>
                      )}
                      {v.wasRepainted && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04' }}>{L.repaint}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ca8a04' }}>⚠ {isHe ? 'הרכב נצבע מחדש' : 'Vehicle was repainted'}</span>
                        </div>
                      )}
                      {v.origin && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{L.origin}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{v.origin}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA to model page */}
                  {result.vehicle.dbMatch?.modelSlug && (
                    <div style={{ marginTop: 14 }}>
                      <Link
                        href={`/cars/${result.vehicle.dbMatch.makeSlug}/${result.vehicle.dbMatch.modelSlug}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11px 20px', borderRadius: 9999, background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}
                      >
                        {L.reviews}
                      </Link>
                    </div>
                  )}

                  <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                    {isUk ? L.sourceUk : L.source}
                  </p>
                </section>

                {/* Interactive component for new searches */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    {isHe ? 'בדוק רכב נוסף:' : 'Check another vehicle:'}
                  </p>
                  <PlateSearch isHe={isHe} navigateOnSearch />
                </div>
              </>
            );
          })() : (
            <>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
                {isHe ? `בדיקת רכב ${displayPlate}` : `Vehicle Check ${displayPlate}`}
              </h1>
              <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.875rem' }}>
                {result.status === 'not_found' ? L.notFound : (isHe ? 'שגיאה בבדיקת הרכב, נסה שוב' : 'Error checking vehicle, please try again')}
              </div>
              <PlateSearch isHe={isHe} initialPlate={plate} navigateOnSearch />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

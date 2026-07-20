import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { lookupVehicle } from '@/lib/vehicleLookup';
import PlateSearch from '@/components/PlateSearch';
import Link from 'next/link';

interface Props { params: Promise<{ plate: string }> }

function fmtPlate(raw: string): string {
  const p = raw.replace(/\D/g, '');
  return p.length === 7
    ? `${p.slice(0, 3)}-${p.slice(3, 5)}-${p.slice(5)}`
    : `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { plate } = await params;
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const displayPlate = fmtPlate(plate);
  const result = await lookupVehicle(plate);
  const isHe = locale === 'he';

  if (result.status !== 'found') {
    return {
      title: isHe ? `בדיקת רכב ${displayPlate} | CarIssues` : `Vehicle Check ${displayPlate} | CarIssues`,
      alternates: { canonical: `${base}/vehicle-lookup/${plate}` },
    };
  }

  const v = result.vehicle;
  const name = v.name || v.makeHe;
  const yearStr = v.year ? ` ${v.year}` : '';

  return {
    title: isHe
      ? `${name}${yearStr} – בדיקת רכב ${displayPlate} | CarIssues`
      : `${name}${yearStr} – Vehicle Check ${displayPlate} | CarIssues`,
    description: isHe
      ? `פרטי הרכב ${displayPlate}: ${name}${yearStr}. דלק: ${v.fuel}. צבע: ${v.color}. בעלות: ${v.ownership}. בדוק תוקף טסט, קילומטראז׳ ועוד.`
      : `Vehicle ${displayPlate}: ${name}${yearStr}. Fuel: ${v.fuel}. Color: ${v.color}. Ownership: ${v.ownership}. Check test validity, odometer and more.`,
    alternates: { canonical: `${base}/vehicle-lookup/${plate}` },
    openGraph: {
      title: `${name}${yearStr} – ${displayPlate}`,
      description: isHe ? `בדיקת רכב מספר ${displayPlate}` : `Vehicle check for plate ${displayPlate}`,
    },
  };
}

export default async function VehiclePlatePage({ params }: Props) {
  const { plate } = await params;
  const locale = await getHostLocale();
  const isHe = locale === 'he';
  const result = await lookupVehicle(plate);
  const displayPlate = fmtPlate(plate);

  const jsonLd = result.status === 'found' ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isHe ? 'בית' : 'Home', item: getBaseUrl(locale) },
      { '@type': 'ListItem', position: 2, name: isHe ? 'בדיקת רכב' : 'Vehicle Check', item: `${getBaseUrl(locale)}/vehicle-lookup` },
      { '@type': 'ListItem', position: 3, name: displayPlate, item: `${getBaseUrl(locale)}/vehicle-lookup/${plate}` },
    ],
  } : null;

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 600 }}>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

        {/* Breadcrumb */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'בית' : 'Home'}</Link>
          <span>›</span>
          <Link href="/vehicle-lookup" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'בדיקת רכב' : 'Vehicle Check'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{displayPlate}</span>
        </div>

        {result.status === 'found' ? (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
              {result.vehicle.name || result.vehicle.makeHe}
              {result.vehicle.year && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem', marginInlineStart: 8 }}>{result.vehicle.year}</span>}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              {isHe ? `מספר רישוי: ${displayPlate}` : `License plate: ${displayPlate}`}
            </p>
            <PlateSearch isHe={isHe} initialVehicle={result.vehicle} initialPlate={plate} navigateOnSearch />
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
              {isHe ? `בדיקת רכב ${displayPlate}` : `Vehicle Check ${displayPlate}`}
            </h1>
            <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: '0.875rem' }}>
              {result.status === 'not_found'
                ? (isHe ? 'לא נמצא רכב עם מספר רישוי זה' : 'No vehicle found with this plate number')
                : (isHe ? 'שגיאה בבדיקת הרכב, נסה שוב' : 'Error checking vehicle, please try again')}
            </div>
            <PlateSearch isHe={isHe} initialPlate={plate} navigateOnSearch />
          </>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { lookupVehicle, detectCountry } from '@/lib/vehicleLookup';
import { lookupUkVehicle } from '@/lib/vehicleLookupUk';
import VehicleLookupClient from '@/components/VehicleLookupClient';

interface Props { params: Promise<{ plate: string }> }

function fmtPlate(raw: string): string {
  const p = raw.replace(/\D/g, '');
  if (!p) return raw.toUpperCase();
  return p.length === 7
    ? `${p.slice(0, 3)}-${p.slice(3, 5)}-${p.slice(5)}`
    : `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
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
  const name = [v.makeHe, v.name].filter(Boolean).join(' ') || v.makeHe;
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
      ? `פרטי הרכב ${displayPlate}: ${name}${yearStr}. דלק: ${v.fuel}. צבע: ${v.color}.${kmStr}${damageStr} תוקף טסט ועוד ממשרד התחבורה.`
      : `Vehicle ${displayPlate}: ${name}${yearStr}. Fuel: ${v.fuel}. Color: ${v.color}.${kmStr}${damageStr} MOT status and more from Israel's Ministry of Transport.`,
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isHe ? 'בית' : 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: isHe ? 'בדיקת רכב' : 'Vehicle Check', item: `${base}/vehicle-lookup` },
          { '@type': 'ListItem', position: 3, name: fmtPlate(plate), item: `${base}/vehicle-lookup/${plate}` },
        ],
      },
      ...(result.status === 'found' ? [{
        '@type': 'Car',
        name: result.vehicle.name || result.vehicle.makeHe,
        ...(result.vehicle.year ? { modelDate: String(result.vehicle.year) } : {}),
        ...(result.vehicle.color ? { color: result.vehicle.color } : {}),
        ...(result.vehicle.vin ? { vehicleIdentificationNumber: result.vehicle.vin } : {}),
      }] : []),
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VehicleLookupClient
        initialPlate={plate}
        initialVehicle={result.status === 'found' ? result.vehicle : null}
        initialStatus={result.status === 'found' ? 'found' : result.status === 'not_found' ? 'not_found' : 'error'}
        isHe={isHe}
        base={base}
      />
    </div>
  );
}

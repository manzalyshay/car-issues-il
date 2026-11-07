import type { Metadata } from 'next';
import { lookupVehicle, detectCountry } from '@/lib/vehicleLookup';
import { lookupUkVehicle } from '@/lib/vehicleLookupUk';
import { getModelInfo } from '@/lib/modelInfo';
import { fuelRu, colorRu } from '@/lib/vehicleLookupRu';
import VehicleLookupClient from '@/components/VehicleLookupClient';

interface Props { params: Promise<{ plate: string }> }

const BASE = 'https://carissues.co.il';

function fmtPlate(raw: string): string {
  const p = raw.replace(/\D/g, '');
  if (!p) return raw.toUpperCase();
  return p.length === 7 ? `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}` : `${p.slice(0, 3)}-${p.slice(3, 5)}-${p.slice(5)}`;
}

async function lookupByPlate(plate: string) {
  return detectCountry(plate) === 'uk' ? lookupUkVehicle(plate) : lookupVehicle(plate);
}

/** Latin name for a matched model ("Kia Sportage"); the registry's own Latin name otherwise. */
function latinName(v: { name: string; dbMatch: { makeSlug: string; modelSlug: string } | null }): string {
  const cap = (s: string) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return v.dbMatch ? `${cap(v.dbMatch.makeSlug)} ${cap(v.dbMatch.modelSlug)}` : v.name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { plate } = await params;
  const display = fmtPlate(plate);
  const url = `${BASE}/ru/vehicle-lookup/${plate}`;
  const languages = { 'he': `${BASE}/vehicle-lookup/${plate}`, 'ru-IL': url, 'x-default': `${BASE}/vehicle-lookup/${plate}` };
  const result = await lookupByPlate(plate);
  if (result.status !== 'found') {
    return { title: { absolute: `Проверка авто ${display} | CarIssues` }, robots: { index: false, follow: true }, alternates: { canonical: url, languages } };
  }
  const v = result.vehicle;
  const name = latinName(v);
  const year = v.year ? ` ${v.year}` : '';
  const km = v.odometer ? ` Пробег ${v.odometer.toLocaleString('ru-RU')} км.` : '';
  const dmg = v.hasAccident === true ? ' Зарегистрировано повреждение.' : v.hasAccident === false ? ' Повреждений не зарегистрировано.' : '';
  return {
    title: { absolute: `${name}${year} — проверка по номеру ${display} | CarIssues` },
    description: `Автомобиль ${display}: ${name}${year}. Топливо: ${fuelRu(v.fuel)}. Цвет: ${colorRu(v.color)}.${km}${dmg} Техосмотр и история владения.`,
    alternates: { canonical: url, languages },
    openGraph: { title: `${name}${year} — ${display}`, description: `Проверка авто по номеру ${display}`, url, locale: 'ru_IL' },
  };
}

export default async function RuVehiclePlatePage({ params }: Props) {
  const { plate } = await params;
  const result = await lookupByPlate(plate);
  const m = result.status === 'found' ? result.vehicle.dbMatch : null;
  // English model info: Latin names and English problem titles, never Hebrew on this page
  const modelInfo = m
    ? await getModelInfo(m.makeSlug, m.modelSlug, 'en', m.year, result.status === 'found' ? result.vehicle.fuel : null).catch(() => null)
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${BASE}/ru` },
          { '@type': 'ListItem', position: 2, name: 'Проверка авто по номеру', item: `${BASE}/ru/vehicle-lookup` },
          { '@type': 'ListItem', position: 3, name: fmtPlate(plate), item: `${BASE}/ru/vehicle-lookup/${plate}` },
        ],
      },
      ...(result.status === 'found' ? [{
        '@type': 'Car',
        name: latinName(result.vehicle),
        ...(result.vehicle.year ? { modelDate: String(result.vehicle.year) } : {}),
        color: colorRu(result.vehicle.color),
        ...(result.vehicle.vin ? { vehicleIdentificationNumber: result.vehicle.vin } : {}),
      }] : []),
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', direction: 'ltr' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <VehicleLookupClient
        initialPlate={plate}
        initialVehicle={result.status === 'found' ? result.vehicle : null}
        initialStatus={result.status === 'found' ? 'found' : result.status === 'not_found' ? 'not_found' : 'error'}
        isHe={false}
        lang="ru"
        base={`${BASE}/ru`}
        initialModelInfo={modelInfo}
      />
    </div>
  );
}

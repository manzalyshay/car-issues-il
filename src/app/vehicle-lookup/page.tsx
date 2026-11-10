import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import VehicleLookupLanding from '@/components/vehicle-lookup/VehicleLookupLanding';

export const revalidate = 3600;

const LANGS = {
  he: 'https://carissues.co.il/vehicle-lookup',
  'ru-IL': 'https://carissues.co.il/ru/vehicle-lookup',
  en: 'https://carissues.net/vehicle-lookup',
  'x-default': 'https://carissues.net/vehicle-lookup',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'en' ? {
    title: 'Israeli License Plate Lookup - Free Vehicle History',
    description: 'Check any Israeli vehicle by plate: test date, ownership history, odometer, damage record, VIN and fuel type - free, live from the Ministry of Transport.',
    alternates: { canonical: `${base}/vehicle-lookup`, languages: LANGS },
    openGraph: {
      title: 'Israeli License Plate Lookup | CarIssues',
      description: 'Instant vehicle history by Israeli license plate. Test date, damage history, odometer and more.',
      url: `${base}/vehicle-lookup`,
    },
  } : {
    // The root layout's title template appends " | CarIssues"
    title: 'בדיקת רכב לפי מספר רישוי - חינם, היסטוריית רכב מלאה',
    description: 'בדוק כל רכב ישראלי לפי מספר לוחית רישוי: תוקף טסט, בעלות, קילומטראז׳, היסטוריית נזק, VIN, צבע, סוג דלק ועוד - נתונים חיים ממשרד התחבורה.',
    alternates: { canonical: `${base}/vehicle-lookup`, languages: LANGS },
    openGraph: {
      title: 'בדיקת רכב לפי מספר רישוי | CarIssues',
      description: 'בדיקת רכב מהירה לפי לוחית רישוי - טסט, נזק, קילומטראז׳ ועוד.',
      url: `${base}/vehicle-lookup`,
    },
  };
}

export default async function VehicleLookupPage() {
  return <VehicleLookupLanding locale={await getHostLocale()} />;
}

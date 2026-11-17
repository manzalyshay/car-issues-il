import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import VehicleLookupLanding, { VEHICLE_LOOKUP_LANGS as LANGS } from '@/components/vehicle-lookup/VehicleLookupLanding';

export const revalidate = 3600;


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
      images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
  } : {
    // The root layout's title template appends " | CarIssues"
    title: 'בדיקת רכב לפי מספר רישוי חינם - היסטוריה, תאונות וטסט',
    description: 'בדיקת לוחית רישוי חינם: הזינו מספר רכב וקבלו היסטוריית רכב ותאונות רשומות, תוקף טסט ורישיון, קילומטר בטסט האחרון, בעלויות קודמות וריקולים פתוחים - ישירות ממשרד התחבורה.',
    alternates: { canonical: `${base}/vehicle-lookup`, languages: LANGS },
    openGraph: {
      title: 'בדיקת רכב לפי מספר רישוי | CarIssues',
      description: 'בדיקת רכב מהירה לפי לוחית רישוי - טסט, נזק, קילומטראז׳ ועוד.',
      url: `${base}/vehicle-lookup`,
      images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
  };
}

export default async function VehicleLookupPage() {
  return <VehicleLookupLanding locale={await getHostLocale()} />;
}

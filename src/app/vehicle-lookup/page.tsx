import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import PlateSearch from '@/components/PlateSearch';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'en' ? {
    title: 'Vehicle Check by License Plate | CarIssues',
    description: 'Enter an Israeli license plate number to get full vehicle details: model, year, test date, ownership, VIN, odometer, damage history and more.',
    alternates: { canonical: `${base}/vehicle-lookup` },
  } : {
    title: 'בדיקת רכב לפי מספר רישוי | CarIssues',
    description: 'הכנס מספר לוחית רישוי ישראלי וקבל פרטים מלאים על הרכב: דגם, שנה, תוקף טסט, בעלות, מסגרת, קילומטראז\', היסטוריית נזק ועוד — ישירות ממשרד התחבורה.',
    alternates: { canonical: `${base}/vehicle-lookup` },
  };
}

export default async function VehicleLookupPage() {
  const locale = await getHostLocale();
  const isHe = locale === 'he';

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>
          {isHe ? 'בדיקת רכב לפי מספר רישוי' : 'Vehicle Check by License Plate'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
          {isHe
            ? 'קבל פרטים מלאים על כל רכב רשום בישראל — תוקף טסט, בעלות, קילומטראז׳, היסטוריית נזק ועוד.'
            : 'Get full details on any vehicle registered in Israel — test validity, ownership, odometer, damage history and more.'}
        </p>
        <PlateSearch isHe={isHe} navigateOnSearch />
      </div>
    </div>
  );
}

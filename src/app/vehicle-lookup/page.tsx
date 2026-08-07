import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import PlateSearch from '@/components/PlateSearch';

export const dynamic = 'force-dynamic';

const LANGS = {
  he: 'https://carissues.co.il/vehicle-lookup',
  en: 'https://carissues.net/vehicle-lookup',
  'x-default': 'https://carissues.net/vehicle-lookup',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'en' ? {
    title: 'Free Israeli License Plate Lookup — Full Vehicle History | CarIssues',
    description: 'Check any Israeli vehicle by license plate: MOT date, ownership history, odometer, damage record, VIN, color, fuel type and more — live data from Israel\'s Ministry of Transport.',
    alternates: { canonical: `${base}/vehicle-lookup`, languages: LANGS },
    openGraph: {
      title: 'Israeli License Plate Lookup | CarIssues',
      description: 'Instant vehicle history by Israeli license plate. Test date, damage history, odometer and more.',
      url: `${base}/vehicle-lookup`,
    },
  } : {
    title: 'בדיקת רכב חינם לפי מספר רישוי — היסטוריית רכב מלאה | CarIssues',
    description: 'בדוק כל רכב ישראלי לפי מספר לוחית רישוי: תוקף טסט, בעלות, קילומטראז׳, היסטוריית נזק, VIN, צבע, סוג דלק ועוד — נתונים חיים ממשרד התחבורה.',
    alternates: { canonical: `${base}/vehicle-lookup`, languages: LANGS },
    openGraph: {
      title: 'בדיקת רכב לפי מספר רישוי | CarIssues',
      description: 'בדיקת רכב מהירה לפי לוחית רישוי — טסט, נזק, קילומטראז׳ ועוד.',
      url: `${base}/vehicle-lookup`,
    },
  };
}

export default async function VehicleLookupPage() {
  const locale = await getHostLocale();
  const isHe = locale === 'he';
  const base = getBaseUrl(locale);

  const features = isHe ? [
    { icon: '📋', title: 'פרטי רכב מלאים', desc: 'יצרן, דגם, שנת ייצור, צבע, סוג דלק, גודל מנוע' },
    { icon: '🔧', title: 'תוקף טסט ורישיון', desc: 'תאריך הטסט האחרון ותאריך פקיעת הרישיון' },
    { icon: '⚠️', title: 'היסטוריית נזק', desc: 'האם הרכב עבר תאונה רשומה? האם צובע מחדש?' },
    { icon: '🔢', title: 'קילומטראז׳', desc: 'מד-האוץ בטסט האחרון מתוך רשומות משרד התחבורה' },
    { icon: '🪪', title: 'מסגרת ובעלות', desc: 'מספר שלדה (VIN) ומספר הבעלים הקודמים' },
    { icon: '🌍', title: 'מקור הרכב', desc: 'כלי רכב מקורי, מיובא מאירופה, ארה"ב או אחר' },
  ] : [
    { icon: '📋', title: 'Full Vehicle Details', desc: 'Make, model, year, color, fuel type, engine size' },
    { icon: '🔧', title: 'MOT & License Status', desc: 'Last test date and license expiry — instantly' },
    { icon: '⚠️', title: 'Damage History', desc: 'Was the vehicle in a recorded accident? Was it repainted?' },
    { icon: '🔢', title: 'Odometer Reading', desc: 'Mileage at last MOT test from Ministry of Transport records' },
    { icon: '🪪', title: 'VIN & Ownership', desc: 'Vehicle frame number and number of previous owners' },
    { icon: '🌍', title: 'Vehicle Origin', desc: 'Original, European import, US import or other' },
  ];

  const steps = isHe ? [
    { n: '1', title: 'הזן מספר רישוי', desc: 'הקלד את מספר הלוחית של הרכב (7 ספרות לרכב ישראלי)' },
    { n: '2', title: 'בדיקה מיידית', desc: 'המערכת מחפשת ברשומות משרד התחבורה בזמן אמת' },
    { n: '3', title: 'קבל את הדו"ח', desc: 'צפה בכל הנתונים מיד — ללא הרשמה, ללא עלות' },
  ] : [
    { n: '1', title: 'Enter the plate number', desc: 'Type the vehicle\'s license plate (7 digits for Israeli, e.g. AB12 CDE for UK)' },
    { n: '2', title: 'Instant lookup', desc: 'We query the Ministry of Transport records in real time' },
    { n: '3', title: 'Get the full report', desc: 'View all details immediately — no registration, no cost' },
  ];

  const faqs = isHe ? [
    {
      q: 'מה ניתן לבדוק לפי מספר רישוי?',
      a: 'ניתן לבדוק: שם הרכב (יצרן + דגם), שנת ייצור, צבע, סוג דלק, תוקף טסט ורישיון, מסגרת (VIN), בעלות, קילומטראז׳ בטסט האחרון, היסטוריית נזק ומקור הרכב — הכל ישירות ממשרד התחבורה.',
    },
    {
      q: 'האם השירות בחינם?',
      a: 'כן, בדיקת רכב לפי מספר רישוי היא חינמית לחלוטין באתר CarIssues. אין צורך בהרשמה.',
    },
    {
      q: 'מה ההבדל בין בדיקה כאן לבין אתר משרד התחבורה?',
      a: 'CarIssues מציג את המידע בצורה ברורה וידידותית, כולל אינדיקציה ויזואלית על נזקים, פיצול של תאריכי טסט וטסט ומידע על הדגם הספציפי מתוך מאגר הביקורות שלנו.',
    },
    {
      q: 'מאיפה המידע?',
      a: 'הנתונים מגיעים ישירות מ-data.gov.il — מסד הנתונים הפתוח של ממשלת ישראל ומשרד התחבורה.',
    },
    {
      q: 'האם ניתן לבדוק רכב אנגלי (בריטי)?',
      a: 'כן! ניתן להזין לוחית רישוי בריטית (למשל AB12 CDE) כדי לבדוק רכב בריטי מול מסד הנתונים של DVLA.',
    },
  ] : [
    {
      q: 'What information can I check by license plate?',
      a: 'You can check: vehicle name (make + model), year, color, fuel type, MOT and license expiry, VIN/frame number, ownership count, odometer at last test, damage history and vehicle origin — all directly from Israel\'s Ministry of Transport.',
    },
    {
      q: 'Is this service free?',
      a: 'Yes, the vehicle plate lookup on CarIssues is completely free. No registration required.',
    },
    {
      q: 'How accurate is the data?',
      a: 'The data comes directly from Israel\'s official government database (data.gov.il) and is updated in real time. The information reflects what is officially registered with the Ministry of Transport.',
    },
    {
      q: 'Can I check a UK vehicle?',
      a: 'Yes. Enter a UK registration plate (e.g. AB12 CDE) and we\'ll look it up via the DVLA database, showing MOT status, tax status, make, year and fuel type.',
    },
    {
      q: 'What does the damage history field mean?',
      a: 'This indicates whether the vehicle has a recorded accident in the Ministry of Transport database. A "no damage recorded" result doesn\'t guarantee the vehicle was never in an accident — only that none was officially registered.',
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: isHe ? 'בדיקת רכב לפי מספר רישוי — CarIssues' : 'Israeli License Plate Lookup — CarIssues',
        url: `${base}/vehicle-lookup`,
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' },
        description: isHe
          ? 'כלי חינמי לבדיקת רכב ישראלי לפי מספר רישוי — נתונים ממשרד התחבורה'
          : 'Free tool to check any Israeli vehicle by license plate — live data from Ministry of Transport',
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isHe ? 'בית' : 'Home', item: base },
          { '@type': 'ListItem', position: 2, name: isHe ? 'בדיקת רכב' : 'Vehicle Check', item: `${base}/vehicle-lookup` },
        ],
      },
    ],
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '48px 0 40px' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#60a5fa', textTransform: 'uppercase', marginBottom: 10 }}>
            {isHe ? 'כלי חינמי' : 'Free Tool'}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, marginBottom: 12 }}>
            {isHe ? 'בדיקת רכב לפי מספר רישוי' : 'Israeli License Plate Lookup'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
            {isHe
              ? 'הזן מספר לוחית רישוי וקבל מיד את כל הפרטים — תוקף טסט, היסטוריית נזק, קילומטראז׳ ועוד, ישירות ממשרד התחבורה.'
              : 'Enter any Israeli license plate and instantly get full vehicle details — MOT status, damage history, odometer reading and more, live from Israel\'s Ministry of Transport.'}
          </p>
          <PlateSearch isHe={isHe} navigateOnSearch />
          <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: 14 }}>
            {isHe
              ? 'מקור: data.gov.il (משרד התחבורה) • DVLA לרכבים בריטיים'
              : 'Source: data.gov.il (Israel Ministry of Transport) • DVLA for UK vehicles'}
          </p>
        </div>
      </div>

      {/* ── WHAT YOU GET ── */}
      <div className="container" style={{ maxWidth: 760, padding: '48px 16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
          {isHe ? 'מה תקבל בבדיקה?' : 'What does the check include?'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
          {isHe
            ? 'כל הנתונים מגיעים ישירות ממאגרי ממשלת ישראל בזמן אמת'
            : 'All data is pulled in real time from official Israeli government databases'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {features.map(f => (
            <div key={f.title} className="card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{f.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 760, padding: '40px 16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 28 }}>
            {isHe ? 'איך זה עובד?' : 'How it works'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                  color: '#fff', fontWeight: 900, fontSize: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="container" style={{ maxWidth: 760, padding: '48px 16px 64px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 28 }}>
          {isHe ? 'שאלות נפוצות' : 'Frequently Asked Questions'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map(({ q, a }) => (
            <div key={q} className="card" style={{ padding: '18px 20px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 8 }}>{q}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

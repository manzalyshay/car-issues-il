import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'he' ? {
    title: 'מבצעי רכב בישראל | CarIssues',
    description: 'מבצעים, הנחות ועסקאות על רכבים חדשים ויד שנייה בישראל — עם ציון האמינות של כל דגם',
    alternates: { canonical: `${base}/sales` },
  } : {
    title: 'Car Deals in Israel | CarIssues',
    description: 'Best car deals, discounts and offers in Israel — with reliability scores',
    alternates: { canonical: `${base}/sales` },
  };
}

const DEALS = [
  { name: 'טויוטה קורולה 2021', nameEn: 'Toyota Corolla 2021', spec: 'היברידי · 62,000 ק״מ', specEn: 'Hybrid · 62,000 km', score: '8.4', price: '₪112,000', listPrice: '₪127,000', discount: '-12%', seller: 'סוכנות · ראשל״צ', sellerEn: 'Dealer · Rishon LeZion', urgency: 'נותרו 3 ימים', urgencyEn: '3 days left', href: '/cars/toyota/corolla' },
  { name: 'מאזדה CX-5 2022', nameEn: 'Mazda CX-5 2022', spec: 'בנזין · 48,000 ק״מ', specEn: 'Petrol · 48,000 km', score: '8.9', price: '₪169,000', listPrice: '₪186,000', discount: '-9%', seller: 'יבואן · חיפה', sellerEn: 'Importer · Haifa', urgency: 'נותרו 5 ימים', urgencyEn: '5 days left', href: '/cars/mazda/cx5' },
  { name: 'יונדאי טוסון 2020', nameEn: 'Hyundai Tucson 2020', spec: 'בנזין · 85,000 ק״מ', specEn: 'Petrol · 85,000 km', score: '8.3', price: '₪98,500', listPrice: '₪116,000', discount: '-15%', seller: 'פרטי · תל אביב', sellerEn: 'Private · Tel Aviv', urgency: 'נותר יום', urgencyEn: '1 day left', href: '/cars/hyundai/tucson' },
  { name: 'קיה ספורטז׳ 2021', nameEn: 'Kia Sportage 2021', spec: 'בנזין · 71,000 ק״מ', specEn: 'Petrol · 71,000 km', score: '8.1', price: '₪134,000', listPrice: '₪151,000', discount: '-11%', seller: 'סוכנות · ת״א', sellerEn: 'Dealer · Tel Aviv', urgency: 'נותרו 4 ימים', urgencyEn: '4 days left', href: '/cars/kia/sportage' },
  { name: 'סקודה אוקטביה 2020', nameEn: 'Skoda Octavia 2020', spec: 'דיזל · 92,000 ק״מ', specEn: 'Diesel · 92,000 km', score: '7.9', price: '₪89,000', listPrice: '₪104,000', discount: '-14%', seller: 'פרטי · חיפה', sellerEn: 'Private · Haifa', urgency: 'נותרו 6 ימים', urgencyEn: '6 days left', href: '/cars/skoda/octavia' },
  { name: 'פולקסווגן גולף 2022', nameEn: 'VW Golf 2022', spec: 'בנזין · 38,000 ק״מ', specEn: 'Petrol · 38,000 km', score: '8.5', price: '₪142,000', listPrice: '₪158,000', discount: '-10%', seller: 'יבואן · ת״א', sellerEn: 'Importer · Tel Aviv', urgency: 'נותרו 2 ימים', urgencyEn: '2 days left', href: '/cars/volkswagen/golf' },
];

export default async function SalesPage() {
  const locale = await getHostLocale();
  const isHe = locale === 'he';

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ background: '#f2f5fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(28px,3.6vw,48px) clamp(16px,3vw,32px)' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5b6a86', fontSize: 13.5, marginBottom: 32 }}>
          <Link href="/" style={{ color: '#5b6a86', textDecoration: 'none' }}>{isHe ? 'בית' : 'Home'}</Link>
          <span>›</span>
          <span style={{ color: '#0d1b2f', fontWeight: 600 }}>{isHe ? 'מבצעים' : 'Deals'}</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: '#7a5000', background: '#fff6e0', border: '1px solid #f6e2b2', padding: '5px 12px', borderRadius: 999 }}>
              {isHe ? 'מבצעים' : 'Deals'}
            </div>
            <h1 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 'clamp(24px,2.6vw,34px)', letterSpacing: '-.035em', margin: '10px 0 4px', color: '#0d1b2f' }}>
              {isHe ? 'הנחות שוות על דגמים שבדקנו' : 'Great discounts on cars we reviewed'}
            </h1>
            <p style={{ color: '#5b6a86', fontSize: 16, margin: 0 }}>
              {isHe ? 'מחירי מחירון מול מחיר בפועל, עם ציון האמינות של הדגם לצידם.' : 'List price vs actual price, with the model reliability score alongside.'}
            </p>
          </div>
        </div>

        {/* Deals grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18, marginBottom: 24 }}>
          {DEALS.map((deal, i) => (
            <Link key={i} href={deal.href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <article style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, overflow: 'hidden', height: '100%' }} className="deal-card">
                <div style={{ position: 'relative', aspectRatio: '16/10', background: 'linear-gradient(140deg,#e8edf6,#d5deee)', display: 'grid', placeItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#5f6e88', letterSpacing: '.12em' }}>{isHe ? 'תמונת רכב' : 'Car photo'}</span>
                  <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, background: '#f5b301', color: '#3b2a00', fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 15, padding: '6px 12px', borderRadius: 10 }}>{deal.discount}</span>
                </div>
                <div style={{ padding: '15px 16px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <h3 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 700, fontSize: 18, margin: 0, color: '#0d1b2f' }}>{isHe ? deal.name : deal.nameEn}</h3>
                      <div style={{ fontSize: 13, color: '#5b6a86', marginTop: 3 }}>{isHe ? deal.spec : deal.specEn}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'Heebo,sans-serif', color: '#0f7a3d', background: '#e6f7ed', padding: '4px 9px', borderRadius: 8, flexShrink: 0 }}>{deal.score}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 14 }}>
                    <span style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 24, letterSpacing: '-.03em', color: '#0d1b2f' }}>{deal.price}</span>
                    <span style={{ fontSize: 15, color: '#5f6e88', textDecoration: 'line-through' }}>{deal.listPrice}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 11, borderTop: '1px solid #eef2f9', fontSize: 13, color: '#5b6a86' }}>
                    <span>{isHe ? deal.seller : deal.sellerEn}</span>
                    <span style={{ fontWeight: 700, color: '#c0392b' }}>{isHe ? deal.urgency : deal.urgencyEn}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Alert strip */}
        <article style={{ background: '#0d1b2f', color: '#fff', borderRadius: 16, padding: '18px 22px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <span style={{ fontSize: 12, letterSpacing: '.12em', color: '#ffd166', fontWeight: 700 }}>{isHe ? 'התראת מבצעים' : 'DEAL ALERTS'}</span>
            <h2 style={{ fontFamily: 'Heebo,sans-serif', fontWeight: 900, fontSize: 20, lineHeight: 1.2, letterSpacing: '-.03em', margin: '8px 0 4px', color: '#fff' }}>
              {isHe ? 'קבלו הנחות על הדגם שאתם בודקים' : "Get deals on the car you're researching"}
            </h2>
            <p style={{ fontSize: 14.5, color: '#b8c8e4', margin: 0, lineHeight: 1.5 }}>
              {isHe ? 'נשלח מייל כשמופיע מבצע על דגם עם ציון אמינות מעל 8.' : "We'll email you when a deal appears on a model scoring above 8."}
            </p>
          </div>
          <Link href="/cars" style={{ display: 'block', textAlign: 'center', background: '#f5b301', whiteSpace: 'nowrap', color: '#3b2a00', fontWeight: 800, padding: '12px 24px', borderRadius: 12, fontSize: 15, textDecoration: 'none' }}>
            {isHe ? 'הפעילו התראה' : 'Enable alert'}
          </Link>
        </article>

        <style>{`
          .deal-card { transition: transform .3s cubic-bezier(.23,1,.32,1), box-shadow .3s; }
          .deal-card:hover { transform: translateY(-6px); box-shadow: 0 24px 44px -26px rgba(13,27,47,.45); }
        `}</style>
      </div>
    </div>
  );
}

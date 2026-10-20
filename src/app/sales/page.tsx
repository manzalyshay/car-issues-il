import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const english = locale === 'en';
  return {
    title: english ? 'Car Offers in Israel' : 'מבצעי רכב בישראל',
    description: english ? 'Browse car models and specifications in Israel.' : 'מידע על דגמי רכב ומפרטים בישראל.',
    alternates: { canonical: `${base}/sales` },
    robots: { index: false, follow: true },
  };
}

export default async function SalesPage() {
  const locale = await getHostLocale();
  const isHe = locale === 'he';
  return (
    <main dir={isHe ? 'rtl' : 'ltr'} style={{ background: '#f2f5fa', minHeight: '70vh', padding: 'clamp(28px,3.6vw,48px) clamp(16px,3vw,32px)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <nav style={{ display: 'flex', gap: 8, color: '#5b6a86', fontSize: 14, marginBottom: 32 }}>
          <Link href="/" style={{ color: 'inherit' }}>{isHe ? 'בית' : 'Home'}</Link><span>›</span><span>{isHe ? 'מבצעים' : 'Offers'}</span>
        </nav>
        <section style={{ background: '#fff', border: '1px solid #e4e9f2', borderRadius: 16, padding: 'clamp(24px,5vw,48px)' }}>
          <h1 style={{ margin: '0 0 12px', color: '#0d1b2f', fontSize: 'clamp(26px,4vw,38px)' }}>{isHe ? 'מבצעי רכב' : 'Car offers'}</h1>
          <p style={{ margin: '0 0 24px', color: '#5b6a86', lineHeight: 1.7 }}>
            {isHe ? 'כרגע אין באתר הצעות עדכניות שאומתו מול מקור פעיל. נציג כאן מבצעים כשיהיה אפשר לאמת את פרטיהם.' : 'There are currently no offers verified against an active source. Offers will appear here when their details can be verified.'}
          </p>
          <Link href="/cars" style={{ color: '#17408f', fontWeight: 700 }}>{isHe ? 'לצפייה בכל דגמי הרכב' : 'Browse all car models'}</Link>
        </section>
      </div>
    </main>
  );
}

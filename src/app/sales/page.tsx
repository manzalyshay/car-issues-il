import type { Metadata } from 'next';
import Link from 'next/link';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'he' ? {
    title: 'מבצעי רכב בישראל | CarIssues',
    description: 'מבצעים, הנחות ועסקאות על רכבים חדשים ויד שנייה בישראל',
    alternates: { canonical: `${base}/sales` },
  } : {
    title: 'Car Deals in Israel | CarIssues',
    description: 'Best car deals, discounts and offers in Israel',
    alternates: { canonical: `${base}/sales` },
  };
}

const COMING_SOON_FEATURES = [
  { icon: '🏷️', he: 'מבצעי יבואנים', en: 'Importer Deals' },
  { icon: '🚗', he: 'רכבי יד שנייה במחיר מיוחד', en: 'Used Car Specials' },
  { icon: '📊', he: 'השוואת מחירי שוק', en: 'Market Price Comparison' },
  { icon: '🔔', he: 'התראות על מבצעים', en: 'Deal Alerts' },
];

export default async function SalesPage() {
  const locale = await getHostLocale();
  const isHe = locale === 'he';

  return (
    <div className="page-section" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{isHe ? 'בית' : 'Home'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{isHe ? 'מבצעים' : 'Deals'}</span>
        </div>

        {/* Coming soon card */}
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: 560, marginInline: 'auto' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏷️</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(20px,3vw,26px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            {isHe ? 'מבצעי רכב — בקרוב' : 'Car Deals — Coming Soon'}
          </h1>
          <p style={{ margin: '0 0 32px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {isHe
              ? 'אנחנו עובדים על אגרגטור מבצעי רכב לשוק הישראלי. בקרוב תוכלו למצוא כאן את ההצעות הטובות ביותר.'
              : "We're building a car deals aggregator for the Israeli market. The best offers will be here soon."}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32, textAlign: 'start' }}>
            {COMING_SOON_FEATURES.map((f) => (
              <div key={f.he} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '12px 14px' }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{isHe ? f.he : f.en}</span>
              </div>
            ))}
          </div>

          <Link href="/cars" className="btn btn-primary" style={{ display: 'inline-block', height: 44, lineHeight: '44px', padding: '0 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>
            {isHe ? 'לכל הרכבים ←' : 'Browse all cars →'}
          </Link>
        </div>

      </div>
    </div>
  );
}

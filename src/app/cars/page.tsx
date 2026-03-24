import type { Metadata } from 'next';
import Link from 'next/link';
import { carDatabase } from '@/data/cars';
import MakeLogo from '@/components/MakeLogo';

export const metadata: Metadata = {
  title: 'כל יצרני הרכב',
  description: 'רשימת כל יצרני הרכב הנמכרים בישראל. בחר יצרן כדי לראות דגמים, בעיות נפוצות וביקורות.',
  openGraph: { title: 'כל יצרני הרכב | CarIssues IL', description: 'מצא בעיות ברכב לפי יצרן' },
};

const COUNTRY_GROUPS = ['יפן', "קוריאה", 'גרמניה', "צרפת", 'שוודיה', 'ארה"ב', "צ'כיה", 'איטליה'];

export default function CarsPage() {
  const byCountry = COUNTRY_GROUPS.map((country) => ({
    country,
    makes: carDatabase.filter((m) => m.country === country),
  })).filter((g) => g.makes.length > 0);

  const others = carDatabase.filter((m) => !COUNTRY_GROUPS.includes(m.country));

  const all = [...byCountry, ...(others.length ? [{ country: 'אחר', makes: others }] : [])];

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
            <span>›</span>
            <span>יצרנים</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 8 }}>
            כל יצרני הרכב
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
            {carDatabase.length} יצרנים · {carDatabase.reduce((s, m) => s + m.models.length, 0)} דגמים
          </p>
        </div>

        {/* Groups */}
        {all.map((group) => (
          <section key={group.country} style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(230,57,70,.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-red)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {group.country.slice(0, 2)}
              </span>
              {group.country}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {group.makes.map((make) => (
                <Link
                  key={make.slug}
                  href={`/cars/${make.slug}`}
                  className="card"
                  style={{ padding: '20px 20px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16 }}
                >
                  <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{make.nameHe}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{make.nameEn}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {make.models.length} דגמים
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

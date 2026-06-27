import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import MakeLogo from '@/components/MakeLogo';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  return locale === 'en'
    ? { title: 'All Car Makes | CarIssues', description: 'Browse all car manufacturers. Select a make to see models, common issues and owner reviews.', alternates: { canonical: `${base}/cars` } }
    : { title: 'כל יצרני הרכב | CarIssues IL', description: 'רשימת כל יצרני הרכב הנמכרים בישראל.', alternates: { canonical: `${base}/cars` } };
}

const COUNTRY_GROUPS = ['יפן', "קוריאה", 'גרמניה', "צרפת", 'שוודיה', 'ארה"ב', "צ'כיה", 'איטליה'];

const TYPE_CATEGORIES: Record<string, string[]> = {
  sedan:    ['sedan'],
  suv:      ['suv', 'crossover', 'pickup'],
  electric: ['electric'],
  hatchback:['hatchback'],
  sport:    ['sports'],
  mpv:      ['minivan'],
  hybrid:   [],
};

export const dynamic = 'force-dynamic';

interface Props { searchParams: Promise<{ type?: string }> }

export default async function CarsPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const [locale, carDatabase] = await Promise.all([
    getHostLocale(),
    getAllMakes().catch(() => []),
  ]);
  const cp = translations[locale].carsPage;
  const isEn = locale === 'en';

  // Filter by category type if provided
  const filterCats = type && TYPE_CATEGORIES[type] ? TYPE_CATEGORIES[type] : null;
  const filtered = filterCats
    ? carDatabase.map(make => ({ ...make, models: make.models.filter(m => filterCats.includes(m.category)) })).filter(make => make.models.length > 0)
    : carDatabase;

  const byCountry = COUNTRY_GROUPS.map((countryHe) => ({
    countryHe,
    countryLabel: isEn ? (cp.countryNames[countryHe] ?? countryHe) : countryHe,
    makes: filtered.filter((m) => m.country === countryHe),
  })).filter((g) => g.makes.length > 0);

  const others = filtered.filter((m) => !COUNTRY_GROUPS.includes(m.country));

  const all = [...byCountry, ...(others.length ? [{ countryHe: '', countryLabel: cp.other, makes: others }] : [])];

  return (
    <div className="page-section">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.home}</Link>
            <span>›</span>
            <span>{cp.makes}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 8 }}>
            {cp.title}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem' }}>
            {filtered.length} {cp.subtitle} · {filtered.reduce((s, m) => s + m.models.length, 0)} {cp.models}
          </p>
        </div>

        {/* Groups */}
        {all.map((group) => (
          <section key={group.countryLabel} style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(27,79,138,.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {group.countryLabel.slice(0, 2)}
              </span>
              {group.countryLabel}
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
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                      {isEn ? make.nameEn : make.nameHe}
                    </div>
                    {!isEn && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {make.nameEn}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {make.models.length} {cp.models}
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

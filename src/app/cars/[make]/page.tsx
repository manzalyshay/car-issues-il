import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carDatabase, getMakeBySlug, getCategoryLabel } from '@/data/cars';
import MakeLogo from '@/components/MakeLogo';

interface Props { params: Promise<{ make: string }> }

export async function generateStaticParams() {
  return carDatabase.map((m) => ({ make: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const make = getMakeBySlug(makeSlug);
  if (!make) return {};
  return {
    title: `${make.nameHe} — בעיות ודגמים`,
    description: `כל דגמי ${make.nameHe} (${make.nameEn}) עם ביקורות בעברית ובעיות נפוצות שדיווחו בעלי רכב בישראל.`,
    openGraph: { title: `${make.nameHe} | CarIssues IL`, description: `בעיות ב${make.nameHe}` },
  };
}

export default async function MakePage({ params }: Props) {
  const { make: makeSlug } = await params;
  const make = getMakeBySlug(makeSlug);
  if (!make) notFound();

  // Group models by category
  const categories = [...new Set(make.models.map((m) => m.category))];

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>יצרנים</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>{make.nameHe}</span>
        </div>

        {/* Make header */}
        <div
          className="card"
          style={{
            padding: '32px 32px',
            marginBottom: 40,
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(230,57,70,.03) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={72} />
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 4 }}>{make.nameHe}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 12 }}>{make.nameEn} · {make.country}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="badge badge-red">{make.models.length} דגמים</span>
              {categories.map((c) => (
                <span key={c} className="badge badge-gray">{getCategoryLabel(c)}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Models grid */}
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 24 }}>בחר דגם</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {make.models.map((model) => (
            <Link
              key={model.slug}
              href={`/cars/${make.slug}/${model.slug}`}
              className="card"
              style={{ padding: '20px 24px', textDecoration: 'none', display: 'block' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>
                  {model.nameHe}
                </h3>
                <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                  {getCategoryLabel(model.category)}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{model.nameEn}</p>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {model.years[model.years.length - 1]}–{model.years[0]}
                </span>
                <span style={{ color: 'var(--brand-red)', fontSize: '0.875rem', fontWeight: 700 }}>
                  {model.years.length} שנות ייצור →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Brand',
              name: make.nameEn,
              url: `https://carissues.co.il/cars/${make.slug}`,
              description: `Car reviews and issues for ${make.nameEn} vehicles in Israel`,
            }),
          }}
        />
      </div>
    </div>
  );
}

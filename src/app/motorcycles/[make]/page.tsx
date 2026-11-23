import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MakeLogo from '@/components/MakeLogo';
import MotoModelCard from '@/components/moto/MotoModelCard';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getMotoMake, getMotoReviewStats } from '@/lib/motoDb';

export const revalidate = 3600;

interface Props { params: Promise<{ make: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const make = await getMotoMake((await params).make);
  if (!make) return {};
  const names = make.models.slice(0, 4).map((m) => m.nameHe).join(', ');
  return {
    title: `אופנועים וקטנועים ${make.nameHe}${make.nameEn !== make.nameHe ? ` (${make.nameEn})` : ''}: בעיות, ריקולים וחוות דעת`,
    description: `כל דגמי ${make.nameHe} הנפוצים בישראל (${names}): ביקורות בעלים, ריקולים של משרד התחבורה וכמה מהם על הכביש.`,
    alternates: { canonical: `${getBaseUrl('he')}/motorcycles/${make.slug}` },
  };
}

export default async function MotoMakePage({ params }: Props) {
  if ((await getHostLocale()) === 'en') notFound();
  const [make, stats] = await Promise.all([getMotoMake((await params).make), getMotoReviewStats()]);
  if (!make) notFound();
  const onRoad = make.models.reduce((s, m) => s + (m.activeVehiclesIl ?? 0), 0);
  const base = getBaseUrl('he');

  return (
    <div className="page-section">
      <div className="container">
        <nav aria-label="פירורי לחם" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>‹</span>
          <Link href="/motorcycles" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>אופנועים</Link>
          <span>‹</span>
          <span>{make.nameHe}</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={60} />
          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', fontWeight: 800, margin: 0 }}>
              אופנועים וקטנועים {make.nameHe}
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {make.nameEn !== make.nameHe && <span dir="ltr">{make.nameEn} · </span>}
              {make.country && `${make.country} · `}{make.models.length} דגמים · {onRoad.toLocaleString('he-IL')} על הכביש בישראל
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {make.models.map((model) => (
            <MotoModelCard key={model.slug} make={make} model={model} stats={stats.get(`${make.slug}/${model.slug}`)} />
          ))}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'בית', item: base },
                { '@type': 'ListItem', position: 2, name: 'אופנועים', item: `${base}/motorcycles` },
                { '@type': 'ListItem', position: 3, name: make.nameHe, item: `${base}/motorcycles/${make.slug}` },
              ],
            }),
          }}
        />
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MakeLogo from '@/components/MakeLogo';
import MotoModelCard from '@/components/moto/MotoModelCard';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { getAllMotoMakes, getMotoReviewStats, motoCategoryLabel, MOTO_CATEGORIES, type MotoCategory } from '@/lib/motoDb';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: 'אופנועים וקטנועים: בעיות נפוצות, ריקולים וחוות דעת בעלים',
    description: 'כל דגמי האופנועים והקטנועים הנפוצים בישראל: ביקורות בעלים, קריאות שירות (ריקולים) של משרד התחבורה וכמה מהם על הכביש.',
    alternates: { canonical: `${getBaseUrl('he')}/motorcycles` },
  };
}

interface Props { searchParams: Promise<{ type?: string }> }

export default async function MotorcyclesPage({ searchParams }: Props) {
  // Built from Israeli registry and recall data - Hebrew site only (like the plate checks)
  if ((await getHostLocale()) === 'en') notFound();
  const { type } = await searchParams;
  const [makes, stats] = await Promise.all([getAllMotoMakes().catch(() => []), getMotoReviewStats()]);
  const active = MOTO_CATEGORIES.includes(type as MotoCategory) ? (type as MotoCategory) : null;

  const all = makes.flatMap((make) => make.models.map((model) => ({ make, model })));
  const shown = (active ? all.filter((x) => x.model.category === active) : all)
    .sort((a, b) => (b.model.activeVehiclesIl ?? 0) - (a.model.activeVehiclesIl ?? 0));
  const categories = MOTO_CATEGORIES.filter((c) => all.some((x) => x.model.category === c));
  const onRoad = all.reduce((s, x) => s + (x.model.activeVehiclesIl ?? 0), 0);

  const chip = (on: boolean) => ({
    padding: '6px 14px', borderRadius: 999, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    background: on ? 'var(--accent)' : 'var(--bg-card)', color: on ? '#fff' : 'var(--text)',
  });

  return (
    <div className="page-section">
      <div className="container">
        <div style={{ marginBottom: 28 }}>
          <nav aria-label="פירורי לחם" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 12 }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
            <span>‹</span>
            <span>אופנועים</span>
          </nav>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 8 }}>אופנועים וקטנועים</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.0625rem', margin: 0 }}>
            {all.length} דגמים נפוצים · {onRoad.toLocaleString('he-IL')} כלים על הכביש בישראל · ביקורות בעלים וריקולים
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          <Link href="/motorcycles" style={chip(!active)}>הכל</Link>
          {categories.map((c) => (
            <Link key={c} href={`/motorcycles?type=${c}`} style={chip(active === c)}>{motoCategoryLabel(c)}</Link>
          ))}
        </div>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>
            {active ? `${motoCategoryLabel(active)}: הדגמים הנפוצים` : 'הדגמים הנפוצים בישראל'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {shown.map(({ make, model }) => (
              <MotoModelCard key={`${make.slug}/${model.slug}`} make={make} model={model} stats={stats.get(`${make.slug}/${model.slug}`)} showMake />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>יצרנים</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {makes.map((make) => (
              <Link key={make.slug} href={`/motorcycles/${make.slug}`} className="card" style={{ padding: 18, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={44} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{make.nameHe}</div>
                  {make.nameEn !== make.nameHe && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{make.nameEn}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{make.models.length} דגמים</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Link href="/motorcycle-check" className="card" style={{ display: 'block', padding: '18px 20px', textDecoration: 'none', color: 'var(--text)' }}>
          <strong>🔎 בדיקת אופנוע לפי מספר רישוי</strong>
          <span style={{ color: 'var(--text-muted)', marginInlineStart: 8 }}>יצרן, דגם, שנה, נפח מנוע וסוג הבעלות ממשרד התחבורה ←</span>
        </Link>
      </div>
    </div>
  );
}

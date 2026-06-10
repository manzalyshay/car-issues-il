import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllMakes, getMakeBySlug, getCategoryLabel } from '@/lib/carsDb';
import MakeLogo from '@/components/MakeLogo';

interface Props { params: Promise<{ make: string }> }

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const makes = await getAllMakes();
    return makes.map((m) => ({ make: m.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) return {};
  const url = `https://carissues.co.il/cars/${make.slug}`;
  return {
    title: `${make.nameHe} — בעיות ודגמים`,
    description: `כל דגמי ${make.nameHe} (${make.nameEn}) עם ביקורות בעברית ובעיות נפוצות שדיווחו בעלי רכב בישראל.`,
    alternates: { canonical: url },
    openGraph: { title: `${make.nameHe} | CarIssues IL`, description: `בעיות ב${make.nameHe}`, url },
  };
}

export default async function MakePage({ params }: Props) {
  const { make: makeSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) notFound();

  const categories = [...new Set(make.models.map((m) => m.category))];

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── MAKE HERO ──────────────────────────────────────── */}
      <div className="make-page-hero">
        {/* Ghost name behind */}
        <div className="make-ghost-name" aria-hidden>{make.nameEn.toUpperCase()}</div>

        <div className="container" style={{ position: 'relative' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 28 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none', transition: 'color 0.15s' }}>בית</Link>
            <span style={{ color: 'var(--brand-red)', opacity: 0.5 }}>›</span>
            <Link href="/cars" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none', transition: 'color 0.15s' }}>יצרנים</Link>
            <span style={{ color: 'var(--brand-red)', opacity: 0.5 }}>›</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{make.nameHe}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(20px,4vw,48px)', flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{ width: 'clamp(64px,10vw,96px)', height: 'clamp(64px,10vw,96px)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={60} />
            </div>

            {/* Name + stats */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--brand-red)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 16, height: 2, background: 'var(--brand-red)' }} />
                {make.country}
              </p>
              <h1 style={{ fontFamily: "'Bebas Neue', var(--font-display)", fontSize: 'clamp(3rem,8vw,7rem)', fontWeight: 400, lineHeight: 0.9, letterSpacing: '0.02em', color: '#fff', marginBottom: 16 }}>
                {make.nameHe}
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', marginBottom: 20, fontWeight: 500 }}>{make.nameEn}</p>

              {/* Stat pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ padding: '5px 14px', border: '1px solid rgba(220,26,44,0.35)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--brand-red)', background: 'rgba(220,26,44,0.08)' }}>
                  {make.models.length} דגמים
                </span>
                {categories.map((c) => (
                  <span key={c} style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)' }}>
                    {getCategoryLabel(c)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODELS LIST ───────────────────────────────────── */}
      <div className="container" style={{ padding: '40px 1.5rem 80px' }}>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', var(--font-display)", fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 400, letterSpacing: '0.03em', lineHeight: 0.9, color: '#fff', flexShrink: 0 }}>
            בחר דגם
          </h2>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)', alignSelf: 'center' }} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{make.models.length} דגמים</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {make.models.map((model, i) => (
            <Link key={model.slug} href={`/cars/${make.slug}/${model.slug}`} className="model-list-row">
              {/* Index number */}
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: 'rgba(255,255,255,0.08)', lineHeight: 1, flexShrink: 0, width: 32, letterSpacing: '0.01em' }}>
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Name block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', marginBottom: 2, lineHeight: 1.2 }}>
                  {model.nameHe}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{model.nameEn}</div>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '2px 8px' }}>
                  {getCategoryLabel(model.category)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {model.years[model.years.length - 1]}–{model.years[0]}
                </span>
              </div>

              {/* Arrow */}
              <span style={{ color: 'var(--brand-red)', fontSize: '1rem', opacity: 0.5, flexShrink: 0, marginInlineStart: 4 }}>›</span>
            </Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Brand',
                name: make.nameEn,
                url: `https://carissues.co.il/cars/${make.slug}`,
                description: `Car reviews and issues for ${make.nameEn} vehicles in Israel`,
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'בית', item: 'https://carissues.co.il' },
                  { '@type': 'ListItem', position: 2, name: 'יצרנים', item: 'https://carissues.co.il/cars' },
                  { '@type': 'ListItem', position: 3, name: make.nameHe, item: `https://carissues.co.il/cars/${make.slug}` },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}

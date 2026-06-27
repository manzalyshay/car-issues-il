import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllMakes, getMakeBySlug, getCategoryLabel } from '@/lib/carsDb';
import MakeLogo from '@/components/MakeLogo';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';

interface Props { params: Promise<{ make: string }> }

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return []; // Render on demand — DB not available at build time
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const [locale, make] = await Promise.all([getHostLocale(), getMakeBySlug(makeSlug)]);
  if (!make) return {};
  const base = getBaseUrl(locale);
  const url = `${base}/cars/${make.slug}`;
  const isEn = locale === 'en';
  return {
    title: isEn
      ? `${make.nameEn} — Models & Common Issues`
      : `${make.nameHe} — בעיות ודגמים`,
    description: isEn
      ? `All ${make.nameEn} models with owner reviews and common problems reported by real car owners.`
      : `כל דגמי ${make.nameHe} (${make.nameEn}) עם ביקורות בעברית ובעיות נפוצות שדיווחו בעלי רכב בישראל.`,
    alternates: {
      canonical: url,
      languages: {
        he: `https://carissues.co.il/cars/${make.slug}`,
        en: `https://carissues.net/cars/${make.slug}`,
      },
    },
    openGraph: {
      title: isEn ? `${make.nameEn} | CarIssues` : `${make.nameHe} | CarIssues IL`,
      description: isEn ? `${make.nameEn} models, issues & owner reviews` : `בעיות ב${make.nameHe}`,
      url,
    },
  };
}

export default async function MakePage({ params }: Props) {
  const { make: makeSlug } = await params;
  const [locale, make] = await Promise.all([getHostLocale(), getMakeBySlug(makeSlug)]);
  if (!make) notFound();
  const mp = translations[locale].makePage;
  const cp = translations[locale].carsPage;
  const isEn = locale === 'en';

  const categories = [...new Set(make.models.map((m) => m.category))];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── MAKE HERO — light, clean ── */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: 'clamp(24px,4vh,44px) 0',
      }}>
        <div className="container">
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20, flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }} className="bc-link">{cp.home}</Link>
            <span>›</span>
            <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }} className="bc-link">{cp.makes}</Link>
            <span>›</span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{isEn ? make.nameEn : make.nameHe}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px,3vw,36px)', flexWrap: 'wrap' }}>
            {/* Logo box */}
            <div style={{
              width: 'clamp(64px,9vw,88px)', height: 'clamp(64px,9vw,88px)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={56} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Country label */}
              <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
                {cp.countryNames[make.country] ?? make.country}
              </p>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 8 }}>
                {isEn ? make.nameEn : make.nameHe}
              </h1>
              {/* Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ padding: '4px 12px', border: '1px solid rgba(27,79,138,.2)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 99 }}>
                  {make.models.length} {mp.models}
                </span>
                {categories.slice(0, 4).map((c) => (
                  <span key={c} style={{ padding: '4px 12px', border: '1px solid var(--border)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 99 }}>
                    {getCategoryLabel(c, locale)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODELS GRID ── */}
      <div className="container" style={{ padding: '36px 1.5rem 72px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            {mp.selectModel}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {make.models.length} {mp.models}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {make.models.map((model) => (
            <Link key={model.slug} href={`/cars/${make.slug}/${model.slug}`} className="model-card">
              {/* Top row: logo + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isEn ? model.nameEn : model.nameHe}
                  </div>
                  {!isEn && model.nameEn && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{model.nameEn}</div>
                  )}
                </div>
              </div>

              {/* Bottom row: meta */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
                  {getCategoryLabel(model.category, locale)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {model.years[model.years.length - 1]}–{model.years[0]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`.bc-link:hover { color: var(--accent) !important; } .bc-link { transition: color 0.15s; }`}</style>

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
                url: `${getBaseUrl(locale)}/cars/${make.slug}`,
                description: isEn
                  ? `Car reviews and common issues for ${make.nameEn} vehicles reported by real owners`
                  : `ביקורות ובעיות נפוצות ברכבי ${make.nameHe} מבעלי רכב בישראל`,
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: isEn ? 'Home' : 'בית', item: getBaseUrl(locale) },
                  { '@type': 'ListItem', position: 2, name: isEn ? 'Makes' : 'יצרנים', item: `${getBaseUrl(locale)}/cars` },
                  { '@type': 'ListItem', position: 3, name: isEn ? make.nameEn : make.nameHe, item: `${getBaseUrl(locale)}/cars/${make.slug}` },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}

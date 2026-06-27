import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import MakeLogo from '@/components/MakeLogo';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { dbAll } from '@/lib/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ cat: string }> }

const CAT_CATEGORIES: Record<string, string[]> = {
  suv:      ['suv', 'crossover', 'pickup'],
  electric: ['electric'],
  sedan:    ['sedan'],
  hatchback:['hatchback'],
  sports:   ['sports'],
  minivan:  ['minivan'],
  hybrid:   ['sedan', 'hatchback', 'suv', 'crossover'], // hybrid is fuel-type filtered below
};

const VALID_CATS = Object.keys(CAT_CATEGORIES);

const CAT_LABELS: Record<string, { he: string; en: string; desc_he: string; desc_en: string }> = {
  suv:      { he: 'רכבי SUV וקרוסאובר', en: 'SUV & Crossover', desc_he: 'כל דגמי ה-SUV והקרוסאובר הנמכרים בישראל — ביקורות, בעיות ועלויות תחזוקה.', desc_en: 'All SUV & crossover models sold in Israel — reviews, issues, and maintenance costs.' },
  electric: { he: 'רכבים חשמליים', en: 'Electric Vehicles', desc_he: 'כל רכבי החשמל הנמכרים בישראל — ביקורות, בעיות ועלויות תחזוקה.', desc_en: 'All electric car models sold in Israel — reviews, issues, and running costs.' },
  sedan:    { he: 'סדאן ולימוזינה', en: 'Sedan', desc_he: 'דגמי סדאן הנמכרים בישראל — ביקורות, בעיות ועלויות תחזוקה.', desc_en: 'Sedan models sold in Israel — reviews, issues, and maintenance costs.' },
  hatchback:{ he: "האצ'בק", en: 'Hatchback', desc_he: "דגמי האצ'בק הנמכרים בישראל — ביקורות, בעיות ועלויות תחזוקה.", desc_en: 'Hatchback models sold in Israel — reviews, issues, and maintenance costs.' },
  sports:   { he: 'רכבי ספורט', en: 'Sports Cars', desc_he: 'רכבי ספורט הנמכרים בישראל.', desc_en: 'Sports car models sold in Israel.' },
  minivan:  { he: 'מיניוואן', en: 'Minivan / MPV', desc_he: 'מיניוואנים ורכבי משפחה הנמכרים בישראל.', desc_en: 'Minivan and MPV models sold in Israel.' },
  hybrid:   { he: 'היברידי', en: 'Hybrid', desc_he: 'רכבים היברידיים הנמכרים בישראל.', desc_en: 'Hybrid car models sold in Israel.' },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cat } = await params;
  if (!VALID_CATS.includes(cat)) return {};
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const label = CAT_LABELS[cat]!;
  const title = locale === 'en' ? `${label.en} Cars in Israel | CarIssues` : `${label.he} בישראל | CarIssues`;
  const description = locale === 'en' ? label.desc_en : label.desc_he;
  return {
    title,
    description,
    alternates: { canonical: `${base}/cars/category/${cat}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { cat } = await params;
  if (!VALID_CATS.includes(cat)) notFound();

  const [locale, makes] = await Promise.all([getHostLocale(), getAllMakes().catch(() => [])]);
  const isEn = locale === 'en';
  const label = CAT_LABELS[cat]!;
  const categories = CAT_CATEGORIES[cat]!;
  const cp = translations[locale].carsPage;

  // Get review counts per model
  const reviewCounts = await dbAll<{ make_slug: string; model_slug: string; cnt: number }>(
    'SELECT make_slug, model_slug, COUNT(*) as cnt FROM reviews GROUP BY make_slug, model_slug',
  ).catch(() => [] as { make_slug: string; model_slug: string; cnt: number }[]);

  const countMap: Record<string, number> = {};
  for (const r of reviewCounts) countMap[`${r.make_slug}/${r.model_slug}`] = r.cnt;

  // Collect models in this category
  type ModelEntry = { makeSlug: string; makeNameHe: string; makeNameEn: string; logoUrl: string; modelSlug: string; modelNameHe: string; modelNameEn: string; reviewCount: number };
  const models: ModelEntry[] = [];
  for (const make of makes) {
    for (const model of make.models) {
      if (!categories.includes(model.category)) continue;
      models.push({
        makeSlug: make.slug, makeNameHe: make.nameHe, makeNameEn: make.nameEn, logoUrl: make.logoUrl,
        modelSlug: model.slug, modelNameHe: model.nameHe, modelNameEn: model.nameEn,
        reviewCount: countMap[`${make.slug}/${model.slug}`] ?? 0,
      });
    }
  }

  // Sort: models with reviews first, then alphabetically
  models.sort((a, b) => b.reviewCount - a.reviewCount || a.makeNameEn.localeCompare(b.makeNameEn));

  const title = isEn ? label.en : label.he;

  return (
    <div className="page-section">
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.home}</Link>
          <span>›</span>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.makes}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{title}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, marginBottom: 8 }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.9375rem' }}>
          {isEn ? label.desc_en : label.desc_he}
        </p>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {(['suv', 'electric', 'sedan', 'hatchback', 'hybrid'] as const).map(c => (
            <Link key={c} href={`/cars/category/${c}`} style={{
              padding: '6px 16px', borderRadius: 999, fontSize: '0.875rem', fontWeight: 600,
              textDecoration: 'none',
              background: c === cat ? 'var(--accent)' : 'var(--surface)',
              color: c === cat ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${c === cat ? 'var(--accent)' : 'var(--border)'}`,
            }}>
              {isEn ? CAT_LABELS[c].en : CAT_LABELS[c].he}
            </Link>
          ))}
        </div>

        {models.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{isEn ? 'No models found.' : 'לא נמצאו דגמים.'}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {models.map(m => (
              <Link
                key={`${m.makeSlug}/${m.modelSlug}`}
                href={`/cars/${m.makeSlug}/${m.modelSlug}`}
                className="card"
                style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MakeLogo logoUrl={m.logoUrl} nameEn={m.makeNameEn} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.2 }}>
                      {isEn ? m.makeNameEn : m.makeNameHe}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {isEn ? m.modelNameEn : m.modelNameHe}
                    </div>
                  </div>
                </div>
                {m.reviewCount > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                    {m.reviewCount} {isEn ? 'reviews' : 'ביקורות'}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

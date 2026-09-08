import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import { dbAll } from '@/lib/db';
import { notFound } from 'next/navigation';
import CategoryGrid, { type GridModel } from './CategoryGrid';

export const revalidate = 3600; // cache 1 hour

interface Props { params: Promise<{ cat: string }> }

// Maps URL slug → DB categories
const CAT_DB_CATEGORIES: Record<string, string[]> = {
  suv:      ['suv', 'crossover', 'pickup'],
  electric: ['electric'],
  sedan:    ['sedan'],
  hatchback:['hatchback'],
  sports:   ['coupe', 'sports'],
  minivan:  ['van', 'minivan', 'mpv'],
  pickup:   ['pickup'],
  hybrid:   ['sedan', 'hatchback', 'suv', 'crossover', 'electric'],
};

const VALID_CATS = Object.keys(CAT_DB_CATEGORIES);

const CAT_LABELS: Record<string, { he: string; en: string; icon: string; desc_he: string; desc_en: string }> = {
  suv:      { icon: '🚐', he: 'רכבי SUV וקרוסאובר', en: 'SUV & Crossover', desc_he: 'דירוג כל דגמי ה-SUV והקרוסאובר הנמכרים בישראל — ביקורות בעלי רכב, ציוני מומחים, מודל תלת-ממד ועלויות תחזוקה.', desc_en: 'Ranked SUV & crossover models sold in Israel — owner reviews, expert scores, 3D models and maintenance costs.' },
  electric: { icon: '⚡', he: 'רכבים חשמליים', en: 'Electric Vehicles', desc_he: 'דירוג רכבי החשמל הנמכרים בישראל — ביקורות בעלי רכב, ציוני מומחים, מודל תלת-ממד והשוואת מחירים.', desc_en: 'Ranked electric car models sold in Israel — owner reviews, expert scores, 3D models and price comparison.' },
  sedan:    { icon: '🚗', he: 'סדאן', en: 'Sedan', desc_he: 'דירוג דגמי הסדאן הנמכרים בישראל — ביקורות בעלי רכב, ציוני מומחים, מודל תלת-ממד ועלויות תחזוקה.', desc_en: 'Ranked sedan models sold in Israel — owner reviews, expert scores, 3D models and maintenance costs.' },
  hatchback:{ icon: '🚗', he: "האצ'בק", en: 'Hatchback', desc_he: "דירוג דגמי האצ'בק הנמכרים בישראל — ביקורות בעלי רכב, ציוני מומחים, מודל תלת-ממד ועלויות תחזוקה.", desc_en: 'Ranked hatchback models sold in Israel — owner reviews, expert scores, 3D models and maintenance costs.' },
  sports:   { icon: '🏎', he: 'רכבי ספורט', en: 'Sports Cars', desc_he: 'דירוג רכבי הספורט והקופה הנמכרים בישראל — ביצועים, ביקורות בעלי רכב, מודל תלת-ממד ועלויות תחזוקה.', desc_en: 'Ranked sports and coupe models sold in Israel — performance, owner reviews, 3D models and running costs.' },
  minivan:  { icon: '👨‍👩‍👧', he: 'רכבי משפחה', en: 'Family / MPV', desc_he: 'דירוג מיניוואנים ורכבי המשפחה הנמכרים בישראל — מקום, נוחות, ביקורות בעלי רכב ומודל תלת-ממד.', desc_en: 'Ranked minivan and family car models sold in Israel — space, comfort, owner reviews and 3D models.' },
  pickup:   { icon: '🚐', he: 'רכבי מסחרי ואוף-רוד', en: 'Commercial & Off-Road', desc_he: 'דירוג טנדרים ורכבי המסחרי הנמכרים בישראל — ביקורות, ביצועים ומודל תלת-ממד.', desc_en: 'Ranked pickup trucks and commercial vehicles sold in Israel — reviews, performance and 3D models.' },
  hybrid:   { icon: '🍃', he: 'היברידי', en: 'Hybrid', desc_he: 'דירוג הרכבים ההיברידיים הנמכרים בישראל — חיסכון בדלק, ביקורות בעלי רכב ומודל תלת-ממד.', desc_en: 'Ranked hybrid car models sold in Israel — fuel savings, owner reviews and 3D models.' },
};

// Nav chips shown on category pages
const NAV_CATS = ['suv', 'sedan', 'electric', 'hatchback', 'sports', 'minivan', 'hybrid'];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cat } = await params;
  if (!VALID_CATS.includes(cat)) return {};
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const label = CAT_LABELS[cat]!;
  const title = locale === 'en' ? `${label.en} Cars | CarIssues` : `${label.he} בישראל | CarIssues`;
  const description = locale === 'en' ? label.desc_en : label.desc_he;
  return {
    title,
    description,
    alternates: { canonical: `${base}/cars/category/${cat}`, languages: { he: `https://carissues.co.il/cars/category/${cat}`, en: `https://carissues.net/cars/category/${cat}`, 'x-default': `https://carissues.net/cars/category/${cat}` } },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { cat } = await params;
  if (!VALID_CATS.includes(cat)) notFound();

  const [locale, makes] = await Promise.all([getHostLocale(), getAllMakes().catch(() => [])]);
  const isEn = locale === 'en';
  const label = CAT_LABELS[cat]!;
  const dbCategories = CAT_DB_CATEGORIES[cat]!;
  const cp = translations[locale].carsPage;

  // Fetch review counts, expert scores and 3D models in parallel
  const [reviewCounts, expertScores, models3d] = await Promise.all([
    dbAll<{ make_slug: string; model_slug: string; cnt: number; avg_rating: number }>(
      'SELECT make_slug, model_slug, COUNT(*) as cnt, AVG(rating) as avg_rating FROM reviews GROUP BY make_slug, model_slug',
    ).catch(() => [] as { make_slug: string; model_slug: string; cnt: number; avg_rating: number }[]),
    dbAll<{ make_slug: string; model_slug: string; top_score: number }>(
      'SELECT make_slug, model_slug, top_score FROM expert_reviews WHERE year IS NULL AND top_score IS NOT NULL',
    ).catch(() => [] as { make_slug: string; model_slug: string; top_score: number }[]),
    dbAll<{ make_slug: string; model_slug: string; sketchfab_uid: string; sketchfab_name: string; sketchfab_author: string }>(
      'SELECT make_slug, model_slug, sketchfab_uid, sketchfab_name, sketchfab_author FROM car_3d_models WHERE hidden IS NOT 1',
    ).catch(() => [] as { make_slug: string; model_slug: string; sketchfab_uid: string; sketchfab_name: string; sketchfab_author: string }[]),
  ]);

  const countMap: Record<string, number> = {};
  const ratingMap: Record<string, number> = {};
  for (const r of reviewCounts) {
    countMap[`${r.make_slug}/${r.model_slug}`] = r.cnt;
    ratingMap[`${r.make_slug}/${r.model_slug}`] = r.avg_rating;
  }
  const scoreMap: Record<string, number> = {};
  for (const r of expertScores) scoreMap[`${r.make_slug}/${r.model_slug}`] = r.top_score;
  const model3dMap: Record<string, { uid: string; name: string; author: string }> = {};
  for (const r of models3d) model3dMap[`${r.make_slug}/${r.model_slug}`] = { uid: r.sketchfab_uid, name: r.sketchfab_name, author: r.sketchfab_author };

  // Build models list
  const models: GridModel[] = [];
  for (const make of makes) {
    for (const model of make.models) {
      if (!dbCategories.includes(model.category)) continue;
      const key = `${make.slug}/${model.slug}`;
      models.push({
        makeSlug: make.slug,
        modelSlug: model.slug,
        makeNameHe: make.nameHe,
        makeNameEn: make.nameEn,
        modelNameHe: model.nameHe,
        modelNameEn: model.nameEn,
        logoUrl: make.logoUrl,
        imageUrl: model.leadingImageUrl ?? null,
        sketchfab: model3dMap[key] ?? null,
        expertScore: scoreMap[key] ?? null,
        avgRating: ratingMap[key] ?? null,
        reviewCount: countMap[key] ?? 0,
      });
    }
  }

  // Sort: expert score first, then review count, then alphabetically
  models.sort((a, b) => {
    const sa = a.expertScore ?? (a.reviewCount > 0 ? a.avgRating ?? 0 : -1);
    const sb = b.expertScore ?? (b.reviewCount > 0 ? b.avgRating ?? 0 : -1);
    return sb - sa || b.reviewCount - a.reviewCount || a.makeNameEn.localeCompare(b.makeNameEn);
  });

  const title = isEn ? label.en : label.he;

  return (
    <div className="page-section">
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.home ?? 'Home'}</Link>
          <span>›</span>
          <Link href="/cars" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.makes}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: '1.75rem' }}>{label.icon}</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, margin: 0 }}>{title}</h1>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999, fontWeight: 600 }}>
            {models.length}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.9375rem' }}>
          {isEn ? label.desc_en : label.desc_he}
        </p>

        {/* Category nav chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {NAV_CATS.map(c => (
            <Link key={c} href={`/cars/category/${c}`} style={{
              padding: '6px 16px', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 600,
              textDecoration: 'none',
              background: c === cat ? 'var(--accent)' : 'var(--surface)',
              color: c === cat ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${c === cat ? 'var(--accent)' : 'var(--border)'}`,
            }}>
              {CAT_LABELS[c]?.icon} {isEn ? CAT_LABELS[c]?.en : CAT_LABELS[c]?.he}
            </Link>
          ))}
        </div>

        {models.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{isEn ? 'No models found.' : 'לא נמצאו דגמים.'}</p>
        ) : (
          <CategoryGrid models={models} isEn={isEn} />
        )}
      </div>
    </div>
  );
}

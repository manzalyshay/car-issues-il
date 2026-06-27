import type { Metadata } from 'next';
import Link from 'next/link';
import { dbAll } from '@/lib/db';
import { getAllMakes } from '@/lib/carsDb';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const rp = translations[locale].rankingsPage;
  const base = getBaseUrl(locale);
  return {
    title: locale === 'en'
      ? 'Car Reliability Rankings | CarIssues'
      : 'דירוג אמינות רכבים בישראל | CarIssues IL',
    description: rp.subtitle,
    alternates: { canonical: `${base}/rankings` },
  };
}

interface RankedModel {
  makeSlug: string;
  modelSlug: string;
  makeHe: string;
  modelHe: string;
  makeEn: string;
  modelEn: string;
  logoUrl: string;
  category: string;
  topScore: number | null;
  avgRating: number | null;
  reviewCount: number;
  combined: number;
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat = 'all' } = await searchParams;
  const locale = await getHostLocale();
  const rp = translations[locale].rankingsPage;
  const cp = translations[locale].carsPage;
  const isEn = locale === 'en';

  const makes = await getAllMakes().catch(() => []);

  // Build make/model lookup
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; category: string }>();
  for (const make of makes) {
    for (const model of make.models) {
      lookup.set(`${make.slug}/${model.slug}`, {
        makeHe: make.nameHe, modelHe: model.nameHe,
        makeEn: make.nameEn, modelEn: model.nameEn,
        logoUrl: make.logoUrl,
        category: model.category,
      });
    }
  }

  // Fetch expert scores (general, year=null)
  const expertData = await dbAll<{ make_slug: string; model_slug: string; top_score: number }>(
    'SELECT make_slug, model_slug, top_score FROM expert_reviews WHERE year IS NULL AND top_score IS NOT NULL',
  ).catch(() => []);

  const scoreMap = new Map<string, number>();
  for (const row of expertData) {
    scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  }

  // Fetch user review averages
  const reviewData = await dbAll<{ make_slug: string; model_slug: string; rating: number }>(
    'SELECT make_slug, model_slug, rating FROM reviews',
  ).catch(() => []);

  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }

  // Build ranked list
  const ranked: RankedModel[] = [];
  for (const [key, info] of lookup.entries()) {
    const topScore  = scoreMap.get(key) ?? null;
    const ratings   = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const reviewCount = ratings.length;

    const scores = [];
    if (topScore != null) scores.push(topScore);
    if (avgRating != null) scores.push(avgRating * 2);
    if (scores.length === 0) continue;
    const combined = scores.reduce((a, b) => a + b, 0) / scores.length;

    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, topScore, avgRating, reviewCount, combined });
  }

  ranked.sort((a, b) => b.combined - a.combined);

  const filtered = cat === 'all' ? ranked : ranked.filter(r => r.category === cat);
  const categories = ['all', ...Object.keys(rp.categories).filter(k => k !== 'all' && ranked.some(r => r.category === k))];

  return (
    <div className="page-section">
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{rp.home}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{rp.breadcrumb}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, marginBottom: 8 }}>{rp.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>{rp.subtitle}</p>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {categories.map(c => (
            <Link
              key={c}
              href={`/rankings${c === 'all' ? '' : `?cat=${c}`}`}
              className="ci-chip"
              data-active={cat === c ? '1' : '0'}
              style={cat === c ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
            >
              {rp.categories[c] ?? c}
            </Link>
          ))}
        </div>

        {/* Rankings table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.slice(0, 50).map((car, i) => (
            <Link
              key={`${car.makeSlug}/${car.modelSlug}`}
              href={`/cars/${car.makeSlug}/${car.modelSlug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card ranking-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}>
                {/* Rank */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'var(--bg-muted)',
                  color: i < 3 ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: i < 3 ? '1rem' : '0.875rem',
                }}>
                  {i + 1}
                </div>

                {/* Logo */}
                <MakeLogo logoUrl={car.logoUrl} nameEn={car.makeEn} size={36} />

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {isEn ? `${car.makeEn} ${car.modelEn}` : `${car.makeHe} ${car.modelHe}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {!isEn && `${car.makeEn} ${car.modelEn} · `}{rp.categories[car.category] ?? car.category}
                  </div>
                </div>

                {/* Stars */}
                {car.avgRating != null && (
                  <div className="ranking-stars" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <StarRating rating={car.avgRating} size={14} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({car.reviewCount})</span>
                  </div>
                )}

                {/* Combined score */}
                <div className={`score-badge ranking-score ${car.combined >= 8.5 ? 'score-tier-hi' : car.combined >= 7 ? 'score-tier-mid' : 'score-tier-lo'}`}>
                  <span className="n">{car.combined.toFixed(1)}</span>
                  <span className="of">{isEn ? '/10' : 'מתוך 10'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <style>{`
          @media (max-width: 480px) {
            .ranking-stars { display: none !important; }
            .ranking-card  { gap: 10px !important; padding: 12px 14px !important; }
          }
        `}</style>

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            {rp.noData}
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {rp.scoreNote}
          {' '}{rp.showing} {Math.min(filtered.length, 50)} {rp.outOf} {filtered.length} {rp.models}.
        </p>

        <p style={{ marginTop: 8, fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {cp.home} · {isEn ? 'carissues.net' : 'carissues.co.il'}
        </p>
      </div>
    </div>
  );
}

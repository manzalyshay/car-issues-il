import type { Metadata } from 'next';
import Link from 'next/link';
import { getServiceClient } from '@/lib/adminAuth';
import { getAllMakes } from '@/lib/carsDb';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'דירוג אמינות רכבים בישראל | CarIssues IL',
  description: 'דירוג הרכבים הטובים והאמינים ביותר בישראל לפי ביקורות אמיתיות של בעלי רכב וניתוח AI.',
  alternates: { canonical: 'https://carissues.co.il/rankings' },
};

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

const CATEGORY_LABELS: Record<string, string> = {
  all: 'הכל',
  sedan: 'סדאן',
  suv: 'SUV',
  hatchback: "האצ'בק",
  electric: 'חשמלי',
  pickup: 'פיקאפ',
  van: 'ואן',
  coupe: 'קופה',
};

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat = 'all' } = await searchParams;

  const sb = getServiceClient();
  const makes = await getAllMakes();

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
  const { data: expertData } = await sb
    .from('expert_reviews')
    .select('make_slug,model_slug,top_score')
    .is('year', null)
    .not('top_score', 'is', null);

  const scoreMap = new Map<string, number>();
  for (const row of expertData ?? []) {
    scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  }

  // Fetch user review averages
  const { data: reviewData } = await sb
    .from('reviews')
    .select('make_slug,model_slug,rating');

  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData ?? []) {
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

    // Combined score: AI score (out of 10) averaged with user rating scaled to 10
    const scores = [];
    if (topScore != null) scores.push(topScore);
    if (avgRating != null) scores.push(avgRating * 2);
    if (scores.length === 0) continue; // skip models with no data
    const combined = scores.reduce((a, b) => a + b, 0) / scores.length;

    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, topScore, avgRating, reviewCount, combined });
  }

  ranked.sort((a, b) => b.combined - a.combined);

  const filtered = cat === 'all' ? ranked : ranked.filter(r => r.category === cat);
  const categories = ['all', ...Object.keys(CATEGORY_LABELS).filter(k => k !== 'all' && ranked.some(r => r.category === k))];

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>דירוג אמינות</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, marginBottom: 8 }}>דירוג אמינות רכבים</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>מבוסס על ביקורות אמיתיות של בעלי רכב בישראל ובעולם + ניתוח AI</p>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {categories.map(c => (
            <Link
              key={c}
              href={`/rankings${c === 'all' ? '' : `?cat=${c}`}`}
              style={{
                height: 34, padding: '0 16px', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 600,
                background: cat === c ? 'var(--brand-red)' : 'var(--bg-muted)',
                color: cat === c ? '#fff' : 'var(--text-secondary)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
            >
              {CATEGORY_LABELS[c] ?? c}
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
              <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}>
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
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{car.makeHe} {car.modelHe}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{car.makeEn} {car.modelEn} · {CATEGORY_LABELS[car.category] ?? car.category}</div>
                </div>

                {/* Stars */}
                {car.avgRating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <StarRating rating={car.avgRating} size={14} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({car.reviewCount})</span>
                  </div>
                )}

                {/* Combined score */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: car.combined >= 7 ? 'rgba(22,163,74,0.1)' : car.combined >= 5 ? 'rgba(202,138,4,0.1)' : 'rgba(220,38,38,0.1)',
                  color: car.combined >= 7 ? '#16a34a' : car.combined >= 5 ? '#ca8a04' : '#dc2626',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1 }}>{car.combined.toFixed(1)}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>/ 10</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            אין נתונים זמינים לקטגוריה זו
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          הציון המשולב מחשב ממוצע בין ציון AI (מבוסס ביקורות עולמיות) לדירוג בעלי רכב ישראלים.
          מוצגים {Math.min(filtered.length, 50)} מתוך {filtered.length} דגמים.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { dbAll } from '@/lib/db';
import { getAllMakes } from '@/lib/carsDb';
import { getAllAiScores, blendWithOwnerRating } from '@/lib/aiScore';
import { getAllHeadlineTestAverages } from '@/lib/proReviewScores';
import { blendWithTestScore } from '@/lib/proReviewScoreLabels';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';

export const revalidate = 3600; // cache 1 hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const rp = translations[locale].rankingsPage;
  const base = getBaseUrl(locale);
  return {
    title: locale === 'en'
      ? 'Car Reliability Rankings 2026 - Best & Worst Cars'
      : 'דירוג רכבים בישראל 2026 - אמינות, חוות דעת ובעיות נפוצות',
    description: rp.subtitle,
    alternates: { canonical: `${base}/rankings`, languages: { he: 'https://carissues.co.il/rankings', en: 'https://carissues.net/rankings', 'x-default': 'https://carissues.net/rankings' } },
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
  aiScore: number | null;
  aiConfidence: 'high' | 'medium' | 'low' | null;
  avgRating: number | null;
  reviewCount: number;
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

  // Fetch the fixed AI reputation score for every model
  const aiScores = await getAllAiScores().catch(() => ({} as Record<string, { score: number; confidence: 'high' | 'medium' | 'low' }>));

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

  // Also factor in verified external test scores (icar, Autocar, carwow, etc.)
  // as one more input into the displayed score, same treatment as model pages.
  const testScoreAvgs = await getAllHeadlineTestAverages().catch(() => new Map<string, number>());

  // Build ranked list
  const ranked: RankedModel[] = [];
  for (const [key, info] of lookup.entries()) {
    const ai = aiScores[key] ?? null;
    if (ai == null) continue;
    const ratings   = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const reviewCount = ratings.length;
    let displayScore = blendWithOwnerRating(ai.score, avgRating, reviewCount);
    const testAvg = testScoreAvgs.get(key) ?? null;
    if (testAvg != null) displayScore = blendWithTestScore(displayScore, testAvg);

    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, aiScore: displayScore, aiConfidence: ai.confidence, avgRating, reviewCount });
  }

  ranked.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));

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
              {(rp.categories as Record<string, string>)[c] ?? c}
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
              {(() => {
                const modelHe = car.makeSlug === 'lexus' && car.modelSlug === 'rx' ? car.modelHe.replace(/^LE\s+/i, '') : car.modelHe;
                const modelEn = car.makeSlug === 'lexus' && car.modelSlug === 'rx' ? car.modelEn.replace(/^LE\s+/i, '') : car.modelEn;
                return (
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
                    {isEn ? `${car.makeEn} ${modelEn}` : `${car.makeHe} ${modelHe}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {!isEn && `${car.makeEn} ${modelEn} · `}{(rp.categories as Record<string, string>)[car.category] ?? car.category}
                  </div>
                </div>

                {/* Stars */}
                {car.avgRating != null && (
                  <div className="ranking-stars" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <StarRating rating={car.avgRating} size={14} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({car.reviewCount})</span>
                  </div>
                )}

                {/* AI score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className={`score-badge ranking-score ${(car.aiScore ?? 0) >= 8.5 ? 'score-tier-hi' : (car.aiScore ?? 0) >= 7 ? 'score-tier-mid' : 'score-tier-lo'}`}>
                    <span className="n">{(car.aiScore ?? 0).toFixed(1)}</span>
                    <span className="of">{isEn ? '/10' : 'מתוך 10'}</span>
                  </div>
                  {car.aiConfidence === 'low' && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92620a', background: '#fef3cd', padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                      {isEn ? 'Estimated' : 'משוער'}
                    </span>
                  )}
                </div>
              </div>
                );
              })()}
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

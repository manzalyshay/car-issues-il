import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getAllMakes, getSimilarModels } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { findCarModel } from '@/lib/sketchfab';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import { translations } from '@/lib/translations';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';
import Car3DViewer from '@/components/Car3DViewer';

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make1, model1, make2, model2 } = await params;
  const [locale, mA, mB] = await Promise.all([getHostLocale(), getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) return {};
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) return {};
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  const isEn = locale === 'en';
  const base = getBaseUrl(locale);
  const canonical = `${base}/cars/compare/${c1}/${c2}`;
  const nameA = isEn ? `${mA.nameEn} ${modA.nameEn}` : `${mA.nameHe} ${modA.nameHe}`;
  const nameB = isEn ? `${mB.nameEn} ${modB.nameEn}` : `${mB.nameHe} ${modB.nameHe}`;
  const title = isEn
    ? `${nameA} vs ${nameB} — Which is Better?`
    : `${nameA} מול ${nameB} — איזה עדיף?`;
  const description = isEn
    ? `${nameA} or ${nameB}? Full comparison: AI scores, owner reviews, pros & cons — CarIssues`
    : `${nameA} או ${nameB}? השוואה מלאה: ציונים, ביקורות בעלי רכב בישראל, יתרונות וחסרונות של כל דגם — CarIssues IL`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        he: `https://carissues.co.il/cars/compare/${c1}/${c2}`,
        en: `https://carissues.net/cars/compare/${c1}/${c2}`,
      },
    },
    openGraph: { title, description: `${mA.nameEn} ${modA.nameEn} vs ${mB.nameEn} ${modB.nameEn}`, url: canonical, images: [{ url: '/og-default.svg', width: 1200, height: 630 }] },
  };
}

export const dynamic = 'force-dynamic';


function Score({ label, value, best }: { label: string; value: number | null; best: 'a' | 'b' | 'tie' | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: best ? 'var(--accent)' : 'var(--text)' }}>
        {value.toFixed(1)}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export default async function ComparePage({ params }: Props) {
  const { make1, model1, make2, model2 } = await params;

  // Enforce canonical slug order (alphabetical) to avoid duplicate pages
  const [c1, c2] = [`${make1}/${model1}`, `${make2}/${model2}`].sort();
  if (`${make1}/${model1}` !== c1) {
    redirect(`/cars/compare/${c1}/${c2}`);
  }

  const [locale, mA, mB] = await Promise.all([getHostLocale(), getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) notFound();
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) notFound();

  const [reviewsA, reviewsB, expertA, expertB, carModelA, carModelB, similarA, similarB] = await Promise.all([
    getReviewsForModel(make1, model1).catch(() => []),
    getReviewsForModel(make2, model2).catch(() => []),
    getExpertReviews(make1, model1).catch(() => []),
    getExpertReviews(make2, model2).catch(() => []),
    findCarModel(make1, model1).catch(() => null),
    findCarModel(make2, model2).catch(() => null),
    getSimilarModels(make1, model1, modA?.category ?? 'sedan', 10).catch(() => []),
    getSimilarModels(make2, model2, modB?.category ?? 'sedan', 10).catch(() => []),
  ]);

  const isEn = locale === 'en';
  const sp = translations[locale].compareStaticPage;
  const nameA = isEn ? `${mA.nameEn} ${modA.nameEn}` : `${mA.nameHe} ${modA.nameHe}`;
  const nameB = isEn ? `${mB.nameEn} ${modB.nameEn}` : `${mB.nameHe} ${modB.nameHe}`;

  const avgA = reviewsA.length ? reviewsA.reduce((s, r) => s + r.rating, 0) / reviewsA.length : null;
  const avgB = reviewsB.length ? reviewsB.reduce((s, r) => s + r.rating, 0) / reviewsB.length : null;
  const scoreA = expertA[0]?.topScore ?? null;
  const scoreB = expertB[0]?.topScore ?? null;

  const better = (a: number | null, b: number | null): 'a' | 'b' | 'tie' | null => {
    if (a === null && b === null) return null;
    if (a === null) return 'b';
    if (b === null) return 'a';
    if (Math.abs(a - b) < 0.15) return 'tie';
    return a > b ? 'a' : 'b';
  };

  const ratingWinner = better(avgA, avgB);
  const scoreWinner = better(scoreA, scoreB);
  // Only show pros/cons on HE — they're Hebrew text from the DB
  const prosA = !isEn ? (expertA[0]?.pros ?? []) : [];
  const consA = !isEn ? (expertA[0]?.cons ?? []) : [];
  const prosB = !isEn ? (expertB[0]?.pros ?? []) : [];
  const consB = !isEn ? (expertB[0]?.cons ?? []) : [];

  const col: React.CSSProperties = { flex: 1, minWidth: 0, textAlign: 'center' };
  const divider: React.CSSProperties = { width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 };

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sp.breadcrumbHome}</Link>
          <span>›</span>
          <Link href="/cars/compare" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{sp.breadcrumbCompare}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{nameA} {sp.vsWord} {nameB}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, marginBottom: 8 }}>
          {nameA} {sp.vsWord} {nameB}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {mA.nameEn} {modA.nameEn} vs {mB.nameEn} {modB.nameEn} — {sp.subtitleCompare}
        </p>

        {/* Header card */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mA.logoUrl} nameEn={mA.nameEn} size={52} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{nameA}</div>
            {!isEn && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mA.nameEn} {modA.nameEn}</div>}
            <Link href={`/cars/${make1}/${model1}`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              {sp.modelPageLink}
            </Link>
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }}>VS</div>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mB.logoUrl} nameEn={mB.nameEn} size={52} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{nameB}</div>
            {!isEn && <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mB.nameEn} {modB.nameEn}</div>}
            <Link href={`/cars/${make2}/${model2}`} style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              {sp.modelPageLink}
            </Link>
          </div>
        </div>

        {/* 3D Viewers */}
        {(carModelA || carModelB) && (
          <div className="card" style={{ padding: '20px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{sp.models3dTitle}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                {carModelA
                  ? <Car3DViewer uid={carModelA.uid} modelName={nameA} makeSlug={make1} modelSlug={model1} />
                  : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', borderRadius: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sp.no3dModel}</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                {carModelB
                  ? <Car3DViewer uid={carModelB.uid} modelName={nameB} makeSlug={make2} modelSlug={model2} />
                  : <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', borderRadius: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{sp.no3dModel}</div>
                }
              </div>
            </div>
          </div>
        )}

        {/* Scores */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>{sp.scoresTitle}</h2>
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{ ...col, padding: '0 16px' }}>
              <Score label={sp.userRating} value={avgA} best={ratingWinner === 'a' ? 'a' : null} />
              {avgA !== null && <div style={{ marginTop: 6 }}><StarRating rating={avgA} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviewsA.length} {sp.reviews}</div>
            </div>
            <div style={divider} />
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sp.userRating}</div>
            </div>
            <div style={divider} />
            <div style={{ ...col, padding: '0 16px' }}>
              <Score label={sp.userRating} value={avgB} best={ratingWinner === 'b' ? 'b' : null} />
              {avgB !== null && <div style={{ marginTop: 6 }}><StarRating rating={avgB} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviewsB.length} {sp.reviews}</div>
            </div>
          </div>

          {(scoreA !== null || scoreB !== null) && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
              <div style={{ display: 'flex', gap: 0 }}>
                <div style={{ ...col, padding: '0 16px' }}>
                  <Score label={sp.aiScore} value={scoreA} best={scoreWinner === 'a' ? 'a' : null} />
                </div>
                <div style={divider} />
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sp.aiScore}</div>
                </div>
                <div style={divider} />
                <div style={{ ...col, padding: '0 16px' }}>
                  <Score label={sp.aiScore} value={scoreB} best={scoreWinner === 'b' ? 'b' : null} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pros & Cons — only shown for Hebrew locale (data is Hebrew from DB) */}
        {(prosA.length > 0 || prosB.length > 0 || consA.length > 0 || consB.length > 0) && (
          <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>{sp.prosAndConsTitle}</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{nameA}</div>
                {prosA.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                  </div>
                ))}
                {consA.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{nameB}</div>
                {prosB.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-muted)' }}>{p}</span>
                  </div>
                ))}
                {consB.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Verdict */}
        {(scoreA !== null || scoreB !== null || avgA !== null || avgB !== null) && (() => {
          const rw = better(avgA, avgB);
          const sw = better(scoreA, scoreB);
          const winner = sw ?? rw;
          const winnerName = winner === 'a' ? nameA : winner === 'b' ? nameB : null;
          const loserName  = winner === 'a' ? nameB : winner === 'b' ? nameA : null;
          return (
            <div className="card" style={{ padding: '24px 28px', marginBottom: 28, borderRight: '4px solid var(--accent)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 12 }}>{sp.verdictTitle}</h2>
              {winner && winner !== 'tie' ? (
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {sp.verdictWinnerPre} <strong>{winnerName}</strong> {sp.verdictWinnerMid} {loserName}.
                  {(expertA[0]?.pros?.length ?? 0) > 0 || (expertB[0]?.pros?.length ?? 0) > 0 ? ` ${sp.verdictHasPros}` : ''}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                  {sp.verdictTie}
                </p>
              )}
            </div>
          );
        })()}

        {/* CTA to interactive compare */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{sp.ctaTitle}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{sp.ctaSubtitle}</div>
          </div>
          <Link href={`/cars/compare?car1=${make1}/${model1}&car2=${make2}/${model2}`} className="btn btn-primary" style={{ height: 40, padding: '0 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            {sp.ctaButton}
          </Link>
        </div>

        {/* Related comparisons */}
        {(similarA.length > 0 || similarB.length > 0) && (
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{sp.relatedTitle}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {nameA} {sp.vsGroup}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {similarA.filter(s => !(s.makeSlug === make2 && s.model.slug === model2)).slice(0, 6).map(s => {
                    const [s1, s2] = [`${make1}/${model1}`, `${s.makeSlug}/${s.model.slug}`].sort();
                    const sName = isEn ? `${s.makeNameEn} ${s.model.nameEn}` : `${s.makeNameHe} ${s.model.nameHe}`;
                    return (
                      <Link key={`${s.makeSlug}/${s.model.slug}`} href={`/cars/compare/${s1}/${s2}`}
                        style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⚖️</span>
                        {nameA} vs {sName}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {nameB} {sp.vsGroup}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {similarB.filter(s => !(s.makeSlug === make1 && s.model.slug === model1)).slice(0, 6).map(s => {
                    const [s1, s2] = [`${make2}/${model2}`, `${s.makeSlug}/${s.model.slug}`].sort();
                    const sName = isEn ? `${s.makeNameEn} ${s.model.nameEn}` : `${s.makeNameHe} ${s.model.nameHe}`;
                    return (
                      <Link key={`${s.makeSlug}/${s.model.slug}`} href={`/cars/compare/${s1}/${s2}`}
                        style={{ fontSize: '0.875rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>⚖️</span>
                        {nameB} vs {sName}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${nameA} ${sp.vsWord} ${nameB}`,
          url: `${getBaseUrl(locale)}/cars/compare/${make1}/${model1}/${make2}/${model2}`,
          description: `${mA.nameEn} ${modA.nameEn} vs ${mB.nameEn} ${modB.nameEn}`,
        })}} />
      </div>
    </div>
  );
}

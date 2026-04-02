import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMakeBySlug, getModelBySlug, getAllMakes } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import StarRating from '@/components/StarRating';
import MakeLogo from '@/components/MakeLogo';

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make1, model1, make2, model2 } = await params;
  const [mA, mB] = await Promise.all([getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) return {};
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) return {};
  const title = `${mA.nameHe} ${modA.nameHe} מול ${mB.nameHe} ${modB.nameHe} — השוואה מלאה`;
  const url = `https://carissues.co.il/cars/compare/${make1}/${model1}/${make2}/${model2}`;
  return {
    title,
    description: `השוואה בין ${mA.nameHe} ${modA.nameHe} ל${mB.nameHe} ${modB.nameHe}: ציונים, ביקורות בעלי רכב, יתרונות וחסרונות — CarIssues IL`,
    alternates: { canonical: url },
    openGraph: { title, url },
  };
}

export async function generateStaticParams() {
  const makes = await getAllMakes();
  const pairs: { make1: string; model1: string; make2: string; model2: string }[] = [];
  const flat = makes.flatMap(m => m.models.map(mo => ({ make: m.slug, model: mo.slug })));
  // Generate top pairs (same-category models up to 400 pairs to keep build fast)
  for (let i = 0; i < flat.length && pairs.length < 400; i++) {
    for (let j = i + 1; j < flat.length && pairs.length < 400; j++) {
      pairs.push({ make1: flat[i].make, model1: flat[i].model, make2: flat[j].make, model2: flat[j].model });
    }
  }
  return pairs;
}

function Score({ label, value, best }: { label: string; value: number | null; best: 'a' | 'b' | 'tie' | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: best ? 'var(--brand-red)' : 'var(--text-primary)' }}>
        {value.toFixed(1)}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export default async function ComparePage({ params }: Props) {
  const { make1, model1, make2, model2 } = await params;

  const [mA, mB] = await Promise.all([getMakeBySlug(make1), getMakeBySlug(make2)]);
  if (!mA || !mB) notFound();
  const [modA, modB] = await Promise.all([getModelBySlug(make1, model1), getModelBySlug(make2, model2)]);
  if (!modA || !modB) notFound();

  const [reviewsA, reviewsB, expertA, expertB] = await Promise.all([
    getReviewsForModel(make1, model1),
    getReviewsForModel(make2, model2),
    getExpertReviews(make1, model1),
    getExpertReviews(make2, model2),
  ]);

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
  const prosA = expertA[0]?.pros ?? [];
  const consA = expertA[0]?.cons ?? [];
  const prosB = expertB[0]?.pros ?? [];
  const consB = expertB[0]?.cons ?? [];

  const col: React.CSSProperties = { flex: 1, minWidth: 0, textAlign: 'center' };
  const divider: React.CSSProperties = { width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 };

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <Link href="/cars/compare" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>השוואה</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-primary)' }}>{mA.nameHe} {modA.nameHe} מול {mB.nameHe} {modB.nameHe}</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, marginBottom: 8 }}>
          {mA.nameHe} {modA.nameHe} מול {mB.nameHe} {modB.nameHe}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          {mA.nameEn} {modA.nameEn} vs {mB.nameEn} {modB.nameEn} — השוואת ביקורות ודירוגים
        </p>

        {/* Header card */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mA.logoUrl} nameEn={mA.nameEn} size={52} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{mA.nameHe} {modA.nameHe}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mA.nameEn} {modA.nameEn}</div>
            <Link href={`/cars/${make1}/${model1}`} style={{ fontSize: '0.8125rem', color: 'var(--brand-red)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              לדף הדגם ←
            </Link>
          </div>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }}>VS</div>
          <div style={{ ...col }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <MakeLogo logoUrl={mB.logoUrl} nameEn={mB.nameEn} size={52} />
            </div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{mB.nameHe} {modB.nameHe}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mB.nameEn} {modB.nameEn}</div>
            <Link href={`/cars/${make2}/${model2}`} style={{ fontSize: '0.8125rem', color: 'var(--brand-red)', textDecoration: 'none', display: 'block', marginTop: 8 }}>
              לדף הדגם ←
            </Link>
          </div>
        </div>

        {/* Scores */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>ציונים ודירוגים</h2>
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{ ...col, padding: '0 16px' }}>
              <Score label="דירוג משתמשים" value={avgA} best={ratingWinner === 'a' ? 'a' : null} />
              {avgA !== null && <div style={{ marginTop: 6 }}><StarRating rating={avgA} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviewsA.length} ביקורות</div>
            </div>
            <div style={divider} />
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 4 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>דירוג</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>משתמשים</div>
            </div>
            <div style={divider} />
            <div style={{ ...col, padding: '0 16px' }}>
              <Score label="דירוג משתמשים" value={avgB} best={ratingWinner === 'b' ? 'b' : null} />
              {avgB !== null && <div style={{ marginTop: 6 }}><StarRating rating={avgB} size={14} /></div>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{reviewsB.length} ביקורות</div>
            </div>
          </div>

          {(scoreA !== null || scoreB !== null) && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
              <div style={{ display: 'flex', gap: 0 }}>
                <div style={{ ...col, padding: '0 16px' }}>
                  <Score label="ציון AI" value={scoreA} best={scoreWinner === 'a' ? 'a' : null} />
                </div>
                <div style={divider} />
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ציון AI</div>
                </div>
                <div style={divider} />
                <div style={{ ...col, padding: '0 16px' }}>
                  <Score label="ציון AI" value={scoreB} best={scoreWinner === 'b' ? 'b' : null} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pros & Cons */}
        {(prosA.length > 0 || prosB.length > 0 || consA.length > 0 || consB.length > 0) && (
          <div className="card" style={{ padding: '24px 28px', marginBottom: 28 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20 }}>יתרונות וחסרונות</h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Car A */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{mA.nameHe} {modA.nameHe}</div>
                {prosA.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{p}</span>
                  </div>
                ))}
                {consA.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--brand-red)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{c}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
              {/* Car B */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>{mB.nameHe} {modB.nameHe}</div>
                {prosB.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{p}</span>
                  </div>
                ))}
                {consB.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--brand-red)', flexShrink: 0 }}>✗</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA to interactive compare */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>רוצה להשוות רכבים אחרים?</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>כלי ההשוואה האינטראקטיבי שלנו</div>
          </div>
          <Link href={`/cars/compare?car1=${make1}/${model1}&car2=${make2}/${model2}`} className="btn btn-primary" style={{ height: 40, padding: '0 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ⚖️ כלי ההשוואה
          </Link>
        </div>

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${mA.nameHe} ${modA.nameHe} מול ${mB.nameHe} ${modB.nameHe}`,
          url: `https://carissues.co.il/cars/compare/${make1}/${model1}/${make2}/${model2}`,
          description: `השוואה בין ${mA.nameEn} ${modA.nameEn} ל-${mB.nameEn} ${modB.nameEn}`,
        })}} />
      </div>
    </div>
  );
}

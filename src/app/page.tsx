import Link from 'next/link';
import { getAllMakes, getPopularMakes } from '@/lib/carsDb';
import { getServiceClient } from '@/lib/adminAuth';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';

export const dynamic = 'force-dynamic';

async function getTopRanked(limit = 3) {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, logoUrl: make.logoUrl });

  const [{ data: expertData }, { data: reviewData }] = await Promise.all([
    sb.from('expert_reviews').select('make_slug,model_slug,top_score').is('year', null).not('top_score', 'is', null),
    sb.from('reviews').select('make_slug,model_slug,rating'),
  ]);

  const scoreMap = new Map<string, number>();
  for (const row of expertData ?? []) scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData ?? []) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }

  const ranked: { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; avgRating: number | null }[] = [];
  for (const [key, info] of lookup.entries()) {
    const topScore = scoreMap.get(key) ?? null;
    const ratings = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const scores: number[] = [];
    if (topScore != null) scores.push(topScore);
    if (avgRating != null) scores.push(avgRating * 2);
    if (!scores.length) continue;
    const combined = scores.reduce((a, b) => a + b, 0) / scores.length;
    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, combined, avgRating });
  }
  ranked.sort((a, b) => b.combined - a.combined);
  return ranked.slice(0, limit);
}

async function getRecentReviews(limit = 3) {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, logoUrl: make.logoUrl });

  const { data } = await sb
    .from('reviews')
    .select('make_slug,model_slug,year,rating,title,body,author,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => ({
    ...r,
    ...(lookup.get(`${r.make_slug}/${r.model_slug}`) ?? { makeHe: r.make_slug, modelHe: r.model_slug, logoUrl: '' }),
  }));
}

export default async function HomePage() {
  const [popularMakes, allMakes, topRanked, recentReviews] = await Promise.all([
    getPopularMakes(), getAllMakes(), getTopRanked(3), getRecentReviews(3),
  ]);

  const widgetCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 14px',
    backdropFilter: 'blur(8px)',
  };

  const widgetLabel: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 10,
  };

  const widgetRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <>
      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b2e 50%, #1a1d3b 100%)', padding: '80px 0 90px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% -20%, rgba(230,57,70,.3) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 16px', borderRadius: 9999, background: 'rgba(230,57,70,.15)', border: '1px solid rgba(230,57,70,.3)', color: '#ff9999', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 24 }}>
                🇮🇱 הקהילה הגדולה ביותר לבעלי רכב בישראל
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.02em' }}>
                גלה בעיות ברכב שלך<br />
                <span style={{ color: 'var(--brand-red)' }}>לפני שיגדלו</span>
              </h1>
              <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.7)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
                ביקורות אמיתיות של בעלי רכב בישראל. מצא בעיות נפוצות לפי יצרן, דגם ושנה.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/cars" className="btn btn-primary" style={{ fontSize: '1rem', height: 52, padding: '0 32px' }}>
                  🔍 חפש לפי יצרן
                </Link>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 56, flexWrap: 'wrap' }}>
                {[
                  { num: `${allMakes.length}+`, label: 'יצרנים' },
                  { num: `${allMakes.reduce((s, m) => s + m.models.length, 0)}+`, label: 'דגמים' },
                  { num: 'AI', label: 'מופעל בבינה מלאכותית' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.num}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      </section>

      {/* ── Popular Makes + Widgets ── */}
      <section id="popular" style={{ padding: '64px 0' }}>
        <div className="container">
          {/* Header — full width above the split */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>יצרנים פופולריים</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>הדגמים הנפוצים ביותר בישראל</p>
          </div>

          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

            {/* 75% — Popular Makes */}
            <div style={{ flex: '0 0 75%', minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                {popularMakes.map((make) => (
                  <Link key={make.slug} href={`/cars/${make.slug}`} className="card" style={{ padding: '24px 16px', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                      <MakeLogo logoUrl={make.logoUrl} nameEn={make.nameEn} size={52} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{make.nameHe}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{make.models.length} דגמים</div>
                    <div style={{ marginTop: 12, height: 24, borderRadius: 9999, background: 'rgba(230,57,70,.08)', color: 'var(--brand-red)', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {make.country}
                    </div>
                  </Link>
                ))}
              </div>
              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <Link href="/cars" style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}>
                  כל היצרנים ←
                </Link>
              </div>
            </div>

            {/* 25% — Widgets */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Top ranked */}
              {topRanked.length > 0 && (
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                    🏆 מדורגים
                  </div>
                  {topRanked.map((car, i) => (
                    <Link key={`${car.makeSlug}/${car.modelSlug}`} href={`/cars/${car.makeSlug}/${car.modelSlug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                        <MakeLogo logoUrl={car.logoUrl} nameEn={car.makeEn} size={20} />
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {car.makeHe} {car.modelHe}
                        </span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--brand-red)', flexShrink: 0 }}>
                          {car.combined.toFixed(1)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Link href="/rankings" style={{ display: 'block', marginTop: 10, fontSize: '0.75rem', color: 'var(--brand-red)', fontWeight: 600, textDecoration: 'none', textAlign: 'left' }}>
                    כל הדירוגים ←
                  </Link>
                </div>
              )}

              {/* Recent reviews */}
              {recentReviews.length > 0 && (
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                    💬 ביקורות אחרונות
                  </div>
                  {recentReviews.map((r: any, i: number) => (
                    <Link key={r.make_slug + r.model_slug + r.created_at} href={`/cars/${r.make_slug}/${r.model_slug}${r.year ? `/${r.year}` : ''}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                        <MakeLogo logoUrl={r.logoUrl} nameEn={r.makeHe} size={20} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.makeHe} {r.modelHe}{r.year ? ` ${r.year}` : ''}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title || r.body || r.author}
                          </div>
                        </div>
                        <StarRating rating={r.rating} size={11} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: 'var(--bg-card)', padding: '64px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>איך זה עובד?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {HOW_STEPS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-red), var(--brand-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: 'var(--shadow-red)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const HOW_STEPS = [
  { icon: '🔍', title: 'בחר את הרכב שלך', desc: 'חפש לפי יצרן, דגם ושנת ייצור.' },
  { icon: '📋', title: 'קרא ביקורות אמיתיות', desc: 'ראה בעיות נפוצות שדיווחו בעלי רכב כמוך.' },
  { icon: '✏️', title: 'שתף את הניסיון שלך', desc: 'כתב ביקורת ועזור לאחרים להתמודד עם אותן בעיות.' },
];

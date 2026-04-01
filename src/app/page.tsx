import Link from 'next/link';
import { getAllMakes, getPopularMakes } from '@/lib/carsDb';
import { getServiceClient } from '@/lib/adminAuth';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';

export const dynamic = 'force-dynamic';

async function getTopRanked(limit = 5) {
  const sb = getServiceClient();
  const makes = await getAllMakes();

  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string }>();
  for (const make of makes) {
    for (const model of make.models) {
      lookup.set(`${make.slug}/${model.slug}`, {
        makeHe: make.nameHe, modelHe: model.nameHe,
        makeEn: make.nameEn, modelEn: model.nameEn,
        logoUrl: make.logoUrl,
      });
    }
  }

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

  const ranked: { makeSlug: string; modelSlug: string; makeHe: string; modelHe: string; makeEn: string; modelEn: string; logoUrl: string; combined: number; reviewCount: number; avgRating: number | null }[] = [];
  for (const [key, info] of lookup.entries()) {
    const topScore  = scoreMap.get(key) ?? null;
    const ratings   = reviewMap.get(key) ?? [];
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const scores = [];
    if (topScore != null) scores.push(topScore);
    if (avgRating != null) scores.push(avgRating * 2);
    if (scores.length === 0) continue;
    const combined = scores.reduce((a, b) => a + b, 0) / scores.length;
    const [makeSlug, modelSlug] = key.split('/');
    ranked.push({ makeSlug, modelSlug, ...info, combined, reviewCount: ratings.length, avgRating });
  }
  ranked.sort((a, b) => b.combined - a.combined);
  return ranked.slice(0, limit);
}

async function getRecentReviews(limit = 4) {
  const sb = getServiceClient();
  const makes = await getAllMakes();

  const lookup = new Map<string, { makeHe: string; modelHe: string; logoUrl: string }>();
  for (const make of makes) {
    for (const model of make.models) {
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, logoUrl: make.logoUrl });
    }
  }

  const { data } = await sb
    .from('reviews')
    .select('make_slug,model_slug,year,rating,title,author_name,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: any) => ({
    ...r,
    ...(lookup.get(`${r.make_slug}/${r.model_slug}`) ?? { makeHe: r.make_slug, modelHe: r.model_slug, logoUrl: '' }),
  }));
}

export default async function HomePage() {
  const [popularMakes, allMakes, topRanked, recentReviews] = await Promise.all([
    getPopularMakes(),
    getAllMakes(),
    getTopRanked(5),
    getRecentReviews(4),
  ]);

  return (
    <>
      {/* ── Hero ── */}
      <section style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b2e 50%, #1a1d3b 100%)', padding: '80px 0 90px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% -20%, rgba(230,57,70,.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 16px', borderRadius: 9999, background: 'rgba(230,57,70,.15)', border: '1px solid rgba(230,57,70,.3)', color: '#ff9999', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 24 }}>
            🇮🇱 הקהילה הגדולה ביותר לבעלי רכב בישראל
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.02em' }}>
            גלה בעיות ברכב שלך<br />
            <span style={{ color: 'var(--brand-red)' }}>לפני שיגדלו</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(255,255,255,0.7)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
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
      </section>

      {/* ── Top Ranked + Recent Reviews ── */}
      <section style={{ padding: '64px 0', background: 'var(--bg-base)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'start' }}>

            {/* Top Ranked */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 4 }}>🏆 הרכבים הכי מדורגים</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>לפי ציון AI + ביקורות בעלי רכב</p>
                </div>
                <Link href="/rankings" style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  כל הדירוגים ←
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topRanked.map((car, i) => (
                  <Link
                    key={`${car.makeSlug}/${car.modelSlug}`}
                    href={`/cars/${car.makeSlug}/${car.modelSlug}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Rank badge */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : i === 1 ? 'linear-gradient(135deg,#9ca3af,#6b7280)' : i === 2 ? 'linear-gradient(135deg,#b45309,#92400e)' : 'var(--bg-muted)',
                        color: i < 3 ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '0.875rem',
                      }}>
                        {i + 1}
                      </div>
                      <MakeLogo logoUrl={car.logoUrl} nameEn={car.makeEn} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {car.makeHe} {car.modelHe}
                        </div>
                        {car.avgRating != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <StarRating rating={car.avgRating} size={12} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({car.reviewCount})</span>
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: car.combined >= 7 ? 'rgba(22,163,74,0.1)' : car.combined >= 5 ? 'rgba(202,138,4,0.1)' : 'rgba(220,38,38,0.1)',
                        color: car.combined >= 7 ? '#16a34a' : car.combined >= 5 ? '#ca8a04' : '#dc2626',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}>{car.combined.toFixed(1)}</div>
                        <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>/10</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Reviews */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: 4 }}>💬 ביקורות אחרונות</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>מה אומרים בעלי רכב לאחרונה</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentReviews.map((r: any) => (
                  <Link
                    key={r.make_slug + r.model_slug + r.created_at}
                    href={`/cars/${r.make_slug}/${r.model_slug}${r.year ? `/${r.year}` : ''}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <MakeLogo logoUrl={r.logoUrl} nameEn={r.makeHe} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.makeHe} {r.modelHe} {r.year ? `· ${r.year}` : ''}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {r.author_name} · {new Date(r.created_at).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                        <StarRating rating={r.rating} size={13} />
                      </div>
                      {r.title && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          &ldquo;{r.title}&rdquo;
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Popular Makes ── */}
      <section id="popular" style={{ padding: '64px 0', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>יצרנים פופולריים</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>הדגמים הנפוצים ביותר בישראל</p>
            </div>
            <Link href="/cars" style={{ color: 'var(--brand-red)', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}>
              כל היצרנים ←
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 16 }}>
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
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: 'var(--bg-base)', padding: '64px 0', borderTop: '1px solid var(--border)' }}>
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

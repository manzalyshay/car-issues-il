import { getServiceClient } from '@/lib/adminAuth';
import { getAllMakes } from '@/lib/carsDb';

export const dynamic = 'force-dynamic';
export const metadata = { robots: 'noindex' };

const RED = '#e63946';
const BG = '#0a0b0f';
const CARD = '#13151c';
const BORDER = '#1e2130';
const TEXT = '#f0f2f5';
const MUTED = '#6b7280';

async function getTopRanked(limit = 6) {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; logoUrl: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, logoUrl: make.logoUrl });

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

  const ranked: { key: string; combined: number; reviewCount: number }[] = [];
  for (const [key] of lookup) {
    const score = scoreMap.get(key) ?? null;
    const ratings = reviewMap.get(key) ?? [];
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const scores: number[] = [];
    if (score != null) scores.push(score);
    if (avg != null) scores.push(avg * 2);
    if (!scores.length) continue;
    ranked.push({ key, combined: scores.reduce((a, b) => a + b) / scores.length, reviewCount: ratings.length });
  }
  ranked.sort((a, b) => b.combined - a.combined);
  return ranked.slice(0, limit).map((r, i) => ({ ...r, ...lookup.get(r.key)!, rank: i + 1 }));
}

export default async function OgTopRanked() {
  const cars = await getTopRanked(6);
  const medals = ['🥇', '🥈', '🥉', '4', '5', '6'];

  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="viewport" content="width=1200" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: BG, fontFamily: "'Rubik', sans-serif", width: 1200, height: 630, overflow: 'hidden' }}>
        <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'column', padding: '36px 48px', boxSizing: 'border-box', position: 'relative' }}>

          {/* Red accent bar */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: 6, height: '100%', background: `linear-gradient(to bottom, ${RED}, #7c1520)` }} />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: RED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>carissues.co.il</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: TEXT, lineHeight: 1.2 }}>
                🏆 הרכבים הכי מדורגים בישראל
              </h1>
            </div>
            <div style={{ textAlign: 'left', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 18px' }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>מבוסס על</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>ביקורות אמיתיות + AI</div>
            </div>
          </div>

          {/* Cars grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            {cars.map((car, i) => {
              const pct = Math.round((car.combined / 10) * 100);
              const isTop = i < 3;
              return (
                <div key={car.key} style={{ background: CARD, border: `1px solid ${isTop ? RED + '44' : BORDER}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Rank */}
                  <div style={{ fontSize: i < 3 ? 24 : 16, fontWeight: 900, color: i < 3 ? '#ffd700' : MUTED, width: 32, textAlign: 'center', flexShrink: 0 }}>
                    {medals[i]}
                  </div>
                  {/* Logo */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={car.logoUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} onError={undefined} />
                  {/* Name + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 6 }}>{car.makeHe} {car.modelHe}</div>
                    <div style={{ height: 6, background: BORDER, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isTop ? `linear-gradient(to left, ${RED}, #ff6b6b)` : '#374151', borderRadius: 99 }} />
                    </div>
                    {car.reviewCount > 0 && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{car.reviewCount} ביקורות</div>}
                  </div>
                  {/* Score */}
                  <div style={{ fontSize: 20, fontWeight: 900, color: isTop ? RED : TEXT, flexShrink: 0 }}>{car.combined.toFixed(1)}</div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: MUTED }}>הדירוג מבוסס על סיכומי AI + ביקורות בעלי רכב בישראל</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: RED }}>carissues.co.il ←</div>
          </div>
        </div>
      </body>
    </html>
  );
}

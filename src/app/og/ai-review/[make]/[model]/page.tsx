import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getExpertReviews } from '@/lib/expertReviews';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { robots: 'noindex' };

const RED = '#e63946';
const BG = '#0a0b0f';
const CARD = '#13151c';
const BORDER = '#1e2130';
const TEXT = '#f0f2f5';
const MUTED = '#6b7280';
const GREEN = '#22c55e';

interface Props { params: Promise<{ make: string; model: string }> }

export default async function OgAiReview({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  if (!make) notFound();
  const model = await getModelBySlug(makeSlug, modelSlug);
  if (!model) notFound();

  const reviews = await getExpertReviews(makeSlug, modelSlug);
  const review = reviews[0] ?? null;

  const summary = review?.localSummaryHe ?? review?.globalSummaryHe ?? null;
  const excerpt = summary ? summary.slice(0, 220) + (summary.length > 220 ? '...' : '') : null;
  const score = review?.topScore ?? null;
  const scoreColor = score == null ? MUTED : score >= 7.5 ? GREEN : score >= 5.5 ? '#f59e0b' : RED;
  const pros = review?.pros?.slice(0, 3) ?? [];
  const cons = review?.cons?.slice(0, 3) ?? [];
  const postCount = (review?.localPostCount ?? 0) + (review?.globalPostCount ?? 0);

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

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={make.logoUrl} alt={make.nameEn} style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: RED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>סיכום AI · carissues.co.il</div>
              <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, color: TEXT, lineHeight: 1.1 }}>
                {make.nameHe} {model.nameHe}
              </h1>
            </div>
            {/* Score circle */}
            {score !== null && (
              <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: CARD, flexShrink: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>מתוך 10</div>
              </div>
            )}
          </div>

          {/* AI summary box */}
          {excerpt && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 22px', marginBottom: 20, position: 'relative', flex: excerpt ? '0 0 auto' : undefined }}>
              <div style={{ position: 'absolute', top: -10, right: 18, background: RED, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>
                🤖 סיכום AI
              </div>
              <p style={{ margin: 0, fontSize: 15, color: TEXT, lineHeight: 1.7, direction: 'rtl' }}>{excerpt}</p>
              {postCount > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>מבוסס על {postCount} פוסטים ודיונים אמיתיים</div>
              )}
            </div>
          )}

          {/* Pros / Cons */}
          {(pros.length > 0 || cons.length > 0) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              {pros.length > 0 && (
                <div style={{ flex: 1, background: CARD, border: `1px solid ${GREEN}33`, borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 10 }}>✅ יתרונות</div>
                  {pros.map((p, i) => (
                    <div key={i} style={{ fontSize: 13, color: TEXT, marginBottom: 6, display: 'flex', gap: 8 }}>
                      <span style={{ color: GREEN, flexShrink: 0 }}>•</span> {p}
                    </div>
                  ))}
                </div>
              )}
              {cons.length > 0 && (
                <div style={{ flex: 1, background: CARD, border: `1px solid ${RED}33`, borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 10 }}>⚠️ חסרונות</div>
                  {cons.map((c, i) => (
                    <div key={i} style={{ fontSize: 13, color: TEXT, marginBottom: 6, display: 'flex', gap: 8 }}>
                      <span style={{ color: RED, flexShrink: 0 }}>•</span> {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
              <span style={{ fontSize: 12, color: MUTED }}>סיכום AI מבוסס על ביקורות אמיתיות של בעלי רכב בישראל ובעולם</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: RED }}>carissues.co.il ←</div>
          </div>
        </div>
      </body>
    </html>
  );
}

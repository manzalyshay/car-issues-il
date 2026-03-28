import { ImageResponse } from 'next/og';
import { getMakeBySlug, getModelBySlug } from '@/data/cars';
import { getExpertReviews } from '@/lib/expertReviews';
import { getReviewsForModel } from '@/lib/reviewsDb';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props { params: Promise<{ make: string; model: string }> }

export default async function OGImage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = getMakeBySlug(makeSlug);
  const model = make ? getModelBySlug(make, modelSlug) : null;
  if (!make || !model) return new Response('Not found', { status: 404 });

  const [reviews, expertReviews] = await Promise.all([
    getReviewsForModel(makeSlug, modelSlug),
    getExpertReviews(makeSlug, modelSlug),
  ]);

  const expertReview = expertReviews[0] ?? null;
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;
  const score = expertReview?.topScore ?? null;
  const reviewCount = reviews.length;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630, display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b2e 50%, #1a1d3b 100%)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Red glow */}
        <div style={{
          position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(230,57,70,0.25) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Left accent bar */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
          background: 'linear-gradient(180deg, #e63946, #e76f51)',
          display: 'flex',
        }} />

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '60px 80px 60px 88px' }}>

          {/* Top: branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #e63946, #e76f51)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                <rect x="3" y="19" width="26" height="7" rx="3" fill="white"/>
                <path d="M8,19 L11,12 Q12,11 14,11 L18,11 Q20,11 21,12 L24,19 Z" fill="white"/>
                <path d="M13,18.5 L15,13.5 Q15.5,13 16.5,13 L18,13.5 L20,18.5 Z" fill="rgba(230,57,70,0.6)"/>
                <circle cx="10" cy="26" r="3" fill="#e63946" stroke="white" strokeWidth="1.5"/>
                <circle cx="22" cy="26" r="3" fill="#e63946" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 600 }}>CarIssues IL</span>
          </div>

          {/* Middle: car name */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 26, marginBottom: 10 }}>
              {make.nameEn}
            </div>
            <div style={{
              color: 'white', fontSize: 88, fontWeight: 900, lineHeight: 1,
              marginBottom: 16,
            }}>
              {make.nameHe} {model.nameHe}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 28 }}>
              {make.nameEn} {model.nameEn}
            </div>
          </div>

          {/* Bottom: stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 40 }}>
            {score !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(230,57,70,0.15)', border: '1px solid rgba(230,57,70,0.4)',
                borderRadius: 14, padding: '12px 20px',
              }}>
                <div style={{ color: '#e63946', fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
                  {score.toFixed(1)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>ציון AI</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>מתוך 10</div>
                </div>
              </div>
            )}
            {avgRating !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 14, padding: '12px 20px',
              }}>
                <div style={{ color: '#f59e0b', fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
                  {avgRating.toFixed(1)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>דירוג משתמשים</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{reviewCount} ביקורות</div>
                </div>
              </div>
            )}
            {reviewCount === 0 && score === null && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 24 }}>
                ביקורות ובעיות נפוצות
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

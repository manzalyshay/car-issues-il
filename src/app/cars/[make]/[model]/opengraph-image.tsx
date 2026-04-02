import { ImageResponse } from 'next/og';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getReviewsForModel } from '@/lib/reviewsDb';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props { params: Promise<{ make: string; model: string }> }

export default async function OgImage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const make = await getMakeBySlug(makeSlug);
  const model = make ? await getModelBySlug(makeSlug, modelSlug) : null;
  const reviews = make && model ? await getReviewsForModel(makeSlug, modelSlug) : [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const stars = avgRating ? Math.round(avgRating) : 0;

  const carName = make && model ? `${make.nameHe} ${model.nameHe}` : 'CarIssues IL';
  const carNameEn = make && model ? `${make.nameEn} ${model.nameEn}` : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b2e 50%, #1a1d3b 100%)',
          display: 'flex', flexDirection: 'column',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Brand accent glow */}
        <div style={{
          position: 'absolute', top: -100, left: '50%',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(230,57,70,0.25) 0%, transparent 70%)',
          transform: 'translateX(-50%)',
        }} />

        {/* Top bar: logo + site name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#e63946',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>⚠️</div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>
            CarIssues<span style={{ color: '#e63946' }}>IL</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>carissues.co.il</div>
        </div>

        {/* Car name */}
        <div style={{ color: '#fff', fontSize: 64, fontWeight: 900, lineHeight: 1.1, marginBottom: 12 }}>
          {carName}
        </div>
        {carNameEn && (
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 26, marginBottom: 40 }}>
            {carNameEn}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 32, marginTop: 'auto' }}>
          {avgRating !== null && (
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16, padding: '20px 28px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                דירוג משתמשים
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#fff', fontSize: 42, fontWeight: 900 }}>{avgRating.toFixed(1)}</span>
                <span style={{ color: '#fbbf24', fontSize: 28 }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{reviews.length} ביקורות</div>
            </div>
          )}

          <div style={{
            background: 'rgba(230,57,70,0.12)',
            border: '1px solid rgba(230,57,70,0.3)',
            borderRadius: 16, padding: '20px 28px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ביקורות אמיתיות
            </div>
            <div style={{ color: '#e63946', fontSize: 42, fontWeight: 900 }}>{reviews.length}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>מבעלי רכב בישראל</div>
          </div>

          {model && (
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16, padding: '20px 28px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                שנים
              </div>
              <div style={{ color: '#fff', fontSize: 32, fontWeight: 900 }}>
                {model.years[model.years.length - 1]}–{model.years[0]}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{model.years.length} שנות ייצור</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from 'next/og';
import { getMakeBySlug, getModelBySlug } from '@/lib/carsDb';
import { getHostLocale } from '@/lib/hostLocale';
import { fetchImageDataUrl, loadOgFonts, rtlVisual } from '@/lib/ogImage';

// Share preview (WhatsApp, Facebook, X...) for a compare page: both car photos and names.
// Laid out on a 1200x630 grid, rendered at 720x378: @vercel/og only emits PNG, and with two
// photos a full-size PNG is ~700KB - over the ~300KB WhatsApp accepts for previews.
// 720x378 keeps the 1.91:1 ratio and stays above Facebook's 600x315 large-card minimum.
const SCALE = 0.6;
const px = (n: number) => Math.round(n * SCALE);
export const size = { width: px(1200), height: px(630) };
export const contentType = 'image/png';
export const alt = 'CarIssues car comparison';

interface Props { params: Promise<{ make1: string; model1: string; make2: string; model2: string }> }

const BG = '#0f1724';
const CARD = '#162033';
const BORDER = '#24324a';
const BLUE = '#3b82f6';
const TEXT = '#ffffff';
const MUTED = '#94a3b8';

// Photo pixels dominate the PNG size, so the photo band is kept fairly short.
const PHOTO_H = 250;
const CARD_H = PHOTO_H + 160;

interface Side { make: string; model: string; photo: string | null }

export default async function CompareOgImage({ params }: Props) {
  const { make1, model1, make2, model2 } = await params;
  // Without our fonts @vercel/og would fetch Hebrew glyphs from Google and hang on Workers -
  // fall back to the static site banner instead of ever returning a broken image.
  const fonts = await loadOgFonts().catch(() => null);
  if (!fonts) return Response.redirect('https://carissues.co.il/og-default.png', 302);

  const [locale, mA, mB, modA, modB] = await Promise.all([
    getHostLocale().catch(() => 'he' as const),
    getMakeBySlug(make1), getMakeBySlug(make2),
    getModelBySlug(make1, model1), getModelBySlug(make2, model2),
  ]);
  const isEn = locale === 'en';
  const t = (s: string) => (isEn ? s : rtlVisual(s));

  const [photoA, photoB] = await Promise.all([
    fetchImageDataUrl(modA?.leadingImageUrl),
    fetchImageDataUrl(modB?.leadingImageUrl),
  ]);
  const side = (mk: typeof mA, md: typeof modA, slugMake: string, slugModel: string, photo: string | null): Side => ({
    make: mk ? (isEn ? mk.nameEn : mk.nameHe) : slugMake,
    model: md ? (isEn ? md.nameEn : md.nameHe) : slugModel,
    photo,
  });
  const a = side(mA, modA, make1, model1, photoA);
  const b = side(mB, modB, make2, model2, photoB);

  const card = (s: Side) => (
    <div style={{
      display: 'flex', flexDirection: 'column', width: px(500), height: px(CARD_H),
      background: CARD, border: `${px(2)}px solid ${BORDER}`, borderRadius: px(28), overflow: 'hidden',
    }}>
      {s.photo ? (
        <img src={s.photo} width={px(500)} height={px(PHOTO_H)} style={{ width: px(500), height: px(PHOTO_H), objectFit: 'cover' }} alt="" />
      ) : (
        <div style={{
          display: 'flex', width: px(500), height: px(PHOTO_H), alignItems: 'center', justifyContent: 'center',
          background: '#1c2940', color: '#33445f', fontSize: px(72), fontWeight: 800,
        }}>{t(s.make)}</div>
      )}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: 1, padding: `0 ${px(20)}px`,
      }}>
        <div style={{ display: 'flex', color: MUTED, fontSize: px(32), lineHeight: 1.15 }}>{t(s.make)}</div>
        <div style={{ display: 'flex', color: TEXT, fontSize: px(58), fontWeight: 800, lineHeight: 1.15 }}>{t(s.model)}</div>
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{
        width: px(1200), height: px(630), display: 'flex', flexDirection: 'column',
        background: `linear-gradient(135deg, #0b111c 0%, ${BG} 55%, #17233a 100%)`,
        fontFamily: 'Heebo', padding: `${px(34)}px ${px(50)}px ${px(30)}px`,
      }}>
        {/* Header: wordmark + label (mirrored for Hebrew) */}
        <div style={{ display: 'flex', flexDirection: isEn ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: px(40), fontWeight: 800, letterSpacing: px(-1) }}>
            <span style={{ color: TEXT }}>car</span><span style={{ color: BLUE }}>issues</span>
          </div>
          <div style={{
            display: 'flex', color: TEXT, fontSize: px(28), fontWeight: 800,
            background: 'rgba(59,130,246,0.18)', border: `${px(2)}px solid rgba(59,130,246,0.5)`,
            borderRadius: 999, padding: `${px(6)}px ${px(26)}px`,
          }}>{t(isEn ? 'Car comparison' : 'השוואת רכבים')}</div>
        </div>

        {/* Cars: A reads first, so it sits on the right in Hebrew */}
        <div style={{
          display: 'flex', flexDirection: isEn ? 'row' : 'row-reverse',
          alignItems: 'center', justifyContent: 'space-between', marginTop: px(26), position: 'relative',
        }}>
          {card(a)}
          {card(b)}
          <div style={{
            position: 'absolute', left: px(550), top: px(CARD_H / 2 - 50), width: px(100), height: px(100), borderRadius: px(50),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: BLUE, border: `${px(6)}px solid ${BG}`, color: TEXT, fontSize: px(36), fontWeight: 800,
          }}>VS</div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', flexDirection: isEn ? 'row' : 'row-reverse', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 'auto', color: MUTED, fontSize: px(26),
        }}>
          <div style={{ display: 'flex' }}>
            {t(isEn ? 'Reliability · Recalls · Owner reviews' : 'אמינות · ריקולים · ביקורות בעלי רכב')}
          </div>
          <div style={{ display: 'flex' }}>{isEn ? 'carissues.net' : 'carissues.co.il'}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
      // Share crawlers re-fetch rarely; let browsers/CDNs keep it for a day.
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    },
  );
}

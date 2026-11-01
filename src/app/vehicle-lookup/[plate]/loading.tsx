import { getHostLocale } from '@/lib/hostLocale';

/**
 * Shown instantly while the vehicle data loads (from the home search, the lookup
 * search, or a direct link) - the Ministry of Transport lookup can take a few seconds.
 * Same blue header as the results page so the result replaces it without a jump.
 */
export default async function Loading() {
  const isHe = (await getHostLocale()) === 'he';
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <div style={{ background: '#0f2c4d', padding: 'clamp(20px,3vw,28px) 0 36px' }}>
        <div className="container" style={{ maxWidth: 1240 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.14em', color: '#60a5fa', textTransform: 'uppercase' }}>
            {isHe ? 'ישראל • בדיקה חינמית' : 'Israel • Free check'}
          </div>
          <h1 style={{ margin: '4px 0 22px', fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2 }}>
            {isHe ? 'בדיקת רכב לפי מספר רישוי' : 'Vehicle check by license plate'}
          </h1>

          <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>
            {isHe ? 'מאתרים את הרכב במאגר משרד התחבורה…' : 'Finding the vehicle in the Ministry of Transport records…'}
          </div>
          {/* Progress bar: eases toward ~92% while waiting; the page replaces it when data arrives */}
          <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,.14)', overflow: 'hidden', maxWidth: 560 }}>
            <div className="vl-loading-bar" style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
          </div>
          <div style={{ fontSize: 12, color: '#9fb3d1', marginTop: 8 }}>
            {isHe ? 'זה לוקח בדרך כלל כמה שניות' : 'This usually takes a few seconds'}
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1240, padding: '20px 16px 64px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 180, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
      </div>

      <style>{`
        .vl-loading-bar { width: 4%; animation: vl-load 9s cubic-bezier(.1,.7,.2,1) forwards; }
        @keyframes vl-load { 0% { width: 4%; } 30% { width: 55%; } 60% { width: 80%; } 100% { width: 92%; } }
        @media (prefers-reduced-motion: reduce) { .vl-loading-bar { animation: none; width: 60%; } }
      `}</style>
    </div>
  );
}

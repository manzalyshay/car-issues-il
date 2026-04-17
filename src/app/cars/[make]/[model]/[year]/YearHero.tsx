'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

interface CarImageData {
  id: string;
  url: string;
  thumbnail_url: string | null;
}

interface Props {
  makeSlug: string;
  modelSlug: string;
  year: number;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn: string;
  modelNameEn: string;
}

export default function YearHero({ makeSlug, modelSlug, year, makeNameHe, modelNameHe, makeNameEn, modelNameEn }: Props) {
  const { isAdmin } = useAuth();
  const [images, setImages] = useState<CarImageData[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=images&year=${year}`)
      .then(r => r.json())
      .then((imgs: CarImageData[]) => { if (Array.isArray(imgs)) setImages(imgs); })
      .catch(() => {});
  }, [makeSlug, modelSlug, year]);

  // Pick the first non-hidden image
  const current = images.find(img => !hiddenIds.has(img.id));
  const imgUrl = current ? (current.thumbnail_url ?? current.url) : null;

  const handleFlag = async (reason: string) => {
    if (!current) return;
    setFlagging(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      await fetch('/api/admin/flag-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageId: current.id, reason: reason || null }),
      });
      setHiddenIds(prev => new Set([...prev, current.id]));
      setLoaded(false);
      setShowFlagMenu(false);
      setFlagReason('');
    } catch { /* ignore */ } finally {
      setFlagging(false);
    }
  };

  // No images at all (none fetched or all flagged) — render nothing
  if (images.length > 0 && !current) return null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
      background: 'var(--bg-muted)',
      aspectRatio: '16/5',
      minHeight: 140,
    }}>
      {/* Skeleton shimmer */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-card) 50%, var(--bg-muted) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s infinite',
        }} />
      )}

      {/* Image */}
      {imgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current?.id}
          src={imgUrl}
          alt={`${makeNameHe} ${modelNameHe}`}
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
          }}
        />
      )}

      {/* Gradient overlay — only when image loaded */}
      {imgUrl && loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 80%)',
        }} />
      )}

      {/* Admin flag button — top-left corner */}
      {isAdmin && current && loaded && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20 }}>
          {!showFlagMenu ? (
            <button
              onClick={() => setShowFlagMenu(true)}
              title="הסתר תמונה זו"
              style={{
                background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem',
                fontWeight: 600, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              🚩 הסתר תמונה
            </button>
          ) : (
            <div style={{
              background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)', borderRadius: 10, padding: 12,
              display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220,
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>סיבת הסרה (אופציונלי)</span>
              <input
                autoFocus
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                placeholder="למשל: דגם שגוי, שנה שגויה..."
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '5px 8px', color: '#fff', fontSize: '0.78rem',
                  outline: 'none', direction: 'rtl',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={flagging}
                  onClick={() => handleFlag(flagReason)}
                  style={{
                    flex: 1, padding: '5px 10px', borderRadius: 6, border: 'none',
                    background: 'var(--brand-red)', color: '#fff', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 700,
                  }}
                >
                  {flagging ? '...' : 'הסתר'}
                </button>
                <button
                  onClick={() => { setShowFlagMenu(false); setFlagReason(''); }}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem',
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, right: 0, left: 0,
        padding: '20px 24px 18px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ opacity: loaded || !imgUrl ? 1 : 0, transition: 'opacity 0.5s ease 0.15s' }}>
          <div style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.875rem)',
            fontWeight: 800,
            color: imgUrl && loaded ? '#fff' : 'var(--text-primary)',
            lineHeight: 1.15,
            textShadow: imgUrl && loaded ? '0 1px 8px rgba(0,0,0,0.4)' : 'none',
          }}>
            {makeNameHe} {modelNameHe}
          </div>
          <div style={{
            fontSize: '0.8125rem',
            color: imgUrl && loaded ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
            marginTop: 2,
          }}>
            {makeNameEn} {modelNameEn}
          </div>
        </div>

        {/* Year badge */}
        <div style={{
          background: 'var(--brand-red)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
          lineHeight: 1,
          padding: '6px 14px',
          borderRadius: 8,
          opacity: loaded || !imgUrl ? 1 : 0,
          transition: 'opacity 0.5s ease 0.25s',
          flexShrink: 0,
        }}>
          {year}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

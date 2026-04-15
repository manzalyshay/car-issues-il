'use client';

import { useState } from 'react';
import type { CarImage } from '@/lib/carImages';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

interface Props {
  images: CarImage[];
  makeNameHe: string;
  modelNameHe: string;
}

export default function CarImagesTab({ images: initialImages, makeNameHe, modelNameHe }: Props) {
  const { isAdmin } = useAuth();
  const [lightbox, setLightbox] = useState<CarImage | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [flagTarget, setFlagTarget] = useState<CarImage | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  const visibleImages = initialImages.filter(img => !hiddenIds.has(img.id));

  const handleFlag = async () => {
    if (!flagTarget) return;
    setFlagging(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      await fetch('/api/admin/flag-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageId: flagTarget.id, reason: flagReason || null }),
      });
      setHiddenIds(prev => new Set([...prev, flagTarget.id]));
      if (lightbox?.id === flagTarget.id) setLightbox(null);
      setFlagTarget(null);
      setFlagReason('');
    } catch { /* ignore */ } finally {
      setFlagging(false);
    }
  };

  if (visibleImages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📷</div>
        <p style={{ fontSize: '1rem' }}>אין תמונות עדיין עבור {makeNameHe} {modelNameHe}</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
        {visibleImages.length} תמונות של {makeNameHe} {modelNameHe}
      </p>

      {/* Masonry-style grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10,
      }}>
        {visibleImages.map((img) => (
          <div key={img.id} style={{ position: 'relative' }}>
            <button
              onClick={() => setLightbox(img)}
              style={{
                background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'block',
                width: '100%',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbnail_url ?? img.url}
                alt={img.title ?? `${makeNameHe} ${modelNameHe}`}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: img.width && img.height ? `${img.width}/${img.height}` : '4/3',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.85'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }}
              />
            </button>

            {/* Admin flag button — absolute top-right */}
            {isAdmin && (
              <button
                onClick={() => { setFlagTarget(img); setFlagReason(''); }}
                title="הסתר תמונה"
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6, width: 26, height: 26, padding: 0,
                  cursor: 'pointer', fontSize: '0.7rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >
                🚩
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Attribution */}
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
        התמונות מסופקות על ידי Wikimedia Commons תחת רישיונות Creative Commons.
      </p>

      {/* Flag confirmation modal */}
      {flagTarget && (
        <div
          onClick={() => setFlagTarget(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1001,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 24, maxWidth: 360, width: '100%',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flagTarget.thumbnail_url ?? flagTarget.url}
                alt=""
                style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>הסתר תמונה</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {flagTarget.title ?? flagTarget.url.split('/').pop()}
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                סיבה (אופציונלי)
              </label>
              <input
                autoFocus
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                placeholder="למשל: דגם שגוי, שנה שגויה, לא תמונת רכב..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'var(--bg-muted)',
                  color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                  direction: 'rtl', boxSizing: 'border-box',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleFlag(); if (e.key === 'Escape') setFlagTarget(null); }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={flagging}
                onClick={handleFlag}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
                  background: 'var(--brand-red)', color: '#fff', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.875rem',
                }}
              >
                {flagging ? 'מסתיר...' : 'הסתר תמונה'}
              </button>
              <button
                onClick={() => setFlagTarget(null)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem',
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 20,
            cursor: 'zoom-out',
          }}
        >
          {/* Admin flag inside lightbox */}
          {isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(null); setFlagTarget(lightbox); setFlagReason(''); }}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 600,
                backdropFilter: 'blur(4px)',
              }}
            >
              🚩 הסתר תמונה
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.title ?? `${makeNameHe} ${modelNameHe}`}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              borderRadius: 10,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              objectFit: 'contain',
            }}
            onClick={e => e.stopPropagation()}
          />
          {(lightbox.title || lightbox.author || lightbox.license) && (
            <div
              style={{ marginTop: 12, textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}
              onClick={e => e.stopPropagation()}
            >
              {lightbox.title && <span>{lightbox.title}</span>}
              {lightbox.author && <span> · {lightbox.author}</span>}
              {lightbox.license && <span> · {lightbox.license}</span>}
            </div>
          )}
          <button
            onClick={() => setLightbox(null)}
            style={{
              marginTop: 16, background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', borderRadius: 8,
              padding: '8px 20px', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            סגור
          </button>
        </div>
      )}
    </div>
  );
}

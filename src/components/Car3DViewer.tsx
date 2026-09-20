'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { useLocale } from '@/lib/localeContext';
import { supabase } from '@/lib/supabase';

interface Props {
  uid: string;
  modelName: string;
  author?: string;
  viewerUrl?: string;
  makeSlug?: string;
  modelSlug?: string;
  carImageUrl?: string;
  onHidden?: () => void;
}


export default function Car3DViewer({ uid, modelName, author, makeSlug, modelSlug, carImageUrl, onHidden }: Props) {
  const { isAdmin } = useAuth();
  const { t, dir } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null); // kept for potential future API use
  const [iframeReady, setIframeReady] = useState(false);
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [hidden, setHidden] = useState(false);

  const thumbnailUrl = `https://media.sketchfab.com/models/${uid}/thumbnails/result.jpg`;
  const previewImage = carImageUrl || thumbnailUrl;

  // Build embed URL with all UI suppressed
  const embedUrl = `https://sketchfab.com/models/${uid}/embed?autostart=1&preload=1&ui_infos=0&ui_watermark=0&ui_watermark_link=0&ui_hint=0&ui_stop=0&ui_inspector=0&ui_vr=0&ui_ar=0&ui_help=0&ui_settings=0&ui_annotations=0&ui_controls=0&ui_fadeout=0&dnt=1&transparent=0&camera=0`;


  const handleFlag = async () => {
    if (!makeSlug || !modelSlug) return;
    setFlagging(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      await fetch('/api/admin/flag-3d-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ makeSlug, modelSlug, reason: flagReason || null }),
      });
      setHidden(true);
      setShowFlagMenu(false);
      onHidden?.();
    } catch { /* ignore */ } finally {
      setFlagging(false);
    }
  };

  if (hidden) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 220, overflow: 'hidden', background: '#111' }}>
      {/* iframe loads in background; hidden until ready */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={`${modelName} 3D`}
        frameBorder={0}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        onLoad={() => setIframeReady(true)}
        style={{
          width: '100%', height: '100%', display: 'block',
          position: 'absolute', inset: 0,
          opacity: iframeReady ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: iframeReady ? 'auto' : 'none',
        }}
      />
      {/* Loading overlay shown while 3D model is being fetched */}
      {!iframeReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Car image background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt=""
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%)' }} />
          {/* Spinner + label */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: '#7ba0e8',
              animation: 'car3d-spin 0.9s linear infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🔷</span>
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.02em' }}>
              {modelName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {t.viewer3d.loading}
            </div>
            {author && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}>by {author}</div>}
          </div>
        </div>
      )}
      <style>{`@keyframes car3d-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Admin flag button — top-left */}
      {isAdmin && makeSlug && modelSlug && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 20 }}>
          {!showFlagMenu ? (
            <button
              onClick={() => setShowFlagMenu(true)}
              title={t.viewer3d.hideTitle}
              style={{
                background: 'rgba(0,0,0,0.65)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 7, padding: '4px 10px', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 600,
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              🚩 {t.viewer3d.hideModel}
            </button>
          ) : (
            <div
              style={{
                background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--border)', borderRadius: 10, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220,
              }}
              onClick={e => e.stopPropagation()}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{t.viewer3d.hideReasonLabel}</span>
              <input
                autoFocus
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                placeholder={t.viewer3d.hideReasonPlaceholder}
                onKeyDown={e => { if (e.key === 'Enter') handleFlag(); if (e.key === 'Escape') setShowFlagMenu(false); }}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '5px 8px', color: '#fff', fontSize: '0.78rem',
                  outline: 'none', direction: dir,
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={flagging}
                  onClick={handleFlag}
                  style={{
                    flex: 1, padding: '5px 10px', borderRadius: 6, border: 'none',
                    background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 700,
                  }}
                >
                  {flagging ? '...' : t.viewer3d.hideConfirm}
                </button>
                <button
                  onClick={() => { setShowFlagMenu(false); setFlagReason(''); }}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem',
                  }}
                >
                  {t.viewer3d.hideCancel}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

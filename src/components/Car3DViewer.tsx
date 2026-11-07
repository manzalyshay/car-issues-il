'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { claimActive, isBlockedOnDevice, onOtherActive, shouldAutoload3D, trackLive } from '@/lib/viewer3dGuard';
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


export default function Car3DViewer({ uid, modelName, makeSlug, modelSlug, carImageUrl, onHidden }: Props) {
  const { isAdmin } = useAuth();
  const { t, dir } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null); // kept for potential future API use
  const [iframeReady, setIframeReady] = useState(false);
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Defer mounting the Sketchfab iframe until the page has loaded and the viewer is near screen.
  // The preview image fills the slot meanwhile so the model still auto-starts but no longer
  // competes with first paint (improves mobile LCP).
  // Safety (see lib/viewer3dGuard): phones and low-memory devices load only on tap, a model
  // that crashed this device before is never loaded again here, and only one viewer per tab
  // is live at a time.
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewerId = useId();
  const [shouldMount, setShouldMount] = useState(false);
  const [mode, setMode] = useState<'pending' | 'auto' | 'tap' | 'blocked'>('pending');

  useEffect(() => {
    setMode(isBlockedOnDevice(uid) ? 'blocked' : shouldAutoload3D() ? 'auto' : 'tap');
    setShouldMount(false);
    setIframeReady(false);
  }, [uid]);

  // While the iframe is mounted: take the single live slot and keep the crash flag set.
  useEffect(() => {
    if (!shouldMount) return;
    claimActive(viewerId);
    const stopTracking = trackLive(uid);
    const stopListening = onOtherActive(viewerId, () => {
      setShouldMount(false);
      setIframeReady(false);
      setMode(m => (m === 'auto' ? 'tap' : m)); // never auto-reload after being unloaded
    });
    return () => { stopListening(); stopTracking(); };
  }, [shouldMount, uid, viewerId]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || shouldMount || mode !== 'auto') return;
    let visible = false;
    let loaded = document.readyState === 'complete';
    let cancelled = false;
    const tryMount = () => {
      if (cancelled || !visible || !loaded) return;
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(() => !cancelled && setShouldMount(true), { timeout: 1500 });
      else setTimeout(() => !cancelled && setShouldMount(true), 200);
    };
    const onLoad = () => { loaded = true; tryMount(); };
    if (!loaded) window.addEventListener('load', onLoad, { once: true });
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) { visible = true; io?.disconnect(); tryMount(); }
        }, { rootMargin: '300px' })
      : null;
    if (io) io.observe(el); else { visible = true; tryMount(); }
    return () => { cancelled = true; io?.disconnect(); window.removeEventListener('load', onLoad); };
  }, [shouldMount, mode]);

  // media.sketchfab.com's thumbnail endpoint returns 403 for these models - never use it.
  // The embed auto-loads itself (see shouldMount above); while it's loading, fall back to
  // the model's own gallery photo if we have one, otherwise show no preview image at all.
  const previewImage = carImageUrl || null;

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
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 220, overflow: 'hidden', background: '#111' }}>
      {/* iframe mounts after page load when on screen; hidden until ready */}
      {shouldMount && <iframe
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
      />}
      {/* Loading overlay shown while 3D model is being fetched */}
      {!iframeReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Car image background - only when we have the model's own gallery photo */}
          {previewImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewImage}
              alt=""
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
            />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%)' }} />
          {mode === 'tap' && !shouldMount ? (
            <button
              type="button"
              onClick={() => setShouldMount(true)}
              aria-label={`${t.viewer3d.ariaLoad} ${modelName}`}
              style={{
                position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 14,
                padding: '14px 20px', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🔷</span>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.viewer3d.clickToLoad}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{modelName}</span>
            </button>
          ) : mode === 'blocked' ? (
            <div style={{ position: 'relative', color: '#fff', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center', padding: '0 16px' }}>
              {t.viewer3d.unavailable}
            </div>
          ) : (
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
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes car3d-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Admin flag button - top-left */}
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

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

interface Props {
  uid: string;
  modelName: string;
  author?: string;
  viewerUrl?: string;
  makeSlug?: string;
  modelSlug?: string;
  onHidden?: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Sketchfab: new (iframe: HTMLIFrameElement) => any;
  }
}

const ZOOM_OUT_FACTOR = 0.4; // pull camera 1.1× further back from model center

export default function Car3DViewer({ uid, modelName, author, makeSlug, modelSlug, onHidden }: Props) {
  const { isAdmin } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
    const cores = navigator.hardwareConcurrency ?? 4;
    return mem >= 4 && cores >= 4;
  });
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [hidden, setHidden] = useState(false);

  const thumbnailUrl = `https://media.sketchfab.com/models/${uid}/thumbnails/result.jpg`;

  // Use Sketchfab Viewer API so we can pull the camera back on load
  useEffect(() => {
    if (!loaded || !iframeRef.current) return;

    let scriptEl: HTMLScriptElement | null = null;

    const initViewer = () => {
      if (!iframeRef.current || !window.Sketchfab) return;
      const client = new window.Sketchfab(iframeRef.current);
      client.init(uid, {
        success: (api: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          api.start();
          api.addEventListener('viewerready', () => {
            // Mobile: use Sketchfab's default camera position
            if (typeof window !== 'undefined' && window.innerWidth <= 640) return;
            api.getCameraLookAt((_err: unknown, camera: { position: number[]; target: number[] }) => {
              if (_err || !camera) return;
              const { position, target } = camera;
              const newPos = [
                target[0] + (position[0] - target[0]) * ZOOM_OUT_FACTOR,
                target[1] + (position[1] - target[1]) * ZOOM_OUT_FACTOR,
                target[2] + (position[2] - target[2]) * ZOOM_OUT_FACTOR,
              ];
              api.setCameraLookAt(newPos, target, 0.6);
            });
          });
        },
        error: () => { /* silently fall back to default view */ },
        autostart: 1,
        preload: 1,
        ui_hint: 0,
        ui_watermark: 0,
        ui_infos: 0,
        ui_stop: 0,
        ui_inspector: 0,
        ui_vr: 0,
        ui_ar: 0,
        ui_help: 0,
        ui_settings: 0,
        ui_annotations: 0,
        dnt: 1,
      });
    };

    if (window.Sketchfab) {
      initViewer();
    } else {
      scriptEl = document.createElement('script');
      scriptEl.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
      scriptEl.async = true;
      scriptEl.onload = initViewer;
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (scriptEl?.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
  }, [loaded, uid]);

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
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#111' }}>
      {loaded ? (
        // No src — Sketchfab API initialises the iframe and controls the camera
        <iframe
          ref={iframeRef}
          title={`${modelName} 3D`}
          frameBorder={0}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      ) : (
        <button
          onClick={() => setLoaded(true)}
          style={{
            width: '100%', height: '100%', border: 'none', cursor: 'pointer', padding: 0,
            background: 'none', display: 'block', position: 'relative',
          }}
          aria-label={`טען מודל תלת-ממד של ${modelName}`}
        >
          {/* Thumbnail background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt=""
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)' }} />
          {/* Play button */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              🔷
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>{modelName}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>לחץ לטעינת מודל תלת-ממד</div>
            {author && <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem' }}>by {author}</div>}
          </div>
        </button>
      )}

      {/* Admin flag button — top-left */}
      {isAdmin && makeSlug && modelSlug && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 20 }}>
          {!showFlagMenu ? (
            <button
              onClick={() => setShowFlagMenu(true)}
              title="הסתר מודל תלת-ממד זה"
              style={{
                background: 'rgba(0,0,0,0.65)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 7, padding: '4px 10px', cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 600,
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              🚩 הסתר מודל
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
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>סיבת הסרה (אופציונלי)</span>
              <input
                autoFocus
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
                placeholder="למשל: רכב שגוי, מודל לא מתאים..."
                onKeyDown={e => { if (e.key === 'Enter') handleFlag(); if (e.key === 'Escape') setShowFlagMenu(false); }}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '5px 8px', color: '#fff', fontSize: '0.78rem',
                  outline: 'none', direction: 'rtl',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={flagging}
                  onClick={handleFlag}
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
    </div>
  );
}

'use client';

import { useState } from 'react';

interface Props {
  uid: string;
  modelName: string;
  author?: string;
  viewerUrl?: string;
}

export default function Car3DViewer({ uid, modelName, author }: Props) {
  const [loaded, setLoaded] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4; // unknown → assume capable
    const cores = navigator.hardwareConcurrency ?? 4;
    return mem >= 4 && cores >= 4;
  });

  const embedUrl = [
    `https://sketchfab.com/models/${uid}/embed`,
    'autostart=1',
    'preload=1',
    'ui_hint=0',
    'ui_watermark=0',
    'ui_infos=0',
    'ui_stop=0',
    'ui_inspector=0',
    'ui_vr=0',
    'ui_ar=0',
    'ui_help=0',
    'ui_settings=0',
    'ui_annotations=0',
    'dnt=1',
  ].join('&').replace('embed&', 'embed?');

  const thumbnailUrl = `https://media.sketchfab.com/models/${uid}/thumbnails/result.jpg`;

  return (
    <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#111' }}>
      {loaded ? (
        <iframe
          title={`${modelName} 3D`}
          src={embedUrl}
          frameBorder={0}
          allow="autoplay; fullscreen; xr-spatial-tracking"
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
    </div>
  );
}

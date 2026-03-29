'use client';

import { useState } from 'react';

interface Props {
  uid: string;
  modelName: string;
  author?: string;
  viewerUrl?: string;
}

export default function Car3DViewer({ uid, modelName, author, viewerUrl }: Props) {
  const [loaded, setLoaded] = useState(false);

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
        <div
          style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'linear-gradient(135deg, #1a1a2e, #2d1b2e)',
            cursor: 'pointer',
          }}
          onClick={() => setLoaded(true)}
        >
          <div style={{ fontSize: 48 }}>🚗</div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem' }}>{modelName}</div>
          <button
            style={{
              background: 'linear-gradient(135deg, #e63946, #e76f51)',
              color: 'white', border: 'none', borderRadius: 9999,
              padding: '10px 24px', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            טען מודל 3D
          </button>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>לחץ להצגת המודל התלת-ממדי</div>
        </div>
      )}
    </div>
  );
}

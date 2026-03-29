'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  uid: string;
  modelName: string;
  author?: string;
  viewerUrl?: string;
}

export default function Car3DViewer({ uid, modelName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState('');

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc(embedUrl);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }, // start loading 200px before it enters viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [embedUrl]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#111' }}
    >
      {src && (
        <iframe
          title={`${modelName} 3D`}
          src={src}
          frameBorder={0}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}
    </div>
  );
}

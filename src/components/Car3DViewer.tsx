'use client';

interface Props {
  uid: string;
  modelName: string;
  author?: string;
  viewerUrl?: string;
}

export default function Car3DViewer({ uid, modelName, author, viewerUrl }: Props) {
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
      <iframe
        title={`${modelName} 3D`}
        src={embedUrl}
        frameBorder={0}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        loading="lazy"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}

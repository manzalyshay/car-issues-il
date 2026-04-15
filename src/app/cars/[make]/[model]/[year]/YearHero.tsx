'use client';

import { useState, useEffect } from 'react';

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
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=images`)
      .then(r => r.json())
      .then((imgs: { url: string; thumbnail_url: string | null }[]) => {
        if (imgs?.[0]) setImgUrl(imgs[0].thumbnail_url ?? imgs[0].url);
      })
      .catch(() => {});
  }, [makeSlug, modelSlug]);

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
          src={imgUrl}
          alt={`${makeNameHe} ${modelNameHe}`}
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
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

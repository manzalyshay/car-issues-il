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
    fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=images&year=${year}`)
      .then(r => r.json())
      .then((imgs: { url: string; thumbnail_url: string | null }[]) => {
        if (imgs?.[0]) setImgUrl(imgs[0].thumbnail_url ?? imgs[0].url);
      })
      .catch(() => {});
  }, [makeSlug, modelSlug, year]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 36,
      background: 'var(--bg-muted)',
      aspectRatio: '21/9',
      minHeight: 220,
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
          alt={`${makeNameHe} ${modelNameHe} ${year}`}
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: imgUrl && loaded
          ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, transparent 75%)'
          : 'transparent',
        transition: 'background 0.6s ease',
      }} />

      {/* Red accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3,
        background: 'linear-gradient(90deg, var(--brand-red), transparent)',
      }} />

      {/* Text overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, right: 0, left: 0,
        padding: '28px 28px 24px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.1,
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            opacity: loaded || !imgUrl ? 1 : 0,
            transition: 'opacity 0.6s ease 0.2s',
          }}>
            {makeNameHe} {modelNameHe}
          </div>
          <div style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.55)',
            marginTop: 3,
            opacity: loaded || !imgUrl ? 1 : 0,
            transition: 'opacity 0.6s ease 0.3s',
          }}>
            {makeNameEn} {modelNameEn}
          </div>
        </div>

        {/* Year badge */}
        <div style={{
          background: 'var(--brand-red)',
          color: '#fff',
          fontWeight: 900,
          fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
          lineHeight: 1,
          padding: '8px 18px',
          borderRadius: 10,
          letterSpacing: '0.02em',
          boxShadow: '0 4px 20px rgba(230,57,70,0.5)',
          opacity: loaded || !imgUrl ? 1 : 0,
          transition: 'opacity 0.6s ease 0.4s',
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

'use client';

import { useState } from 'react';
import type { CarImage } from '@/lib/carImages';

interface Props {
  images: CarImage[];
  makeNameHe: string;
  modelNameHe: string;
}

export default function CarImagesTab({ images, makeNameHe, modelNameHe }: Props) {
  const [lightbox, setLightbox] = useState<CarImage | null>(null);

  if (images.length === 0) {
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
        {images.length} תמונות של {makeNameHe} {modelNameHe}
      </p>

      {/* Masonry-style grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10,
      }}>
        {images.map((img) => (
          <button
            key={img.id}
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
        ))}
      </div>

      {/* Attribution */}
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
        התמונות מסופקות על ידי Wikimedia Commons תחת רישיונות Creative Commons.
      </p>

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

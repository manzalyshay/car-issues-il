'use client';

import { useState } from 'react';
import Car3DViewer from './Car3DViewer';
import type { SketchfabModel } from '@/lib/sketchfab';
import type { CarImage } from '@/lib/carImages';

interface Props {
  sketchfabModel: SketchfabModel | null;
  carImages: CarImage[];
  makeSlug: string;
  modelSlug: string;
  makeNameEn: string;
  modelNameEn: string;
}

export default function GalleryViewer({ sketchfabModel, carImages, makeSlug, modelSlug, makeNameEn, modelNameEn }: Props) {
  const hasFab = sketchfabModel !== null;
  const hasImages = carImages.length > 0;

  // active: 'fab' | image index (0-based)
  // 3D model is default when available, otherwise fall back to first image
  const [active, setActive] = useState<'fab' | number>(hasFab ? 'fab' : 0);

  const altText = `${makeNameEn} ${modelNameEn}`;

  // Build thumbnail items: 3D first (if exists), then images
  type ThumbItem = { kind: 'fab' } | { kind: 'img'; img: CarImage; idx: number };
  const thumbs: ThumbItem[] = [];
  if (hasFab) thumbs.push({ kind: 'fab' });
  carImages.slice(0, hasFab ? 4 : 5).forEach((img, idx) => thumbs.push({ kind: 'img', img, idx }));

  const showThumbs = thumbs.length > 1;

  return (
    <div>
      {/* Main slot */}
      <div className="gallery-main">
        {active === 'fab' && hasFab ? (
          <Car3DViewer uid={sketchfabModel!.uid} modelName={altText} makeSlug={makeSlug} modelSlug={modelSlug} />
        ) : active !== 'fab' && hasImages ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carImages[active as number].thumbnail_url ?? carImages[active as number].url}
            alt={altText}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          /* Fallback SVG placeholder */
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #dde6f1, #b9c7da)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg viewBox="0 0 120 60" fill="none" style={{ width: '52%', color: 'rgba(255,255,255,.75)' }}>
              <path d="M8 42 L18 26 C20 22 24 20 29 20 L74 20 C80 20 85 22 90 27 L102 39" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 42 L112 42 C114 42 115 41 115 39 L114 35 C113.5 33 112 32 110 32 L98 32" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M30 20 L36 32 L70 32 L72 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
              <circle cx="34" cy="44" r="9" stroke="currentColor" strokeWidth="3"/>
              <circle cx="86" cy="44" r="9" stroke="currentColor" strokeWidth="3"/>
            </svg>
            <span style={{ position: 'absolute', bottom: 10, insetInlineStart: 12, fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', background: 'rgba(20,32,46,.28)', padding: '3px 9px', borderRadius: 999, backdropFilter: 'blur(3px)' }}>
              {makeNameEn} {modelNameEn}
            </span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {showThumbs && (
        <div className="gallery-thumbs">
          {thumbs.map((item) => {
            const isActive = item.kind === 'fab' ? active === 'fab' : active === item.idx;
            if (item.kind === 'fab') {
              return (
                <button
                  key="fab"
                  onClick={() => setActive('fab')}
                  className={`gallery-thumb${isActive ? ' active' : ''}`}
                  style={{ background: '#0f172a', border: 'none', cursor: 'pointer', padding: 0, position: 'relative' }}
                  title="3D Model"
                >
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" style={{ width: 20, height: 20, opacity: 0.9 }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round"/>
                      <path d="M2 17l10 5 10-5" strokeLinejoin="round"/>
                      <path d="M2 12l10 5 10-5" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.05em' }}>3D</span>
                  </div>
                </button>
              );
            }
            return (
              <button
                key={item.img.id}
                onClick={() => setActive(item.idx)}
                className={`gallery-thumb${isActive ? ' active' : ''}`}
                style={{ background: '#dde6f1', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.img.thumbnail_url ?? item.img.url}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

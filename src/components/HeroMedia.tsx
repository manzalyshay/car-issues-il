'use client';

import { useState, useEffect } from 'react';
import Car3DViewer from './Car3DViewer';
import type { CarImage } from '@/lib/carImages';
import type { SketchfabModel } from '@/lib/sketchfab';
import { useLocale } from '@/lib/localeContext';
import { sizedImageUrl } from '@/lib/imageSizing';

const MAIN_WIDTH = 960;
const THUMB_WIDTH = 160;

interface Props {
  images: CarImage[];
  sketchfabModel: SketchfabModel | null;
  makeSlug: string;
  modelSlug: string;
  makeNameEn: string;
  modelNameEn: string;
  yearRange: string;
  categoryLabel: string;
}

export default function HeroMedia({
  images, sketchfabModel, makeSlug, modelSlug, makeNameEn, modelNameEn, yearRange, categoryLabel,
}: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const hasFab = sketchfabModel !== null;
  // active: 'fab' | image index
  const [active, setActive] = useState<'fab' | number>(hasFab ? 'fab' : 0);

  const altText = `${makeNameEn} ${modelNameEn}`;
  const fabLabel = (!isEn && sketchfabModel?.nameHe) ? sketchfabModel.nameHe : sketchfabModel?.name;

  // Badge label: for 3D show the sketchfab name (contains trim+year), for images show yearRange·category
  const badgeLabel = active === 'fab' && hasFab
    ? fabLabel
    : `${yearRange} · ${categoryLabel}`;

  // Thumbnail list: 3D first, then images
  type ThumbItem = { kind: 'fab' } | { kind: 'img'; img: CarImage; idx: number };
  const thumbs: ThumbItem[] = [];
  if (hasFab) thumbs.push({ kind: 'fab' });
  images.slice(0, hasFab ? 4 : 5).forEach((img, idx) => thumbs.push({ kind: 'img', img, idx }));
  const showThumbs = thumbs.length > 1;

  // Full-size original - only used for the deliberate "open full size" click,
  // never for the inline <img> itself (that uses a sized derivative below).
  const activeImageUrl = active !== 'fab' && images[active as number]
    ? (images[active as number].url)
    : null;
  const activeImageSrc = active !== 'fab' && images[active as number]
    ? sizedImageUrl(images[active as number].thumbnail_url ?? images[active as number].url, MAIN_WIDTH)
    : null;

  // Click loader: the visible image only swaps once the new one has actually
  // finished loading (preloaded invisibly first), so a strip click or a
  // photo-changing year switch never shows a blank/flashing frame and a failed
  // load silently keeps whatever was shown before instead of breaking it.
  const [displaySrc, setDisplaySrc] = useState<string | null>(activeImageSrc);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  useEffect(() => {
    if (activeImageSrc && activeImageSrc !== displaySrc && activeImageSrc !== pendingSrc) {
      setPendingSrc(activeImageSrc);
    } else if (!activeImageSrc) {
      // Switched to the 3D slot (or no image available) - nothing to preload.
      setDisplaySrc(null);
      setPendingSrc(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageSrc]);

  return (
    <div style={{ display: 'grid', gap: 6, justifySelf: 'end', width: '100%', maxWidth: 380 }}>
      {/* Main slot */}
      <div
        style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', background: '#1a3055', boxShadow: '0 20px 46px -28px rgba(0,0,0,.9)', cursor: activeImageUrl ? 'zoom-in' : 'default' }}
        onClick={() => { if (activeImageUrl) window.open(activeImageUrl, '_blank'); }}
      >
        {active === 'fab' && hasFab ? (
          <Car3DViewer uid={sketchfabModel!.uid} modelName={altText} makeSlug={makeSlug} modelSlug={modelSlug} />
        ) : displaySrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displaySrc}
            alt={altText}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : !pendingSrc ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 12, color: '#7ba0e8', letterSpacing: '.1em', fontWeight: 600 }}>{altText}</span>
          </div>
        ) : null}

        {/* Hidden preloader for the next photo - swaps displaySrc in only once
            fully loaded; on error it's simply dropped and the old photo stays. */}
        {pendingSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={pendingSrc}
            src={pendingSrc}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, pointerEvents: 'none' }}
            onLoad={() => { setDisplaySrc(pendingSrc); setPendingSrc(null); }}
            onError={() => setPendingSrc(null)}
          />
        )}

        {/* Click loader - centered, no layout shift, same spinner style as the 3D viewer's */}
        {pendingSrc && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: displaySrc ? 'rgba(10,20,36,0.35)' : 'transparent' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#7ba0e8',
              animation: 'hero-img-spin 0.9s linear infinite',
            }} />
          </div>
        )}
        <style>{`@keyframes hero-img-spin { to { transform: rotate(360deg); } }`}</style>

        {/* Year/trim/category badge - bottom left */}
        <div style={{
          position: 'absolute', bottom: 8, insetInlineStart: 8,
          background: 'rgba(10,20,36,0.72)', backdropFilter: 'blur(6px)',
          color: '#c8d8f0', fontSize: 10.5, fontWeight: 700,
          padding: '3px 8px', borderRadius: 99,
          letterSpacing: '.02em', maxWidth: '90%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {badgeLabel}
        </div>
      </div>

      {/* Photo credit - only for the active image slot, not the 3D viewer */}
      {active !== 'fab' && images[active as number]?.source_url && (
        <a
          href={images[active as number].source_url!}
          target="_blank"
          rel="noopener nofollow"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 10.5, color: 'var(--text-faint)', textDecoration: 'none', justifySelf: 'end' }}
        >
          Photo: Wikimedia Commons
        </a>
      )}

      {/* 3D credit - only for the active 3D slot */}
      {active === 'fab' && hasFab && (
        <a
          href={sketchfabModel!.viewerUrl}
          target="_blank"
          rel="noopener nofollow"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 10.5, color: 'var(--text-faint)', textDecoration: 'none', justifySelf: 'end' }}
        >
          {isEn
            ? `3D: Sketchfab · ${sketchfabModel!.author} · ${sketchfabModel!.license}`
            : `תלת-ממד: Sketchfab · ${sketchfabModel!.author} · ${sketchfabModel!.license}`}
        </a>
      )}

      {/* Thumbnail strip */}
      {showThumbs && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(thumbs.length, 5)},1fr)`, gap: 5 }}>
          {thumbs.map((item) => {
            const isActive = item.kind === 'fab' ? active === 'fab' : active === item.idx;
            if (item.kind === 'fab') {
              return (
                <button
                  key="fab"
                  onClick={() => setActive('fab')}
                  title={fabLabel ?? '3D Model'}
                  style={{
                    aspectRatio: '4/3', borderRadius: 8, background: '#0f172a', border: 'none',
                    cursor: 'pointer', padding: 0, overflow: 'hidden',
                    outline: isActive ? '2px solid #7ba0e8' : 'none',
                    opacity: isActive ? 1 : 0.72,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" style={{ width: 16, height: 16, opacity: 0.9 }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round"/>
                    <path d="M2 17l10 5 10-5" strokeLinejoin="round"/>
                    <path d="M2 12l10 5 10-5" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>3D</span>
                </button>
              );
            }
            return (
              <button
                key={item.img.id}
                onClick={() => setActive(item.idx)}
                style={{
                  aspectRatio: '4/3', borderRadius: 8, background: '#24406b', border: 'none',
                  cursor: 'pointer', padding: 0, overflow: 'hidden',
                  outline: isActive ? '2px solid #7ba0e8' : 'none',
                  opacity: isActive ? 1 : 0.72,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sizedImageUrl(item.img.thumbnail_url ?? item.img.url, THUMB_WIDTH) ?? undefined}
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

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

  // Thumbnail list: 3D first, then images, then a "+N" tile when more photos exist
  type ThumbItem = { kind: 'fab' } | { kind: 'img'; img: CarImage; idx: number } | { kind: 'more'; count: number };
  const MAX_TILES = 5;
  const thumbs: ThumbItem[] = [];
  if (hasFab) thumbs.push({ kind: 'fab' });
  let imgSlots = MAX_TILES - thumbs.length;
  if (images.length > imgSlots) imgSlots -= 1;
  images.slice(0, imgSlots).forEach((img, idx) => thumbs.push({ kind: 'img', img, idx }));
  if (images.length > imgSlots) thumbs.push({ kind: 'more', count: images.length - imgSlots });
  const showThumbs = thumbs.length > 1;
  const openImagesTab = () => window.dispatchEvent(new CustomEvent('car-open-tab', { detail: 'images' }));

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
    <div style={{ display: 'grid', gap: 10, width: '100%', minWidth: 0 }}>
      {/* Main slot */}
      <div
        style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden', background: '#1a3055', boxShadow: '0 20px 46px -28px rgba(0,0,0,.9)', cursor: activeImageUrl ? 'zoom-in' : 'default' }}
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

        {/* 3D hint - top corner, only while the 3D viewer is shown */}
        {active === 'fab' && hasFab && (
          <div style={{
            position: 'absolute', top: 12, insetInlineStart: 12,
            background: '#0f1d3d', color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '4px 10px', borderRadius: 999, pointerEvents: 'none',
          }}>
            {isEn ? '3D · drag to rotate' : 'תלת-ממד · גררו לסיבוב'}
          </div>
        )}

        {/* Year/trim/category badge - bottom end corner */}
        <div dir="ltr" style={{
          position: 'absolute', bottom: 12, ...(isEn ? { right: 12 } : { left: 12 }),
          background: 'rgba(15,29,61,0.85)',
          color: '#fff', fontSize: 13, fontWeight: 500,
          padding: '5px 12px', borderRadius: 999,
          maxWidth: '75%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {badgeLabel}
        </div>
      </div>

      {/* Thumbnail strip */}
      {showThumbs && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thumbs.length},minmax(0,1fr))`, gap: 8 }}>
          {thumbs.map((item) => {
            const tile: React.CSSProperties = {
              aspectRatio: '4/3', borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden',
              fontFamily: 'inherit', boxSizing: 'border-box',
            };
            if (item.kind === 'fab') {
              const isActive = active === 'fab';
              return (
                <button
                  key="fab"
                  onClick={() => setActive('fab')}
                  aria-label={isEn ? '3D model' : 'מודל תלת-ממד'}
                  aria-pressed={isActive}
                  style={{
                    ...tile, background: '#182a54', color: '#fff',
                    border: `2px solid ${isActive ? '#2f62e0' : 'transparent'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ width: 18, height: 18 }} aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  3D
                </button>
              );
            }
            if (item.kind === 'more') {
              return (
                <button
                  key="more"
                  onClick={openImagesTab}
                  aria-label={isEn ? `${item.count} more photos` : `עוד ${item.count} תמונות`}
                  style={{ ...tile, background: '#3b475f', color: '#fff', fontSize: 15, fontWeight: 700 }}
                >
                  <span dir="ltr">+{item.count}</span>
                </button>
              );
            }
            const isActive = active === item.idx;
            return (
              <button
                key={item.img.id}
                onClick={() => setActive(item.idx)}
                aria-label={isEn ? `Photo ${item.idx + 1}` : `תמונה ${item.idx + 1}`}
                aria-pressed={isActive}
                style={{ ...tile, background: '#34446b', border: `2px solid ${isActive ? '#2f62e0' : 'transparent'}` }}
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

      {/* Photo credit - only for the active image slot, not the 3D viewer */}
      {active !== 'fab' && images[active as number]?.source_url && (
        <a
          href={images[active as number].source_url!}
          target="_blank"
          rel="noopener nofollow"
          onClick={(e) => e.stopPropagation()}
          className="hero-media-credit" style={{ fontSize: 12, textDecoration: 'none', justifySelf: 'start' }}
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
          className="hero-media-credit" style={{ fontSize: 12, textDecoration: 'none', justifySelf: 'start' }}
        >
          {isEn
            ? `3D: Sketchfab · ${sketchfabModel!.author} · ${sketchfabModel!.license}`
            : `תלת-ממד: Sketchfab · ${sketchfabModel!.author} · ${sketchfabModel!.license}`}
        </a>
      )}

    </div>
  );
}

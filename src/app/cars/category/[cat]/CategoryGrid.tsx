'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import MakeLogo from '@/components/MakeLogo';
import StarRating from '@/components/StarRating';

export interface GridModel {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  makeNameEn: string;
  modelNameHe: string;
  modelNameEn: string;
  logoUrl: string;
  imageUrl: string | null;
  sketchfab: { uid: string; name: string; author: string } | null;
  expertScore: number | null;
  avgRating: number | null;
  reviewCount: number;
}

interface Props {
  models: GridModel[];
  isEn: boolean;
}

const PAGE = 10;

function scoreTier(s: number) { return s >= 8.5 ? 'hi' : s >= 7.5 ? 'mid' : 'lo'; }

function ModelRow({ m, idx, isEn }: { m: GridModel; idx: number; isEn: boolean }) {
  const [show3d, setShow3d] = useState(false);
  const name = isEn ? `${m.makeNameEn} ${m.modelNameEn}` : `${m.makeNameHe} ${m.modelNameHe}`;
  const score = m.expertScore != null ? Math.round(m.expertScore * 10) / 10 : null;
  const tier = score != null ? scoreTier(score) : null;
  const thumbUrl = m.imageUrl
    ?? (m.sketchfab ? `https://media.sketchfab.com/models/${m.sketchfab.uid}/thumbnails/result.jpg` : null);
  const embedUrl = m.sketchfab
    ? `https://sketchfab.com/models/${m.sketchfab.uid}/embed?autostart=1&preload=1&ui_infos=0&ui_watermark=0&ui_watermark_link=0&ui_hint=0&ui_stop=0&ui_inspector=0&ui_vr=0&ui_ar=0&ui_help=0&ui_settings=0&ui_annotations=0&ui_controls=0&ui_fadeout=0&dnt=1&transparent=0&camera=0`
    : null;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }} className="cat-row">
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>

        {/* Rank number */}
        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-muted)', width: 28, textAlign: 'center', flexShrink: 0 }}>
          {idx + 1}
        </div>

        {/* Thumbnail */}
        <div style={{ width: 72, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-muted)' }}>
          {thumbUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumbUrl}
              alt={name}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MakeLogo logoUrl={m.logoUrl} nameEn={m.makeNameEn} size={28} />
            </div>
          )}
        </div>

        {/* Info */}
        <Link href={`/cars/${m.makeSlug}/${m.modelSlug}`} style={{ flex: 1, textDecoration: 'none', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MakeLogo logoUrl={m.logoUrl} nameEn={m.makeNameEn} size={16} />
            <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text)' }}>{name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {m.avgRating != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <StarRating rating={m.avgRating * 2} size={11} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600 }}>{m.avgRating.toFixed(1)}</span>
              </div>
            )}
            {m.reviewCount > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>
                {m.reviewCount} {isEn ? 'reviews' : 'ביקורות'}
              </span>
            )}
          </div>
        </Link>

        {/* Right side: score + 3D button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {score != null && tier != null && (
            <span className={`score-badge sm score-tier-${tier}`}>
              <span className="n">{score.toFixed(1)}</span>
              <span className="of">{isEn ? '/10' : '/10'}</span>
            </span>
          )}
          {m.sketchfab && (
            <button
              onClick={() => setShow3d(v => !v)}
              style={{
                height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: show3d ? 'var(--accent)' : 'var(--surface-2)',
                color: show3d ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              🔷 3D
            </button>
          )}
        </div>
      </div>

      {/* Sketchfab viewer — shown on demand */}
      {show3d && embedUrl && (
        <div style={{ width: '100%', aspectRatio: '16/9', background: '#111' }}>
          <iframe
            src={embedUrl}
            title={`${name} 3D`}
            frameBorder={0}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
}

export default function CategoryGrid({ models, isEn }: Props) {
  const [shown, setShown] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setShown(s => Math.min(s + PAGE, models.length));
  }, [models.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, shown]);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {models.slice(0, shown).map((m, idx) => (
          <ModelRow key={`${m.makeSlug}/${m.modelSlug}`} m={m} idx={idx} isEn={isEn} />
        ))}
      </div>

      {shown < models.length && (
        <div ref={sentinelRef} style={{ height: 1, marginTop: 40 }} />
      )}

      <style>{`.cat-row { transition: box-shadow 0.18s, border-color 0.18s; } .cat-row:hover { box-shadow: var(--shadow) !important; border-color: var(--border-strong) !important; }`}</style>
    </div>
  );
}

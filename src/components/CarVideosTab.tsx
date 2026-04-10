'use client';

import { useState } from 'react';
import type { CarVideo } from '@/lib/youtubeVideos';

interface Props {
  initialVideos: CarVideo[];
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
}

export default function CarVideosTab({ initialVideos, makeSlug, modelSlug, makeNameHe, modelNameHe }: Props) {
  const [videos] = useState<CarVideo[]>(initialVideos);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  if (videos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎬</div>
        <p style={{ fontSize: '1rem' }}>אין סרטוני ביקורת עדיין עבור {makeNameHe} {modelNameHe}</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
        {videos.length} סרטוני ביקורת עבור {makeNameHe} {modelNameHe}
      </p>

      {/* Active embed */}
      {activeVideo && (
        <div style={{ marginBottom: 28, borderRadius: 12, overflow: 'hidden', background: '#000', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {videos.map((v) => (
          <button
            key={v.youtube_id}
            onClick={() => setActiveVideo(v.youtube_id === activeVideo ? null : v.youtube_id)}
            style={{
              background: 'var(--bg-card)',
              border: v.youtube_id === activeVideo ? '2px solid var(--brand-red)' : '1px solid var(--border)',
              borderRadius: 10,
              padding: 0,
              cursor: 'pointer',
              textAlign: 'right',
              overflow: 'hidden',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {/* Thumbnail */}
            <div style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumbnail_url}
                alt={v.title}
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
              />
              {/* Play overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: v.youtube_id === activeVideo ? 'rgba(220,39,39,0.3)' : 'rgba(0,0,0,0.2)',
                transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: v.youtube_id === activeVideo ? 'var(--brand-red)' : 'rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                  <span style={{ fontSize: '1.1rem', color: v.youtube_id === activeVideo ? '#fff' : '#111', marginRight: -2 }}>▶</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{
                fontSize: '0.875rem', fontWeight: 700,
                color: 'var(--text-primary)', lineHeight: 1.35,
                marginBottom: 6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {v.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {v.channel} · {new Date(v.published_at).getFullYear()}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* YouTube attribution */}
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 20, textAlign: 'center' }}>
        הסרטונים מסופקים על ידי YouTube. לצפייה ישירה:{' '}
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${makeSlug} ${modelSlug} review`)}`}
          target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--brand-red)' }}
        >
          חיפוש ב-YouTube
        </a>
      </p>
    </div>
  );
}

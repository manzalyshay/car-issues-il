'use client';

import { useState } from 'react';
import type { CarVideo } from '@/lib/youtubeVideos';
import CarVideosTab from '@/components/CarVideosTab';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  videos: CarVideo[];
  children: React.ReactNode; // reviews + recalls content
}

export default function CarPageTabs({ makeSlug, modelSlug, makeNameHe, modelNameHe, videos, children }: Props) {
  const [tab, setTab] = useState<'reviews' | 'videos'>('reviews');

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: active ? '2px solid var(--brand-red)' : '2px solid transparent',
    background: 'none',
    color: active ? 'var(--brand-red)' : 'var(--text-muted)',
    fontWeight: active ? 700 : 500,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
  });

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        marginBottom: 28,
        overflowX: 'auto',
      }}>
        <button style={tabStyle(tab === 'reviews')} onClick={() => setTab('reviews')}>
          ⭐ ביקורות
        </button>
        <button style={tabStyle(tab === 'videos')} onClick={() => setTab('videos')}>
          🎬 סרטוני ביקורת
          {videos.length > 0 && (
            <span style={{
              background: tab === 'videos' ? 'var(--brand-red)' : 'var(--bg-muted)',
              color: tab === 'videos' ? '#fff' : 'var(--text-muted)',
              borderRadius: 10, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
            }}>
              {videos.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'reviews' && children}
      {tab === 'videos' && (
        <CarVideosTab
          initialVideos={videos}
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          makeNameHe={makeNameHe}
          modelNameHe={modelNameHe}
        />
      )}
    </div>
  );
}

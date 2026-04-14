'use client';

import { useState } from 'react';
import type { CarVideo } from '@/lib/youtubeVideos';
import type { CarImage } from '@/lib/carImages';
import CarVideosTab from '@/components/CarVideosTab';
import CarImagesTab from '@/components/CarImagesTab';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  children: React.ReactNode;
}

export default function CarPageTabs({ makeSlug, modelSlug, makeNameHe, modelNameHe, children }: Props) {
  const [tab, setTab] = useState<'reviews' | 'videos' | 'images'>('reviews');
  const [videos, setVideos] = useState<CarVideo[] | null>(null);
  const [images, setImages] = useState<CarImage[] | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  const handleTabClick = async (next: 'reviews' | 'videos' | 'images') => {
    setTab(next);
    if (next === 'videos' && videos === null && !videosLoading) {
      setVideosLoading(true);
      try {
        const res = await fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=videos`);
        setVideos(await res.json());
      } catch { setVideos([]); }
      finally { setVideosLoading(false); }
    }
    if (next === 'images' && images === null && !imagesLoading) {
      setImagesLoading(true);
      try {
        const res = await fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=images`);
        setImages(await res.json());
      } catch { setImages([]); }
      finally { setImagesLoading(false); }
    }
  };

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

  const loadingPlaceholder = (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      טוען...
    </div>
  );

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
        <button style={tabStyle(tab === 'reviews')} onClick={() => handleTabClick('reviews')}>
          ⭐ ביקורות
        </button>
        <button style={tabStyle(tab === 'videos')} onClick={() => handleTabClick('videos')}>
          🎬 סרטוני ביקורת
          {videos && videos.length > 0 && (
            <span style={{
              background: tab === 'videos' ? 'var(--brand-red)' : 'var(--bg-muted)',
              color: tab === 'videos' ? '#fff' : 'var(--text-muted)',
              borderRadius: 10, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
            }}>
              {videos.length}
            </span>
          )}
        </button>
        <button style={tabStyle(tab === 'images')} onClick={() => handleTabClick('images')}>
          📷 תמונות
          {images && images.length > 0 && (
            <span style={{
              background: tab === 'images' ? 'var(--brand-red)' : 'var(--bg-muted)',
              color: tab === 'images' ? '#fff' : 'var(--text-muted)',
              borderRadius: 10, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700,
            }}>
              {images.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {tab === 'reviews' && children}
      {tab === 'videos' && (
        videosLoading ? loadingPlaceholder :
        <CarVideosTab
          initialVideos={videos ?? []}
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          makeNameHe={makeNameHe}
          modelNameHe={modelNameHe}
        />
      )}
      {tab === 'images' && (
        imagesLoading ? loadingPlaceholder :
        <CarImagesTab
          images={images ?? []}
          makeNameHe={makeNameHe}
          modelNameHe={modelNameHe}
        />
      )}
    </div>
  );
}

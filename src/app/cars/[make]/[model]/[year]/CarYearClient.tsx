'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import CarVideosTab from '@/components/CarVideosTab';
import CarImagesTab from '@/components/CarImagesTab';
import type { Review } from '@/data/reviews';
import type { CarVideo } from '@/lib/youtubeVideos';
import type { CarImage } from '@/lib/carImages';

interface Props {
  makeSlug: string;
  modelSlug: string;
  year: number;
  initialReviews: Review[];
  isYearSpecific: boolean;
  makeNameHe: string;
  modelNameHe: string;
}

type Tab = 'reviews' | 'videos' | 'images';

export default function CarYearClient({ makeSlug, modelSlug, year, initialReviews, isYearSpecific, makeNameHe, modelNameHe }: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('reviews');

  const [videos, setVideos] = useState<CarVideo[] | null>(null);
  const [images, setImages] = useState<CarImage[] | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);

  // Generate year-specific AI summary on first visit if not yet available
  useEffect(() => {
    if (isYearSpecific) return;
    let cancelled = false;
    setGeneratingSummary(true);
    fetch('/api/generate-year-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makeSlug, modelSlug, year: String(year) }),
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.generated) router.refresh();
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGeneratingSummary(false); });
    return () => { cancelled = true; };
  }, [isYearSpecific, makeSlug, modelSlug, year, router]);

  const handleTabClick = async (next: Tab) => {
    setActiveTab(next);
    if (next === 'videos' && videos === null && !videosLoading) {
      setVideosLoading(true);
      try {
        const res = await fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=videos`);
        const all: CarVideo[] = await res.json();
        // Sort: year-relevant first
        const yearStr = String(year);
        setVideos([
          ...all.filter(v => v.title.includes(yearStr)),
          ...all.filter(v => !v.title.includes(yearStr)),
        ]);
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

  const filtered = search.trim()
    ? reviews.filter((r) => {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q);
      })
    : reviews;

  const handleNewReview = (review: Review) => {
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHelpful = (id: string, delta: number) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpful: Math.max(0, (r.helpful || 0) + delta) } : r)),
    );
  };

  const tabStyle = (tab: Tab) => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--brand-red)' : '2px solid transparent',
    background: 'none',
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
    fontWeight: activeTab === tab ? 700 : 400,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    transition: 'color 0.15s',
  } as React.CSSProperties);

  const loadingPlaceholder = (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      טוען...
    </div>
  );

  return (
    <div>
      {/* Generating summary indicator */}
      {generatingSummary && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', marginBottom: 24, borderRadius: 10,
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          fontSize: '0.875rem', color: 'var(--text-muted)',
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
          מייצר סיכום AI ייחודי לשנת {year}...
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24, gap: 4 }}>
        <button style={tabStyle('reviews')} onClick={() => handleTabClick('reviews')}>
          ביקורות ובעיות
          {reviews.length > 0 && (
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginRight: 6 }}>
              ({reviews.length})
            </span>
          )}
        </button>
        <button style={tabStyle('videos')} onClick={() => handleTabClick('videos')}>
          🎬 סרטוני ביקורת
          {videos && videos.length > 0 && (
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginRight: 6 }}>
              ({videos.length})
            </span>
          )}
        </button>
        <button style={tabStyle('images')} onClick={() => handleTabClick('images')}>
          📷 תמונות
          {images && images.length > 0 && (
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginRight: 6 }}>
              ({images.length})
            </span>
          )}
        </button>
      </div>

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ height: 42 }}>
              {showForm ? '✕ סגור טופס' : '✏️ כתוב ביקורת'}
            </button>
          </div>

          {showForm && (
            <div style={{ marginBottom: 32 }}>
              <ReviewForm makeSlug={makeSlug} modelSlug={modelSlug} year={year} onSuccess={handleNewReview} />
            </div>
          )}

          {reviews.length > 2 && (
            <div style={{ marginBottom: 20 }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש בביקורות..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', direction: 'rtl',
                }}
              />
              {search.trim() && (
                <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {filtered.length === 0 ? 'לא נמצאו ביקורות תואמות' : `${filtered.length} ביקורות תואמות`}
                </div>
              )}
            </div>
          )}

          <ReviewList reviews={filtered} onHelpful={handleHelpful} />

          {reviews.length === 0 && !showForm && (
            <div className="card" style={{ padding: 48, textAlign: 'center', marginTop: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: '1.125rem' }}>היה הראשון לכתוב ביקורת!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9375rem' }}>
                עזור לאחרים לדעת על הרכב הזה — שתף את הניסיון שלך.
              </p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>כתוב ביקורת</button>
            </div>
          )}
        </div>
      )}

      {/* Videos tab */}
      {activeTab === 'videos' && (
        videosLoading ? loadingPlaceholder :
        <CarVideosTab
          initialVideos={videos ?? []}
          makeSlug={makeSlug}
          modelSlug={modelSlug}
          makeNameHe={makeNameHe}
          modelNameHe={modelNameHe}
        />
      )}

      {/* Images tab */}
      {activeTab === 'images' && (
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

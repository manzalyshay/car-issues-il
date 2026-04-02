'use client';

import { useState } from 'react';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import type { Review } from '@/data/reviews';

const PAGE_SIZE = 6;

interface Props {
  makeSlug: string;
  modelSlug: string;
  years: number[];
  trims?: string[];
  initialReviews: Review[];
}

export default function ModelReviewsSection({ makeSlug, modelSlug, years, trims, initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = selectedYear ? reviews.filter((r) => r.year === selectedYear) : reviews;
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  const yearsWithReviews = years.filter((y) => reviews.some((r) => r.year === y));

  const handleNewReview = (review: Review) => {
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
    setSelectedYear(review.year);
    setPage(1);
  };

  const handleHelpful = (id: string, delta: number) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpful: Math.max(0, (r.helpful || 0) + delta) } : r)),
    );
  };

  const handleDislike = (id: string, delta: number) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, dislikes: Math.max(0, (r.dislikes ?? 0) + delta) } : r)),
    );
  };

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--brand-red)', flexShrink: 0 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            ביקורות בעלי רכב
          </h2>
          {reviews.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999 }}>
              {reviews.length}
            </span>
          )}
        </div>
        <button
          id="open-review-form"
          className="btn btn-primary"
          onClick={() => setShowForm((v) => !v)}
          style={{ height: 38, padding: '0 20px', fontSize: '0.875rem' }}
        >
          {showForm ? '✕ סגור' : '✏️ כתוב ביקורת'}
        </button>
      </div>

      {/* Write review form */}
      {showForm && (
        <div style={{ marginBottom: 28 }}>
          <ReviewForm
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={years}
            trims={trims}
            onSuccess={handleNewReview}
          />
        </div>
      )}

      {/* Year filter pills */}
      {yearsWithReviews.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            onClick={() => { setSelectedYear(null); setPage(1); }}
            style={{
              height: 32, padding: '0 14px', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              background: selectedYear === null ? 'var(--brand-red)' : 'var(--bg-muted)',
              color: selectedYear === null ? '#fff' : 'var(--text-secondary)',
              border: 'none',
            }}
          >
            כל השנים
          </button>
          {yearsWithReviews.map((y) => (
            <button
              key={y}
              onClick={() => { setSelectedYear(y); setPage(1); }}
              style={{
                height: 32, padding: '0 14px', borderRadius: 9999, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                background: selectedYear === y ? 'var(--brand-red)' : 'var(--bg-muted)',
                color: selectedYear === y ? '#fff' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              {y}
              <span style={{ marginRight: 6, opacity: 0.7, fontSize: '0.75rem' }}>
                ({reviews.filter((r) => r.year === y).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <p style={{ marginBottom: 20 }}>
            {selectedYear
              ? `אין ביקורות עדיין לשנת ${selectedYear}.`
              : 'היה הראשון לכתוב ביקורת על הדגם הזה!'}
          </p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            כתוב ביקורת
          </button>
        </div>
      ) : (
        <>
          <ReviewList reviews={visible} onHelpful={handleHelpful} onDislike={handleDislike} />
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => p + 1)}
                style={{ height: 40, padding: '0 28px' }}
              >
                טען עוד ({filtered.length - visible.length} נוספות)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import type { Review } from '@/data/reviews';

interface Props {
  makeSlug: string;
  modelSlug: string;
  year: number;
  initialReviews: Review[];
}

export default function CarYearClient({ makeSlug, modelSlug, year, initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

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

  return (
    <div>
      {/* Reviews header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>
          ביקורות ובעיות
          {reviews.length > 0 && (
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)', marginRight: 8 }}>
              ({reviews.length})
            </span>
          )}
        </h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ height: 42 }}
        >
          {showForm ? '✕ סגור טופס' : '✏️ כתוב ביקורת'}
        </button>
      </div>

      {/* Review form */}
      {showForm && (
        <div style={{ marginBottom: 32 }}>
          <ReviewForm
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            year={year}
            onSuccess={handleNewReview}
          />
        </div>
      )}

      {/* Search */}
      {reviews.length > 2 && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש בביקורות..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
              outline: 'none',
              direction: 'rtl',
            }}
          />
          {search.trim() && (
            <div style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {filtered.length === 0
                ? 'לא נמצאו ביקורות תואמות'
                : `${filtered.length} ביקורות תואמות`}
            </div>
          )}
        </div>
      )}

      {/* Reviews list */}
      <ReviewList reviews={filtered} onHelpful={handleHelpful} />

      {/* CTA if no reviews */}
      {reviews.length === 0 && !showForm && (
        <div
          className="card"
          style={{ padding: 48, textAlign: 'center', marginTop: 16 }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
          <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: '1.125rem' }}>
            היה הראשון לכתוב ביקורת!
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9375rem' }}>
            עזור לאחרים לדעת על הרכב הזה — שתף את הניסיון שלך.
          </p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            כתוב ביקורת
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import { useLocale } from '@/lib/localeContext';
import type { Review } from '@/data/reviews';

const INITIAL_VISIBLE = 1;
const PAGE_SIZE = 6;

interface Props {
  makeSlug: string;
  modelSlug: string;
  years: number[];
  trims?: string[];
  initialReviews: Review[];
}

export default function ModelReviewsSection({ makeSlug, modelSlug, years, trims, initialReviews }: Props) {
  const { t, locale } = useLocale();
  const cp = t.carPage;
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [starHover, setStarHover] = useState(0);
  const [starRating, setStarRating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = selectedYear ? reviews.filter((r) => r.year === selectedYear) : reviews;
  const collapsedCount = INITIAL_VISIBLE;
  const visible = expanded ? filtered.slice(0, page * PAGE_SIZE) : filtered.slice(0, collapsedCount);
  const hasMore = expanded && visible.length < filtered.length;
  const canExpand = !expanded && filtered.length > collapsedCount;
  const canCollapse = expanded && filtered.length > collapsedCount;

  const yearsWithReviews = years.filter((y) => reviews.some((r) => r.year === y));

  const handleNewReview = (review: Review) => {
    setReviews((prev) => [review, ...prev]);
    setShowForm(false);
    setSelectedYear(review.year);
    setPage(1);
    setExpanded(true);
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
      {/* Section header: title + stars */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          {cp.ownerReviewsTitle}
        </h2>
        {reviews.length > 0 && (() => {
          const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
          const starsFull = Math.min(5, Math.round(avg));
          const stars = '★'.repeat(starsFull) + '☆'.repeat(5 - starsFull);
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12.5, color: '#e8a33d', letterSpacing: 1 }}>{stars}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700, color: '#1c2733' }}>{avg.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: '#a8b5c4' }}>({reviews.length})</span>
            </span>
          );
        })()}
      </div>

      {/* Stars — always visible */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
          {locale === 'en' ? 'Rate this car' : 'דרגו את הרכב'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setStarHover(star)}
              onMouseLeave={() => setStarHover(0)}
              onClick={() => { setStarRating(star); setShowForm(true); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                fontSize: 32, lineHeight: 1,
                color: star <= (starHover || 0) ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.1s, transform 0.1s',
                transform: star <= (starHover || 0) ? 'scale(1.18)' : 'scale(1)',
              }}
            >★</button>
          ))}
        </div>
      </div>

      {/* Inline compact form — appears after star click */}
      {showForm && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              {locale === 'en' ? 'Write a review' : 'כתבו ביקורת'}
            </span>
            <button
              onClick={() => { setShowForm(false); setStarRating(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, padding: '2px 6px' }}
            >×</button>
          </div>
          <ReviewForm
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={years}
            trims={trims}
            initialRating={starRating ?? 5}
            onSuccess={handleNewReview}
          />
        </div>
      )}

      {/* Year filter combobox */}
      {reviews.length > 0 && yearsWithReviews.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <select
            value={selectedYear ?? ''}
            onChange={(e) => { setSelectedYear(e.target.value ? Number(e.target.value) : null); setPage(1); }}
            style={{
              height: 32, padding: '0 10px', borderRadius: 7, fontSize: '0.8125rem', fontWeight: 600,
              border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">{cp.allYears}</option>
            {yearsWithReviews.map((y) => (
              <option key={y} value={y}>
                {y} ({reviews.filter((r) => r.year === y).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Reviews list */}
      {filtered.length === 0 ? (
        selectedYear ? (
          <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {cp.noReviewsForYearPrefix} {selectedYear}.
          </div>
        ) : null
      ) : (
        <>
          <ReviewList reviews={visible} onHelpful={handleHelpful} onDislike={handleDislike} />
          {canExpand && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                className="btn btn-outline"
                onClick={() => setExpanded(true)}
                style={{ height: 40, padding: '0 28px' }}
              >
                {locale === 'en' ? `Show all ${filtered.length} reviews` : `הצג עוד ביקורות (${filtered.length - visible.length})`}
              </button>
            </div>
          )}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                className="btn btn-outline"
                onClick={() => setPage((p) => p + 1)}
                style={{ height: 40, padding: '0 28px' }}
              >
                {cp.loadMore} ({filtered.length - visible.length})
              </button>
            </div>
          )}
          {canCollapse && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', padding: '4px 12px', fontFamily: 'inherit', textDecoration: 'underline' }}
                onClick={() => { setExpanded(false); setPage(1); }}
              >
                {locale === 'en' ? 'Show less' : 'הצג פחות'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

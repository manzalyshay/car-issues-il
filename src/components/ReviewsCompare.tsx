'use client';
import { useState, useEffect } from 'react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  title_en?: string | null;
  body_en?: string | null;
  owner_years?: number | null;
  created_at?: string | null;
}

interface Props {
  make1: string; model1: string; name1: string;
  make2: string; model2: string; name2: string;
  locale: 'he' | 'en';
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '0.75rem', letterSpacing: 1 }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

function ReviewCard({ review, locale }: { review: Review; locale: 'he' | 'en' }) {
  const isEn = locale === 'en';
  // Never show Hebrew text on English site — only show review if translated
  const title = isEn ? (review.title_en || null) : review.title;
  const body  = isEn ? (review.body_en  || null) : review.body;
  if (!body) return null;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 8,
      background: 'var(--bg-muted)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <Stars rating={review.rating} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {body}
      </p>
    </div>
  );
}

export default function ReviewsCompare({ make1, model1, name1, make2, model2, name2, locale }: Props) {
  const [reviews1, setReviews1] = useState<Review[]>([]);
  const [reviews2, setReviews2] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/reviews?makeSlug=${make1}&modelSlug=${model1}`).then(r => r.json()).then((d: { reviews?: Review[] }) => (d.reviews ?? []).slice(0, 2)).catch(() => []),
      fetch(`/api/reviews?makeSlug=${make2}&modelSlug=${model2}`).then(r => r.json()).then((d: { reviews?: Review[] }) => (d.reviews ?? []).slice(0, 2)).catch(() => []),
    ]).then(([r1, r2]) => {
      setReviews1(r1);
      setReviews2(r2);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [make1, model1, make2, model2]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;
  if (reviews1.length === 0 && reviews2.length === 0) return null;

  const isHe = locale === 'he';

  return (
    <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 28 }}>
      <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.1rem' }}>💬</span>
        <h2 style={{ margin: 0, color: '#f1f5f9', fontWeight: 800, fontSize: '1rem' }}>
          {isHe ? 'ביקורות בעלי רכב' : 'Owner Reviews'}
        </h2>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { reviews: reviews1, name: name1 },
            { reviews: reviews2, name: name2 },
          ].map(({ reviews, name }) => (
            <div key={name}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{name}</div>
              {reviews.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {isHe ? 'אין ביקורות עדיין' : 'No reviews yet'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reviews.map(r => <ReviewCard key={r.id} review={r} locale={locale} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

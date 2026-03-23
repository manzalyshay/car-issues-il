'use client';

import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import type { Review } from '@/data/reviews';
import { CATEGORY_LABELS } from '@/data/reviews';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

interface Props {
  reviews: Review[];
  onHelpful?: (id: string, delta: number) => void;
}

const FILTER_OPTIONS = [
  { value: 'all',        label: 'הכל' },
  { value: 'mechanical', label: 'מכאני' },
  { value: 'electrical', label: 'חשמל' },
  { value: 'comfort',    label: 'נוחות' },
  { value: 'safety',     label: 'בטיחות' },
  { value: 'general',    label: 'כללי' },
];

const LS_KEY = 'car_liked_reviews';

function getLocalLikes(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveLocalLike(id: string) {
  const set = getLocalLikes();
  set.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}
function removeLocalLike(id: string) {
  const set = getLocalLikes();
  set.delete(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}

export default function ReviewList({ reviews, onHelpful }: Props) {
  const { user } = useAuth();
  const [filter, setFilter]   = useState<string>('all');
  const [sort, setSort]       = useState<'newest' | 'helpful' | 'rating'>('newest');
  const [liked, setLiked]     = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Initialise liked state from localStorage + DB
  useEffect(() => {
    setLiked(getLocalLikes());
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('review_likes')
      .select('review_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setLiked((prev) => new Set([...prev, ...data.map((r: { review_id: string }) => r.review_id)]));
      });
  }, [user]);

  const handleLike = async (review: Review) => {
    const alreadyLiked = liked.has(review.id);

    if (user) {
      // Logged-in: toggle in DB
      if (alreadyLiked) {
        await supabase.from('review_likes').delete().eq('review_id', review.id).eq('user_id', user.id);
        await fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: -1 }) });
        setLiked((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
        onHelpful?.(review.id, -1);
      } else {
        await supabase.from('review_likes').insert({ review_id: review.id, user_id: user.id });
        await fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: 1 }) });
        setLiked((prev) => new Set([...prev, review.id]));
        onHelpful?.(review.id, 1);
      }
    } else {
      // Guest: localStorage-based, toggleable
      if (alreadyLiked) {
        removeLocalLike(review.id);
        setLiked((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
        await fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: -1 }) });
        onHelpful?.(review.id, -1);
      } else {
        saveLocalLike(review.id);
        setLiked((prev) => new Set([...prev, review.id]));
        await fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: 1 }) });
        onHelpful?.(review.id, 1);
      }
    }
  };

  const filtered = reviews.filter((r) => filter === 'all' || r.category === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'newest')  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === 'helpful') return (b.helpful || 0) - (a.helpful || 0);
    return b.rating - a.rating;
  });

  return (
    <>
      <div>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter(o.value)}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 9999, border: '1.5px solid',
                  borderColor: filter === o.value ? 'var(--brand-red)' : 'var(--border)',
                  background: filter === o.value ? 'rgba(230,57,70,.08)' : 'transparent',
                  color: filter === o.value ? 'var(--brand-red)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid var(--border)',
              background: 'var(--bg-base)', color: 'var(--text-secondary)',
              fontSize: '0.8125rem', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <option value="newest">חדש ביותר</option>
            <option value="helpful">הכי שימושי</option>
            <option value="rating">דירוג גבוה</option>
          </select>
        </div>

        {sorted.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <p style={{ fontSize: '0.9375rem' }}>
              {filter === 'all' ? 'אין ביקורות עדיין — היה הראשון לכתוב!' : 'אין ביקורות בקטגוריה זו.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sorted.map((review) => {
              const isLiked = liked.has(review.id);
              return (
                <article key={review.id} className="card" style={{ padding: 24 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{review.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <StarRating rating={review.rating} size={15} />
                        <span className="badge badge-gray">{CATEGORY_LABELS[review.category]}</span>
                        {review.mileage && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            📍 {review.mileage.toLocaleString('he-IL')} ק״מ
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'left', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{review.authorName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(review.createdAt).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem', marginBottom: review.images?.length ? 12 : 16 }}>
                    {review.body}
                  </p>

                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {review.images.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          onClick={() => setLightbox(url)}
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1.5px solid var(--border)', cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => handleLike(review)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        height: 30, padding: '0 12px', borderRadius: 9999,
                        border: '1px solid var(--border)',
                        background: isLiked ? 'rgba(34,197,94,.08)' : 'transparent',
                        color: isLiked ? '#16a34a' : 'var(--text-muted)',
                        fontSize: '0.8125rem', cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {isLiked ? '👍' : '👍'} {review.helpful} שימושי
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </>
  );
}

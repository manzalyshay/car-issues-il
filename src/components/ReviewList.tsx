'use client';

import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import SharePopup from './SharePopup';
import type { Review } from '@/data/reviews';
import { CATEGORY_LABELS } from '@/data/reviews';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';

interface Props {
  reviews: Review[];
  onHelpful?: (id: string, delta: number) => void;
  onDislike?: (id: string, delta: number) => void;
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
const LS_DISLIKE_KEY = 'car_disliked_reviews';

function getLocalSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); }
  catch { return new Set(); }
}
function saveLocalItem(key: string, id: string) {
  const set = getLocalSet(key);
  set.add(id);
  localStorage.setItem(key, JSON.stringify([...set]));
}
function removeLocalItem(key: string, id: string) {
  const set = getLocalSet(key);
  set.delete(id);
  localStorage.setItem(key, JSON.stringify([...set]));
}
const getLocalLikes = () => getLocalSet(LS_KEY);
const saveLocalLike = (id: string) => saveLocalItem(LS_KEY, id);
const removeLocalLike = (id: string) => removeLocalItem(LS_KEY, id);
const getLocalDislikes = () => getLocalSet(LS_DISLIKE_KEY);
const saveLocalDislike = (id: string) => saveLocalItem(LS_DISLIKE_KEY, id);
const removeLocalDislike = (id: string) => removeLocalItem(LS_DISLIKE_KEY, id);

interface Reply {
  id: string;
  author_name: string;
  user_id: string | null;
  body: string;
  created_at: string;
}

function ReplySection({ reviewId, user }: { reviewId: string; user: { id: string; email?: string } | null }) {
  const [open, setOpen]         = useState(false);
  const [replies, setReplies]   = useState<Reply[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [body, setBody]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount]       = useState<number | null>(null);

  // Fetch count (light) on mount
  useEffect(() => {
    fetch(`/api/reviews/${reviewId}/replies`)
      .then(r => r.json())
      .then(d => setCount((d.replies ?? []).length))
      .catch(() => {});
  }, [reviewId]);

  const load = async () => {
    if (open) { setOpen(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/reviews/${reviewId}/replies`);
      const d = await r.json();
      setReplies(d.replies ?? []);
      setCount((d.replies ?? []).length);
    } catch { /* ignore */ }
    setLoading(false);
    setOpen(true);
  };

  const submit = async () => {
    const authorName = (user ? (user.email?.split('@')[0] ?? name) : name).trim();
    if (!authorName || !body.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, userId: user?.id ?? null, replyBody: body }),
      });
      const d = await r.json();
      if (d.reply) {
        setReplies(prev => [...prev, d.reply]);
        setCount(c => (c ?? 0) + 1);
        setBody('');
        setShowForm(false);
        setOpen(true);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const replyCount = count ?? 0;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Toggle button */}
      <button
        onClick={load}
        disabled={loading}
        style={{
          background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
          color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '4px 8px',
          borderRadius: 6, fontFamily: 'inherit', transition: 'color 0.15s',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
      >
        💬 {loading ? '...' : replyCount > 0 ? `${replyCount} תגובות` : 'הגב'}
      </button>

      {/* Replies + form */}
      {open && (
        <div style={{ marginTop: 10, paddingRight: 16, borderRight: '2px solid var(--border)' }}>
          {replies.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {replies.map(reply => (
                <div key={reply.id} style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: 6 }}>{reply.author_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    {new Date(reply.created_at).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)' }}>{reply.body}</p>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!user && (
                <input
                  placeholder="שמך"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={50}
                  style={{
                    height: 34, padding: '0 10px', borderRadius: 8,
                    border: '1.5px solid var(--border)', background: 'var(--bg-base)',
                    color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit',
                  }}
                />
              )}
              <textarea
                placeholder="כתוב תגובה..."
                value={body}
                onChange={e => setBody(e.target.value)}
                maxLength={1000}
                rows={3}
                style={{
                  padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'var(--bg-base)',
                  color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit',
                  resize: 'vertical', lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={submit}
                  disabled={submitting || !body.trim() || (!user && !name.trim())}
                  style={{
                    height: 30, padding: '0 16px', borderRadius: 8, border: 'none',
                    background: 'var(--brand-red)', color: '#fff',
                    fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    opacity: (submitting || !body.trim() || (!user && !name.trim())) ? 0.5 : 1,
                  }}
                >
                  {submitting ? '...' : 'שלח'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setBody(''); }}
                  style={{
                    height: 30, padding: '0 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'none', border: '1px dashed var(--border)', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.8rem', padding: '5px 12px',
                borderRadius: 8, fontFamily: 'inherit', width: '100%', textAlign: 'center',
              }}
            >
              + הוסף תגובה
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const REPORT_REASONS = [
  { value: 'spam',      label: 'ספאם' },
  { value: 'fake',      label: 'ביקורת מזויפת' },
  { value: 'offensive', label: 'תוכן פוגעני' },
  { value: 'wrong_car', label: 'רכב שגוי' },
  { value: 'other',     label: 'אחר' },
];

function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen]   = useState(false);
  const [reason, setReason] = useState('spam');
  const [sent, setSent]   = useState(false);
  const [busy, setBusy]   = useState(false);

  const submit = async () => {
    setBusy(true);
    await fetch(`/api/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setSent(true);
    setBusy(false);
  };

  if (sent) return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>✓ דווח</span>;

  return (
    <div style={{ position: 'relative', marginRight: 'auto' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.75rem', padding: '4px 8px',
          borderRadius: 6, fontFamily: 'inherit',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--brand-red)')}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
        title="דווח על ביקורת"
      >
        ⚑ דווח
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 12, minWidth: 180,
          boxShadow: 'var(--shadow-md)',
        }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>סיבת הדיווח:</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%', height: 34, padding: '0 8px', marginBottom: 8,
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--bg-base)', color: 'var(--text-primary)',
              fontSize: '0.8125rem', fontFamily: 'inherit',
            }}
          >
            {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={submit}
              disabled={busy}
              style={{
                flex: 1, height: 30, borderRadius: 6, border: 'none',
                background: 'var(--brand-red)', color: '#fff',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {busy ? '...' : 'שלח'}
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
                color: 'var(--text-secondary)',
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewList({ reviews, onHelpful, onDislike }: Props) {
  const { user } = useAuth();
  const [filter, setFilter]     = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [subModelFilter, setSubModelFilter] = useState<string | 'all'>('all');
  const [sort, setSort]         = useState<'newest' | 'helpful' | 'rating'>('newest');

  const availableYears = Array.from(new Set(reviews.map((r) => r.year))).sort((a, b) => b - a);
  const availableSubModels = Array.from(new Set(reviews.map((r) => r.subModel).filter(Boolean) as string[])).sort();
  const [liked, setLiked]       = useState<Set<string>>(new Set());
  const [disliked, setDisliked] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Initialise liked/disliked state from localStorage
  useEffect(() => {
    setLiked(getLocalLikes());
    setDisliked(getLocalDislikes());
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
    supabase
      .from('review_dislikes')
      .select('review_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setDisliked((prev) => new Set([...prev, ...data.map((r: { review_id: string }) => r.review_id)]));
      });
  }, [user]);

  const handleLike = (review: Review) => {
    const alreadyLiked = liked.has(review.id);
    const hadDislike = disliked.has(review.id);

    // Optimistic update — apply immediately
    if (hadDislike) {
      setDisliked((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
      onDislike?.(review.id, -1);
      if (!user) removeLocalDislike(review.id);
    }
    if (alreadyLiked) {
      setLiked((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
      onHelpful?.(review.id, -1);
      if (!user) removeLocalLike(review.id);
    } else {
      setLiked((prev) => new Set([...prev, review.id]));
      onHelpful?.(review.id, 1);
      if (!user) saveLocalLike(review.id);
    }

    // Fire API calls in background; revert on failure
    const revert = () => {
      if (hadDislike) { setDisliked((prev) => new Set([...prev, review.id])); onDislike?.(review.id, 1); }
      if (alreadyLiked) { setLiked((prev) => new Set([...prev, review.id])); onHelpful?.(review.id, 1); }
      else { setLiked((prev) => { const s = new Set(prev); s.delete(review.id); return s; }); onHelpful?.(review.id, -1); }
    };

    const run = async () => {
      try {
        if (hadDislike) {
          const [r1] = await Promise.all([
            fetch(`/api/reviews/${review.id}/dislike`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: -1 }) }),
            user ? supabase.from('review_dislikes').delete().eq('review_id', review.id).eq('user_id', user.id) : Promise.resolve(),
          ]);
          if (!r1.ok) { revert(); return; }
        }
        const delta = alreadyLiked ? -1 : 1;
        const [r2] = await Promise.all([
          fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) }),
          user ? (alreadyLiked
            ? supabase.from('review_likes').delete().eq('review_id', review.id).eq('user_id', user.id)
            : supabase.from('review_likes').insert({ review_id: review.id, user_id: user.id })
          ) : Promise.resolve(),
        ]);
        if (!r2.ok) revert();
      } catch { revert(); }
    };
    run();
  };

  const handleDislike = (review: Review) => {
    const alreadyDisliked = disliked.has(review.id);
    const hadLike = liked.has(review.id);

    // Optimistic update — apply immediately
    if (hadLike) {
      setLiked((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
      onHelpful?.(review.id, -1);
      if (!user) removeLocalLike(review.id);
    }
    if (alreadyDisliked) {
      setDisliked((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
      onDislike?.(review.id, -1);
      if (!user) removeLocalDislike(review.id);
    } else {
      setDisliked((prev) => new Set([...prev, review.id]));
      onDislike?.(review.id, 1);
      if (!user) saveLocalDislike(review.id);
    }

    const revert = () => {
      if (hadLike) { setLiked((prev) => new Set([...prev, review.id])); onHelpful?.(review.id, 1); }
      if (alreadyDisliked) { setDisliked((prev) => new Set([...prev, review.id])); onDislike?.(review.id, 1); }
      else { setDisliked((prev) => { const s = new Set(prev); s.delete(review.id); return s; }); onDislike?.(review.id, -1); }
    };

    const run = async () => {
      try {
        if (hadLike) {
          const [r1] = await Promise.all([
            fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta: -1 }) }),
            user ? supabase.from('review_likes').delete().eq('review_id', review.id).eq('user_id', user.id) : Promise.resolve(),
          ]);
          if (!r1.ok) { revert(); return; }
        }
        const delta = alreadyDisliked ? -1 : 1;
        const [r2] = await Promise.all([
          fetch(`/api/reviews/${review.id}/dislike`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) }),
          user ? (alreadyDisliked
            ? supabase.from('review_dislikes').delete().eq('review_id', review.id).eq('user_id', user.id)
            : supabase.from('review_dislikes').insert({ review_id: review.id, user_id: user.id })
          ) : Promise.resolve(),
        ]);
        if (!r2.ok) revert();
      } catch { revert(); }
    };
    run();
  };

  const filtered = reviews.filter((r) =>
    (filter === 'all' || r.category === filter) &&
    (yearFilter === 'all' || r.year === yearFilter) &&
    (subModelFilter === 'all' || r.subModel === subModelFilter)
  );
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
            {availableYears.length > 1 && (
              <>
                <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '4px 2px' }} />
                {availableYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYearFilter(yearFilter === y ? 'all' : y)}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 9999, border: '1.5px solid',
                      borderColor: yearFilter === y ? '#2563eb' : 'var(--border)',
                      background: yearFilter === y ? 'rgba(37,99,235,.08)' : 'transparent',
                      color: yearFilter === y ? '#2563eb' : 'var(--text-secondary)',
                      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {y}
                  </button>
                ))}
              </>
            )}
            {availableSubModels.length > 0 && (
              <>
                <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '4px 2px' }} />
                {availableSubModels.map((sm) => (
                  <button
                    key={sm}
                    onClick={() => setSubModelFilter(subModelFilter === sm ? 'all' : sm)}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 9999, border: '1.5px solid',
                      borderColor: subModelFilter === sm ? '#7c3aed' : 'var(--border)',
                      background: subModelFilter === sm ? 'rgba(124,58,237,.08)' : 'transparent',
                      color: subModelFilter === sm ? '#7c3aed' : 'var(--text-secondary)',
                      fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {sm}
                  </button>
                ))}
              </>
            )}
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
                <article key={review.id} id={`review-${review.id}`} className="card" style={{ padding: 24 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      {review.title && <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{review.title}</h3>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <StarRating rating={review.rating} size={15} />
                        <span className="badge badge-blue">{review.year}</span>
                        {review.subModel && <span className="badge badge-gray" style={{ background: 'rgba(37,99,235,.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,.2)' }}>{review.subModel}</span>}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleLike(review)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        height: 30, padding: '0 12px', borderRadius: 9999,
                        border: `1.5px solid ${isLiked ? 'rgba(34,197,94,.4)' : 'var(--border)'}`,
                        background: isLiked ? 'rgba(34,197,94,.08)' : 'transparent',
                        color: isLiked ? '#16a34a' : 'var(--text-muted)',
                        fontSize: '0.8125rem', cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      👍 <span style={{ fontWeight: 600 }}>{review.helpful ?? 0}</span>
                    </button>
                    <button
                      onClick={() => handleDislike(review)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        height: 30, padding: '0 12px', borderRadius: 9999,
                        border: `1.5px solid ${disliked.has(review.id) ? 'rgba(230,57,70,.4)' : 'var(--border)'}`,
                        background: disliked.has(review.id) ? 'rgba(230,57,70,.08)' : 'transparent',
                        color: disliked.has(review.id) ? 'var(--brand-red)' : 'var(--text-muted)',
                        fontSize: '0.8125rem', cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      👎 <span style={{ fontWeight: 600 }}>{review.dislikes ?? 0}</span>
                    </button>
                    <ReportButton reviewId={review.id} />
                    <span style={{ flex: 1 }} />
                    <SharePopup
                      compact
                      label="שתף"
                      title={`${review.title || `ביקורת על ${review.makeSlug} ${review.modelSlug}`} — CarIssues IL`}
                      url={`https://carissues.co.il/cars/${review.makeSlug}/${review.modelSlug}#review-${review.id}`}
                    />
                  </div>

                  {/* Replies */}
                  <ReplySection reviewId={review.id} user={user} />
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, displayName } from '@/lib/authContext';
import { supabase } from '@/lib/supabase';
import { CATEGORY_LABELS } from '@/data/reviews';
import type { Review } from '@/data/reviews';
import type { CarMake } from '@/lib/carsDb';
import { useLocale } from '@/lib/localeContext';

function dbToReview(row: Record<string, unknown>): Review {
  return {
    id:         String(row.id),
    makeSlug:   String(row.make_slug),
    modelSlug:  String(row.model_slug),
    year:       Number(row.year),
    rating:     Number(row.rating),
    title:      String(row.title),
    body:       String(row.body),
    category:   row.category as Review['category'],
    mileage:    row.mileage != null ? Number(row.mileage) : undefined,
    authorName: String(row.author),
    userId:     row.user_id ? String(row.user_id) : undefined,
    helpful:    Number(row.helpful ?? 0),
    createdAt:  String(row.created_at),
    images:     Array.isArray(row.images) ? (row.images as string[]) : [],
  };
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '0.875rem', letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('')}
    </span>
  );
}

export default function ProfilePage() {
  const { t, locale } = useLocale();
  const pp = t.profilePage;
  const { user, loading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fetching, setFetching] = useState(false);
  const [carsMap, setCarsMap] = useState<Map<string, CarMake>>(new Map());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    fetch('/api/cars').then(r => r.json()).then((makes: CarMake[]) => {
      setCarsMap(new Map(makes.map(m => [m.slug, m])));
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews((data ?? []).map(dbToReview));
        setFetching(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32 }}>⏳</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '80px 0' }}>
        <div className="container" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>{pp.loginRequired}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{pp.loginBody}</p>
          <Link href="/" className="btn btn-primary">{pp.backHome}</Link>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="page-section">
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{pp.home}</Link>
          <span>›</span>
          <span style={{ color: 'var(--text)' }}>{pp.breadcrumb}</span>
        </div>

        {/* Profile header */}
        <div className="card" style={{ padding: '28px', marginBottom: 32, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--brand-gold-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: '#fff',
          }}>
            {displayName(user).charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  style={{ fontSize: '1.1rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', minWidth: 160 }}
                  autoFocus
                />
                <button
                  disabled={nameSaving || !nameInput.trim()}
                  onClick={async () => {
                    setNameSaving(true);
                    await supabase.auth.updateUser({ data: { display_name: nameInput.trim() } });
                    setNameSaving(false);
                    setEditingName(false);
                  }}
                  style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  {nameSaving ? '...' : pp.save}
                </button>
                <button onClick={() => setEditingName(false)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {pp.cancel}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{displayName(user)}</h1>
                <button onClick={() => { setNameInput(displayName(user)); setEditingName(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2px 6px' }} title={pp.editNameTitle}>
                  ✏️
                </button>
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 8 }}>{user.email}</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{reviews.length}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 4 }}>{pp.reviewsLabel}</span>
              </div>
              {avgRating != null && (
                <div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{avgRating.toFixed(1)}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 4 }}>{pp.avgLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{pp.myReviews}</h2>
          {reviews.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 10px', borderRadius: 999 }}>
              {reviews.length}
            </span>
          )}
        </div>

        {fetching ? (
          <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <p style={{ marginTop: 12 }}>{pp.loadingReviews}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="card" style={{ padding: 64, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <p style={{ marginBottom: 20 }}>{pp.noReviews}</p>
            <Link href="/cars" className="btn btn-primary">{pp.findCar}</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map((review) => {
              const make = carsMap.get(review.makeSlug);
              const model = make?.models.find(m => m.slug === review.modelSlug);
              const carLabel = make && model
                ? `${locale === 'en' ? make.nameEn : make.nameHe} ${locale === 'en' ? model.nameEn : model.nameHe} ${review.year}`
                : `${review.makeSlug} ${review.modelSlug} ${review.year}`;
              const carHref = `/cars/${review.makeSlug}/${review.modelSlug}/${review.year}`;

              return (
                <div key={review.id} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div>
                      <Link href={carHref} style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                        {carLabel}
                      </Link>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0 0', color: 'var(--text)' }}>{review.title}</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <StarRow rating={review.rating} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(review.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                    {review.body}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{CATEGORY_LABELS[review.category]}</span>
                    {review.mileage && (
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{review.mileage.toLocaleString()} {pp.km}</span>
                    )}
                    {review.helpful > 0 && (
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>👍 {review.helpful} {pp.foundHelpful}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

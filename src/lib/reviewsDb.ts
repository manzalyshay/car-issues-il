import { unstable_cache } from 'next/cache';
import { dbAll, dbFirst, dbRun } from './db';
import type { Review } from '@/data/reviews';
import { translateReview } from './translateReview';
import { randomUUID } from 'crypto';

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAllReviews(): Promise<Review[]> {
  const rows = await dbAll('SELECT * FROM reviews ORDER BY created_at DESC');
  return rows.map(dbToReview);
}

export const getReviewsForModel = unstable_cache(
  async (makeSlug: string, modelSlug: string): Promise<Review[]> => {
    const rows = await dbAll(
      'SELECT * FROM reviews WHERE make_slug = ? AND model_slug = ? ORDER BY created_at DESC',
      makeSlug, modelSlug,
    );
    return rows.map(dbToReview);
  },
  ['reviews-model'],
  { revalidate: 3600, tags: ['reviews'] },
);

export const getReviewsForCar = unstable_cache(
  async (makeSlug: string, modelSlug: string, year: number): Promise<Review[]> => {
    const rows = await dbAll(
      'SELECT * FROM reviews WHERE make_slug = ? AND model_slug = ? AND year = ? ORDER BY helpful DESC, created_at DESC',
      makeSlug, modelSlug, year,
    );
    return rows.map(dbToReview);
  },
  ['reviews-car'],
  { revalidate: 3600, tags: ['reviews'] },
);

export const getAverageRating = unstable_cache(
  async (makeSlug: string, modelSlug: string): Promise<number | null> => {
    const row = await dbFirst<{ avg: number | null }>(
      'SELECT AVG(rating) as avg FROM reviews WHERE make_slug = ? AND model_slug = ?',
      makeSlug, modelSlug,
    );
    return row?.avg ?? null;
  },
  ['reviews-avg'],
  { revalidate: 3600, tags: ['reviews'] },
);

// ── Write ─────────────────────────────────────────────────────────────────────

export async function addReview(
  review: Omit<Review, 'id' | 'helpful' | 'createdAt'>,
): Promise<Review> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO reviews
      (id, make_slug, model_slug, year, rating, title, body, category,
       sub_model, mileage, author, user_id, images, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    review.makeSlug,
    review.modelSlug,
    review.year,
    review.rating,
    review.title,
    review.body,
    review.category ?? 'general',
    review.subModel ?? null,
    review.mileage ?? null,
    review.authorName,
    review.userId ?? null,
    JSON.stringify(review.images ?? []),
    now,
  );
  return {
    ...review,
    id,
    helpful: 0,
    dislikes: 0,
    createdAt: now,
    images: review.images ?? [],
  } as Review;
}

export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const rows = await dbAll(
    'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC',
    userId,
  );
  return rows.map(dbToReview);
}

// ── Likes ─────────────────────────────────────────────────────────────────────

export async function getUserLikedReviews(userId: string): Promise<string[]> {
  const rows = await dbAll<{ review_id: string }>(
    'SELECT review_id FROM review_likes WHERE user_id = ?',
    userId,
  );
  return rows.map((r) => r.review_id);
}

export async function toggleLike(reviewId: string, userId: string): Promise<'liked' | 'unliked'> {
  const existing = await dbFirst(
    'SELECT review_id FROM review_likes WHERE review_id = ? AND user_id = ?',
    reviewId, userId,
  );
  if (existing) {
    await dbRun('DELETE FROM review_likes WHERE review_id = ? AND user_id = ?', reviewId, userId);
    await dbRun('UPDATE reviews SET helpful = MAX(0, helpful - 1) WHERE id = ?', reviewId);
    return 'unliked';
  } else {
    await dbRun('INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)', reviewId, userId);
    await dbRun('UPDATE reviews SET helpful = helpful + 1 WHERE id = ?', reviewId);
    return 'liked';
  }
}

// ── Translation ───────────────────────────────────────────────────────────────

export async function translateAndSaveReview(
  reviewId: string, title: string, body: string,
): Promise<void> {
  try {
    const { titleEn, bodyEn } = await translateReview(title, body);
    if (!titleEn && !bodyEn) return;
    await dbRun(
      'UPDATE reviews SET title_en = ?, body_en = ? WHERE id = ?',
      titleEn ?? null, bodyEn ?? null, reviewId,
    );
  } catch {
    // fire-and-forget — never throw
  }
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function dbToReview(row: Record<string, unknown>): Review {
  return {
    id:         String(row.id),
    makeSlug:   String(row.make_slug),
    modelSlug:  String(row.model_slug),
    year:       Number(row.year),
    rating:     Number(row.rating),
    title:      String(row.title ?? ''),
    body:       String(row.body ?? ''),
    titleEn:    row.title_en ? String(row.title_en) : null,
    bodyEn:     row.body_en  ? String(row.body_en)  : null,
    category:   (row.category as Review['category']) ?? 'general',
    subModel:   row.sub_model ? String(row.sub_model) : undefined,
    mileage:    row.mileage != null ? Number(row.mileage) : undefined,
    authorName: String(row.author ?? ''),
    userId:     row.user_id ? String(row.user_id) : undefined,
    helpful:    Number(row.helpful ?? 0),
    dislikes:   Number(row.dislikes ?? 0),
    createdAt:  String(row.created_at),
    images:     (() => {
      try { return JSON.parse(String(row.images || '[]')); } catch { return []; }
    })(),
  };
}

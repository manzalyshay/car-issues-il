import { supabase } from './supabase';
import type { Review } from '@/data/reviews';

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllReviews:', error.message); return []; }
  return (data ?? []).map(dbToReview);
}

export async function getReviewsForModel(makeSlug: string, modelSlug: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .order('created_at', { ascending: false });
  if (error) { console.error('getReviewsForModel:', error.message); return []; }
  return (data ?? []).map(dbToReview);
}

export async function getReviewsForCar(makeSlug: string, modelSlug: string, year: number): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug)
    .eq('year', year)
    .order('helpful', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('getReviewsForCar:', error.message); return []; }
  return (data ?? []).map(dbToReview);
}

export async function getAverageRating(makeSlug: string, modelSlug: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('make_slug', makeSlug)
    .eq('model_slug', modelSlug);
  if (error || !data?.length) return null;
  return data.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / data.length;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function addReview(
  review: Omit<Review, 'id' | 'helpful' | 'createdAt'>
): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      make_slug:  review.makeSlug,
      model_slug: review.modelSlug,
      year:       review.year,
      rating:     review.rating,
      title:      review.title,
      body:       review.body,
      category:   review.category,
      sub_model:  review.subModel?.trim().slice(0, 60) ?? null,
      mileage:    review.mileage ?? null,
      author:     review.authorName,
      user_id:    review.userId ?? null,
      images:     review.images ?? [],
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return dbToReview(data);
}

export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getReviewsByUser:', error.message); return []; }
  return (data ?? []).map(dbToReview);
}

// ── Likes (per-user) ──────────────────────────────────────────────────────────

export async function getUserLikedReviews(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('review_likes')
    .select('review_id')
    .eq('user_id', userId);
  return (data ?? []).map((r: { review_id: string }) => r.review_id);
}

export async function toggleLike(reviewId: string, userId: string): Promise<'liked' | 'unliked'> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('review_likes')
    .select('review_id')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', userId);
    await supabase.rpc('decrement_helpful', { review_id: reviewId });
    return 'unliked';
  } else {
    // Like
    await supabase.from('review_likes').insert({ review_id: reviewId, user_id: userId });
    await supabase.rpc('increment_helpful', { review_id: reviewId });
    return 'liked';
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
    title:      String(row.title),
    body:       String(row.body),
    category:   row.category as Review['category'],
    subModel:   row.sub_model ? String(row.sub_model) : undefined,
    mileage:    row.mileage != null ? Number(row.mileage) : undefined,
    authorName: String(row.author),
    userId:     row.user_id ? String(row.user_id) : undefined,
    helpful:    Number(row.helpful ?? 0),
    dislikes:   Number(row.dislikes ?? 0),
    createdAt:  String(row.created_at),
    images:     Array.isArray(row.images) ? (row.images as string[]) : [],
  };
}

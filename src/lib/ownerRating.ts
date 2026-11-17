import type { Review } from '@/data/reviews';

// Owner ratings for JSON-LD (Google review snippets / stars).
//
// Only rows in the D1 `reviews` table written by owners count. Anything the
// site itself authored (author name containing "CarIssues"), AI scores and
// external test scores are never marked up: Google's review-snippet policy
// disallows self-serving and aggregated third-party ratings.

export function ownerReviewsOnly(reviews: Review[]): Review[] {
  return reviews.filter(
    (r) => !/carissues/i.test(r.authorName ?? '') && Number.isFinite(r.rating) && r.rating >= 1 && r.rating <= 5,
  );
}

/** schema.org AggregateRating from owner reviews, or null when there are none. */
export function ownerAggregateRating(reviews: Review[]) {
  const owners = ownerReviewsOnly(reviews);
  if (owners.length === 0) return null;
  const avg = owners.reduce((sum, r) => sum + r.rating, 0) / owners.length;
  return {
    '@type': 'AggregateRating',
    ratingValue: avg.toFixed(1),
    ratingCount: owners.length,
    reviewCount: owners.length,
    bestRating: 5,
    worstRating: 1,
  };
}

/**
 * Honest AI attribution helpers.
 * All model data now comes from batch research files (tests + official data),
 * not scraped owner posts. Legacy postCount fields are ignored.
 */
import type { ExpertReview } from './expertReviews';

/** True when the expert review was synthesised from real owner posts (not just scraped expert articles). */
export function isOwnerPostBased(_er: ExpertReview): boolean {
  return false;
}

/** Short attribution line. */
export function aiSourceLabel(_er: ExpertReview, isEn: boolean): string {
  return isEn ? 'Based on official data' : 'מבוסס על נתונים רשמיים';
}

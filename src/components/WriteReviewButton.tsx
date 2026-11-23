'use client';

import { useLocale } from '@/lib/localeContext';

/** Event the owner-reviews section listens for: opens its form and scrolls to it. */
export const OPEN_REVIEW_FORM_EVENT = 'open-review-form';

export function openReviewForm(rating?: number) {
  window.dispatchEvent(new CustomEvent(OPEN_REVIEW_FORM_EVENT, { detail: { rating } }));
}

const LABEL = { he: 'כתבו ביקורת', en: 'Write a review', ru: 'Написать отзыв' } as const;

/** Hero button next to Follow / Compare (own full-width row on mobile, see .hero-review-btn). */
export default function WriteReviewButton() {
  const { locale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => openReviewForm()}
      className="hero-review-btn"
      style={{
        border: 0, background: '#f59e0b', color: '#1c1300',
        borderRadius: 12, height: 48, padding: '0 22px', fontSize: 16, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
      }}
    >
      ✍️ {LABEL[locale] ?? LABEL.he}
    </button>
  );
}

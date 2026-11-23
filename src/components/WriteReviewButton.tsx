'use client';

import { useLocale } from '@/lib/localeContext';

/** Event the owner-reviews section listens for: opens its form and scrolls to it. */
export const OPEN_REVIEW_FORM_EVENT = 'open-review-form';

export function openReviewForm(rating?: number) {
  window.dispatchEvent(new CustomEvent(OPEN_REVIEW_FORM_EVENT, { detail: { rating } }));
}

const LABEL = { he: 'כתבו ביקורת', en: 'Write a review', ru: 'Написать отзыв' } as const;

/** Hero button next to Follow / Compare. */
export default function WriteReviewButton() {
  const { locale } = useLocale();
  return (
    <button
      type="button"
      onClick={() => openReviewForm()}
      style={{
        border: 0, background: '#f59e0b', color: '#1c1300',
        borderRadius: 10, padding: '8px 15px', fontSize: 13.5, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      }}
    >
      ✍️ {LABEL[locale] ?? LABEL.he}
    </button>
  );
}

'use client';

import { useState } from 'react';
import ReviewForm from '@/components/ReviewForm';
import type { Review } from '@/data/reviews';
import { useLocale } from '@/lib/localeContext';

interface Props {
  makeSlug: string;
  modelSlug: string;
  years: number[];
}

const STAR_LABELS_HE: Record<number, string> = { 1: 'גרוע', 2: 'לא מרוצה', 3: 'בסדר', 4: 'טוב', 5: 'מצוין' };
const STAR_LABELS_EN: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Okay', 4: 'Good', 5: 'Excellent' };

export default function ModelWriteReview({ makeSlug, modelSlug, years }: Props) {
  const { t, locale } = useLocale();
  const wr = t.writeReview;
  const isHe = locale === 'he';
  const [hovered, setHovered] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const handleSuccess = (_review: Review) => {
    setDone(true);
    setOpen(false);
    setSelectedRating(null);
  };

  const handleStarClick = (star: number) => {
    setSelectedRating(star);
    setOpen(true);
  };

  if (done) {
    return (
      <div className="card" style={{ padding: 20, textAlign: 'center', background: 'rgba(34,197,94,.05)', borderColor: 'rgba(34,197,94,.2)', marginBottom: 32 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
        <p style={{ fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>{wr.success}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{wr.successBody}</p>
        <button onClick={() => { setDone(false); }} className="btn btn-outline" style={{ marginTop: 12, fontSize: '0.875rem' }}>
          {wr.addAnother}
        </button>
      </div>
    );
  }

  const displayRating = hovered || selectedRating || 0;
  const starLabel = displayRating > 0 ? (isHe ? STAR_LABELS_HE[displayRating] : STAR_LABELS_EN[displayRating]) : (isHe ? 'דרגו את הרכב' : 'Rate this car');

  return (
    <div style={{ marginBottom: 32 }} id="write-review">
      {/* Stars first — always visible */}
      <div style={{ textAlign: 'center', marginBottom: open ? 20 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleStarClick(star)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px',
                fontSize: 36, lineHeight: 1,
                color: star <= displayRating ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.1s, transform 0.1s',
                transform: star <= displayRating ? 'scale(1.12)' : 'scale(1)',
              }}
            >
              ★
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: displayRating > 0 ? '#f59e0b' : 'var(--text-muted)', minHeight: 20 }}>
          {starLabel}
        </div>
      </div>

      {/* Form only after star click */}
      {open && selectedRating && (
        <div>
          <ReviewForm
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={years}
            initialRating={selectedRating}
            onSuccess={handleSuccess}
          />
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              className="btn btn-outline"
              onClick={() => { setOpen(false); setSelectedRating(null); }}
              style={{ fontSize: '0.8rem', height: 36, paddingInline: 16 }}
            >
              {wr.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

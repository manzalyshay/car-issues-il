'use client';

import { useState } from 'react';
import ReviewForm from '@/components/ReviewForm';
import type { Review } from '@/data/reviews';

interface Props {
  makeSlug: string;
  modelSlug: string;
  years: number[];
}

export default function ModelWriteReview({ makeSlug, modelSlug, years }: Props) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const handleSuccess = (_review: Review) => {
    setDone(true);
    setOpen(false);
  };

  if (done) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', background: 'rgba(34,197,94,.05)', borderColor: 'rgba(34,197,94,.2)', marginBottom: 48 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
        <p style={{ fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>תודה על הביקורת!</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>הביקורת שלך תופיע בדף שנת הייצור המתאימה.</p>
        <button onClick={() => { setDone(false); setOpen(true); }} className="btn btn-outline" style={{ marginTop: 12 }}>
          הוסף ביקורת נוספת
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 48 }}>
      {!open ? (
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setOpen(true)}
            style={{ height: 46, paddingInline: 32, fontSize: '1rem' }}
          >
            ✏️ כתוב ביקורת על הדגם
          </button>
        </div>
      ) : (
        <div>
          <ReviewForm
            makeSlug={makeSlug}
            modelSlug={modelSlug}
            years={years}
            onSuccess={handleSuccess}
          />
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              className="btn btn-outline"
              onClick={() => setOpen(false)}
              style={{ fontSize: '0.875rem' }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

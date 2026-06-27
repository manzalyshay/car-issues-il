'use client';

import { useLocale } from '@/lib/localeContext';

interface Props { makeNameHe: string; modelNameHe: string; makeNameEn?: string; modelNameEn?: string }

export default function FirstReviewCta({ makeNameHe, modelNameHe, makeNameEn, modelNameEn }: Props) {
  const { t, locale } = useLocale();
  const rf = t.firstReviewCta;
  const carName = locale === 'en' ? `${makeNameEn ?? makeNameHe} ${modelNameEn ?? modelNameHe}` : `${makeNameHe} ${modelNameHe}`;
  const handleClick = () => {
    document.getElementById('open-review-form')?.click();
    setTimeout(() => {
      document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flex: 1 }}>
        {locale === 'en' ? `No reviews yet — be the first to rate ${carName}` : `אין עדיין ביקורות — היה הראשון לדרג את ${carName}`}
      </span>
      <button onClick={handleClick} className="btn btn-primary" style={{ height: 32, padding: '0 14px', fontSize: '0.8rem', flexShrink: 0 }}>
        {rf.cta}
      </button>
    </div>
  );
}

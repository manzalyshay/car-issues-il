'use client';

interface Props { makeNameHe: string; modelNameHe: string }

export default function FirstReviewCta({ makeNameHe, modelNameHe }: Props) {
  const handleClick = () => {
    document.getElementById('open-review-form')?.click();
    setTimeout(() => {
      document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="card" style={{ marginBottom: 28, padding: '24px 28px', background: 'linear-gradient(135deg, rgba(230,57,70,0.12) 0%, rgba(230,57,70,0.04) 100%)', border: '1px solid rgba(230,57,70,0.25)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 40, flexShrink: 0 }}>⭐</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>
          היה הראשון לדרג את {makeNameHe} {modelNameHe}!
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          אין עדיין ביקורות לדגם הזה. הניסיון שלך יעזור לאלפי בעלי רכב בישראל.
        </div>
      </div>
      <button
        onClick={handleClick}
        className="btn btn-primary"
        style={{ height: 42, padding: '0 24px', fontSize: '0.9rem', flexShrink: 0 }}
      >
        ✏️ כתוב ביקורת
      </button>
    </div>
  );
}

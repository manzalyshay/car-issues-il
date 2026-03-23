'use client';

interface StarRatingProps {
  rating: number;   // 1-5
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (val: number) => void;
}

export default function StarRating({ rating, max = 5, size = 18, interactive = false, onChange }: StarRatingProps) {
  return (
    <div style={{ display: 'flex', gap: 2, direction: 'ltr' }}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: interactive ? 'pointer' : 'default',
              color: filled ? '#f4a261' : 'var(--border-strong)',
              fontSize: size,
              lineHeight: 1,
              transition: 'color 0.15s',
            }}
            onMouseEnter={interactive ? (e) => {
              const stars = (e.currentTarget.parentElement?.children ?? []);
              for (let j = 0; j <= i; j++) (stars[j] as HTMLElement).style.color = '#f4a261';
              for (let j = i + 1; j < max; j++) (stars[j] as HTMLElement).style.color = 'var(--border-strong)';
            } : undefined}
            onMouseLeave={interactive ? (e) => {
              const stars = (e.currentTarget.parentElement?.children ?? []);
              for (let j = 0; j < max; j++) {
                (stars[j] as HTMLElement).style.color = j < Math.round(rating) ? '#f4a261' : 'var(--border-strong)';
              }
            } : undefined}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

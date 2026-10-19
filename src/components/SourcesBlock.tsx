import type { ExpertReview } from '@/lib/expertReviews';

interface Props {
  expertReview: ExpertReview | null;
  isEn: boolean;
}

export default function SourcesBlock({ expertReview, isEn }: Props) {
  const sources = expertReview?.sourcesList ?? [];
  if (!sources.length) return null;

  return (
    <section style={{ marginTop: 32 }}>
      <details style={{
        background: '#fff', border: '1px solid #e3e8ee', borderRadius: 14,
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <summary style={{
          padding: '12px clamp(16px,3vw,24px)',
          cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: '#1c2733',
          listStyle: 'none', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 10, userSelect: 'none',
          background: '#f8fafc',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>📎</span>
            {isEn ? 'Sources' : 'מקורות'}
            <span style={{ fontSize: 11, color: '#8595a6', fontWeight: 500 }}>({sources.length})</span>
          </span>
          <span style={{ fontSize: 16, color: '#8595a6', fontWeight: 400 }}>▾</span>
        </summary>
        <div style={{ padding: '10px clamp(16px,3vw,24px) 16px' }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sources.map((s, i) => (
              <li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    style={{ color: '#1b4f8a', textDecoration: 'none' }}
                  >
                    {s.title || s.url}
                  </a>
                ) : (
                  <span style={{ color: '#4a5b6d' }}>{s.title}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}

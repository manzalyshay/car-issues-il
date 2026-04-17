import type { ExpertReview, SourceBreakdown } from '@/lib/expertReviews';

interface Props {
  review: ExpertReview | null;
  makeNameHe: string;
  modelNameHe: string;
  year?: number;
  isYearSpecific?: boolean;
  userAvgRating?: number | null;
  userReviewCount?: number;
  inline?: boolean;
}

const NO_DATA_PHRASES = [
  'אין מספיק', 'לא הביעו דעות', 'לא ניתן להסיק', 'אין מידע',
  'לא נמצא', 'מידע מוגבל', 'מוגבל ולא', 'אין ביקורות',
  'לא נמצאו', 'לא קיים מידע', 'לא ניתן', 'אין תוצאות',
  'לא נאספו', 'לא ידוע', 'לא נסקר',
];
const noData = (s: string | null | undefined) =>
  !s || s.trim().length < 40 || NO_DATA_PHRASES.some(p => s.includes(p));

function scoreColor(score: number) {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#f59e0b';
  return '#ef4444';
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const pct = score / 10;
  const color = scoreColor(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth={3.5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={3.5}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 900, color, lineHeight: 1 }}>{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

function SourceRow({ item }: { item: SourceBreakdown }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 10,
      background: 'var(--bg-muted)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* flag accent strip */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 3,
        background: item.flag === '🇮🇱' ? '#3b82f6' : '#8b5cf6',
        borderRadius: '0 10px 10px 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem' }}>{item.flag}</span>
        <span style={{
          fontSize: '0.75rem', fontWeight: 800,
          color: item.flag === '🇮🇱' ? '#3b82f6' : '#8b5cf6',
        }}>
          {item.source}
        </span>
        <span style={{
          fontSize: '0.67rem', fontWeight: 700,
          color: 'var(--text-muted)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '1px 7px', borderRadius: 99,
        }}>
          {item.postCount} דיונים
        </span>
        {item.score != null && (
          <span style={{
            marginRight: 'auto',
            fontSize: '0.85rem', fontWeight: 900,
            color: scoreColor(item.score),
          }}>
            {item.score.toFixed(1)}<span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--text-muted)' }}>/10</span>
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
        {item.summary}
      </p>
    </div>
  );
}

export default function ExpertReviewsSection({
  review, makeNameHe, modelNameHe, year, isYearSpecific, userAvgRating, userReviewCount, inline,
}: Props) {
  if (!review) return null;

  const localSummary  = noData(review.localSummaryHe)  ? null : review.localSummaryHe!;
  const globalSummary = noData(review.globalSummaryHe) ? null : review.globalSummaryHe!;
  const fallback      = !localSummary && !globalSummary && !noData(review.summaryHe) ? review.summaryHe : null;

  const hasPerSource = review.sourcesBreakdown && review.sourcesBreakdown.length > 0;
  const hasContent = hasPerSource || localSummary || globalSummary || fallback || review.pros.length > 0 || review.cons.length > 0;
  if (!hasContent) return null;

  const localScore  = review.localScore  != null && localSummary  ? review.localScore  : null;
  const globalScore = review.globalScore != null && globalSummary ? review.globalScore : null;
  const userScore   = userAvgRating != null && userAvgRating > 0 ? userAvgRating * 2 : null;

  const scoreInputs = hasPerSource
    ? [
        ...review.sourcesBreakdown.map(s => s.score).filter((s): s is number => s != null),
        ...(userScore != null ? [userScore] : []),
      ]
    : [localScore, globalScore, userScore].filter((s): s is number => s != null);

  const combined = scoreInputs.length > 0
    ? scoreInputs.reduce((a, b) => a + b, 0) / scoreInputs.length
    : (fallback ? review.topScore : null);

  const totalPosts = (review.localPostCount ?? 0) + (review.globalPostCount ?? 0);
  const isKnowledge = totalPosts === 0 && !hasPerSource;

  const title = year
    ? `מה אומרים הבעלים — ${makeNameHe} ${modelNameHe} ${year}`
    : `מה אומרים הבעלים — ${makeNameHe} ${modelNameHe}`;

  const badge = isYearSpecific === false && year
    ? 'סיכום כללי'
    : isKnowledge
      ? 'AI ידע'
      : hasPerSource
        ? `AI · ${review.sourcesBreakdown.reduce((s, b) => s + b.postCount, 0)} דיונים`
        : `AI · ${totalPosts} דיונים`;

  const wrapperStyle = inline
    ? { padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' as const }
    : { padding: 0, overflow: 'hidden' };

  const footerStyle = inline
    ? { fontSize: '0.68rem', color: 'var(--text-muted)', padding: '4px 16px 12px', margin: 0 }
    : { fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6, paddingRight: 4 };

  const inner = (
    <>
    <div className={inline ? undefined : 'card'} style={wrapperStyle}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(230,57,70,0.04) 0%, transparent 60%)',
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
                color: 'var(--text-muted)', background: 'var(--bg-muted)',
                padding: '2px 8px', borderRadius: 99, border: '1px solid var(--border)',
              }}>
                {badge}
              </span>
              {userScore != null && userReviewCount && userReviewCount > 0 && (
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700,
                  color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  ⭐ {userReviewCount} ביקורות משתמשים · {userScore.toFixed(1)}/10
                </span>
              )}
            </div>
          </div>
          {combined != null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <ScoreRing score={combined} size={56} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ציון כולל</span>
            </div>
          )}
        </div>

        {/* Per-source rows (new) OR local/global fallback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>
          {hasPerSource ? (
            review.sourcesBreakdown.map((item, i) => (
              <SourceRow key={i} item={item} />
            ))
          ) : (
            <>
              {localSummary && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, background: 'var(--bg-muted)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: '#3b82f6', borderRadius: '0 10px 10px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem' }}>🇮🇱</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6' }}>ביקורות ישראליות</span>
                    {review.localPostCount > 0 && <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 99 }}>{review.localPostCount} דיונים</span>}
                    {localScore != null && <span style={{ marginRight: 'auto', fontSize: '0.85rem', fontWeight: 900, color: scoreColor(localScore) }}>{localScore.toFixed(1)}<span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--text-muted)' }}>/10</span></span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>{localSummary}</p>
                </div>
              )}
              {globalSummary && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, background: 'var(--bg-muted)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: '#8b5cf6', borderRadius: '0 10px 10px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem' }}>🌍</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5cf6' }}>ביקורות בינלאומיות</span>
                    {review.globalPostCount > 0 && <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 99 }}>{review.globalPostCount} דיונים</span>}
                    {globalScore != null && <span style={{ marginRight: 'auto', fontSize: '0.85rem', fontWeight: 900, color: scoreColor(globalScore) }}>{globalScore.toFixed(1)}<span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--text-muted)' }}>/10</span></span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>{globalSummary}</p>
                </div>
              )}
              {fallback && !localSummary && !globalSummary && (
                <p style={{ margin: 0, padding: '10px 4px', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{fallback}</p>
              )}
            </>
          )}
        </div>

        {/* Pros / Cons chips */}
        {(review.pros.length > 0 || review.cons.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px 16px', borderTop: '1px solid var(--border)' }}>
            {review.pros.map((p, i) => (
              <span key={`pro-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#16a34a', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', padding: '4px 10px', borderRadius: 99 }}>
                <span style={{ fontSize: '0.65rem' }}>✓</span>{p}
              </span>
            ))}
            {review.cons.map((c, i) => (
              <span key={`con-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-red)', background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.18)', padding: '4px 10px', borderRadius: 99 }}>
                <span style={{ fontSize: '0.65rem' }}>✗</span>{c}
              </span>
            ))}
          </div>
        )}
      </div>

      <p style={footerStyle}>
        AI סיכם ביקורות ודיונים אמיתיים של בעלי רכבים מפורומים ואתרי ביקורות.
      </p>
    </>
  );

  if (inline) return inner;

  return (
    <section style={{ marginBottom: 32 }}>
      {inner}
    </section>
  );
}

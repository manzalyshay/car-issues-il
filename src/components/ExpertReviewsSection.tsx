import type { ExpertReview } from '@/lib/expertReviews';

interface Props {
  review: ExpertReview | null;
  makeNameHe: string;
  modelNameHe: string;
  year?: number;
  isYearSpecific?: boolean;
  /** Average user rating on 1–5 scale — normalized to /10 for combined score */
  userAvgRating?: number | null;
  userReviewCount?: number;
}

interface ScoreBadgeProps {
  label: string;
  score: number;
  color: string;
  size?: 'large' | 'small';
}

function ScoreBadge({ label, score, color, size = 'small' }: ScoreBadgeProps) {
  const pct = Math.round((score / 10) * 100);
  const isLarge = size === 'large';
  return (
    <div style={{ textAlign: 'center', flex: isLarge ? 'none' : '1 1 90px' }}>
      <div style={{
        fontSize: isLarge ? '2.75rem' : '1.625rem',
        fontWeight: 900,
        color,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {score.toFixed(1)}
      </div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: isLarge ? 8 : 5 }}>/10</div>
      <div style={{
        height: isLarge ? 5 : 4,
        background: 'var(--bg-muted)',
        borderRadius: 9999,
        overflow: 'hidden',
        width: isLarge ? 80 : '100%',
        margin: `0 auto ${isLarge ? 8 : 5}px`,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: 9999, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <div style={{
        fontSize: isLarge ? '0.875rem' : '0.75rem',
        fontWeight: 700,
        color: isLarge ? color : 'var(--text-secondary)',
      }}>
        {label}
      </div>
    </div>
  );
}

export default function ExpertReviewsSection({
  review, makeNameHe, modelNameHe, year, isYearSpecific, userAvgRating, userReviewCount,
}: Props) {
  if (!review) return null;

  // Filter out "no data" hedging strings
  const NO_DATA_PHRASES = [
    'אין מספיק', 'לא הביעו דעות', 'לא ניתן להסיק', 'אין מידע',
    'לא נמצא', 'מידע מוגבל', 'מוגבל ולא', 'אין ביקורות',
    'לא נמצאו', 'לא קיים מידע', 'לא ניתן', 'אין תוצאות',
    'לא נאספו', 'לא ידוע', 'לא נסקר',
  ];
  const noData = (s: string | null | undefined) =>
    !s || s.trim().length < 40 || NO_DATA_PHRASES.some((p) => s.includes(p));

  const localSummary   = noData(review.localSummaryHe)  ? null : review.localSummaryHe!;
  const globalSummary  = noData(review.globalSummaryHe) ? null : review.globalSummaryHe!;
  const fallbackSummary = (!localSummary && !globalSummary && !noData(review.summaryHe))
    ? review.summaryHe : null;

  const hasContent = localSummary || globalSummary || fallbackSummary
    || review.pros.length > 0 || review.cons.length > 0;
  if (!hasContent) return null;

  // ── Score computation ──────────────────────────────────────────────────────
  // Only show localScore when there's actual Israeli summary content to back it up
  const localScore  = review.localScore  != null && localSummary  ? review.localScore  : null;
  const globalScore = review.globalScore != null && globalSummary ? review.globalScore : null;

  // User reviews: normalize 1–5 → 1–10
  const userScore = userAvgRating != null && userAvgRating > 0 ? userAvgRating * 2 : null;

  // Combined top score = average of all available sources
  const scoreInputs = [localScore, globalScore, userScore].filter((s): s is number => s != null);
  const combinedScore = scoreInputs.length > 0
    ? scoreInputs.reduce((a, b) => a + b, 0) / scoreInputs.length
    : (fallbackSummary ? review.topScore : null);

  const totalPosts = (review.localPostCount ?? 0) + (review.globalPostCount ?? 0);

  return (
    <section style={{ marginBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--brand-red)', flexShrink: 0 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
          {year
            ? `מה אומרים הבעלים — ${makeNameHe} ${modelNameHe} ${year}`
            : `מה אומרים הבעלים — ${makeNameHe} ${modelNameHe}`}
        </h2>
        <span style={{
          fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-muted)',
          padding: '2px 10px', borderRadius: 999,
        }}>
          {isYearSpecific === false && year
            ? 'סיכום כללי לדגם · AI'
            : totalPosts > 0
              ? `AI סיכם ${totalPosts} דיונים`
              : 'סיכום AI'}
        </span>
      </div>

      <div className="card" style={{ padding: '28px' }}>

        {/* ── Top combined score ───────────────────────────────────────────── */}
        {combinedScore != null && (
          <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
            {/* Big score */}
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                ציון כולל
              </div>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--brand-red)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {combinedScore.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>/10</div>
              {/* Score bar */}
              <div style={{ width: 120, height: 6, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden', marginTop: 4 }}>
                <div style={{
                  width: `${Math.round((combinedScore / 10) * 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, var(--brand-red-dark), var(--brand-red))`,
                  borderRadius: 9999,
                  transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>

            {/* Sub-scores row — only shown when we have real scored sources */}
            {(localScore != null || globalScore != null || userScore != null) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 20, flexWrap: 'wrap' }}>
                {localScore != null && (
                  <ScoreBadge label="🇮🇱 ישראל" score={localScore} color="#3b82f6" />
                )}
                {globalScore != null && (
                  <ScoreBadge label="🌍 בינלאומי" score={globalScore} color="#8b5cf6" />
                )}
                {userScore != null && (
                  <ScoreBadge
                    label={`⭐ משתמשים${userReviewCount ? ` (${userReviewCount})` : ''}`}
                    score={userScore}
                    color="#f59e0b"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Summaries ────────────────────────────────────────────────────── */}
        {(localSummary || globalSummary) ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: localSummary && globalSummary ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr',
            gap: 16,
            marginBottom: 20,
          }}>
            {localSummary && (
              <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 10, padding: '14px 16px', borderRight: '3px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
                    🇮🇱 ביקורות ישראליות{review.localPostCount ? ` · ${review.localPostCount} דיונים` : ''}
                  </div>
                  {localScore != null && (
                    <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#3b82f6' }}>
                      {localScore.toFixed(1)}/10
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                  {localSummary}
                </p>
              </div>
            )}
            {globalSummary && (
              <div style={{ background: 'rgba(139,92,246,0.06)', borderRadius: 10, padding: '14px 16px', borderRight: '3px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6' }}>
                    🌍 ביקורות בינלאומיות{review.globalPostCount ? ` · ${review.globalPostCount} דיונים` : ''}
                  </div>
                  {globalScore != null && (
                    <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#8b5cf6' }}>
                      {globalScore.toFixed(1)}/10
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                  {globalSummary}
                </p>
              </div>
            )}
          </div>
        ) : fallbackSummary ? (
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: 20 }}>
            {fallbackSummary}
          </p>
        ) : null}

        {/* ── Pros / Cons ──────────────────────────────────────────────────── */}
        {(review.pros.length > 0 || review.cons.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 4 }}>
            {review.pros.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>✓ יתרונות</div>
                <ul style={{ margin: 0, paddingRight: 16 }}>
                  {review.pros.map((p, i) => (
                    <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.cons.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand-red)', marginBottom: 8 }}>✗ חסרונות</div>
                <ul style={{ margin: 0, paddingRight: 16 }}>
                  {review.cons.map((c, i) => (
                    <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
        AI סיכם ביקורות ודיונים של בעלי רכבים מפורומים ואתרי ביקורות. הסיכום מבוסס על דעות אמיתיות של גולשים.
      </p>
    </section>
  );
}

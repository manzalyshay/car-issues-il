import type { ExpertReview } from '@/lib/expertReviews';

interface Props {
  review: ExpertReview | null;
  makeNameHe: string;
  modelNameHe: string;
  year?: number;
  isYearSpecific?: boolean;
}

function ScoreBadge({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.round((score / 10) * 100);
  return (
    <div style={{ textAlign: 'center', flex: '1 1 100px' }}>
      <div style={{ fontSize: '1.875rem', fontWeight: 900, color, lineHeight: 1 }}>
        {score.toFixed(1)}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>/10</div>
      <div style={{ height: 4, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}

export default function ExpertReviewsSection({ review, makeNameHe, modelNameHe, year, isYearSpecific }: Props) {
  if (!review) return null;

  // Filter out any "no data" / hedging strings before rendering
  const NO_DATA_PHRASES = [
    'אין מספיק', 'לא הביעו דעות', 'לא ניתן להסיק', 'אין מידע',
    'לא נמצא', 'מידע מוגבל', 'מוגבל ולא', 'אין ביקורות',
    'לא נמצאו', 'לא קיים מידע', 'לא ניתן', 'אין תוצאות',
    'לא נאספו', 'לא ידוע', 'לא נסקר',
  ];
  const noData = (s: string | null | undefined) =>
    !s || s.trim().length < 40 || NO_DATA_PHRASES.some((p) => s.includes(p));

  const localSummary  = noData(review.localSummaryHe)  ? null : review.localSummaryHe!;
  const globalSummary = noData(review.globalSummaryHe) ? null : review.globalSummaryHe!;
  const fallbackSummary = (!localSummary && !globalSummary && !noData(review.summaryHe))
    ? review.summaryHe
    : null;

  // Don't render the section at all if there's truly nothing useful
  const hasContent = localSummary || globalSummary || fallbackSummary || review.pros.length > 0 || review.cons.length > 0;
  if (!hasContent) return null;

  // Only show a score if we also have real summary content for that scope
  const hasLocalScore  = review.localScore  != null && localSummary  != null;
  const hasGlobalScore = review.globalScore != null && globalSummary != null;
  const hasTopScore    = review.topScore    != null && (localSummary != null || globalSummary != null);
  const hasAnyScore    = hasLocalScore || hasGlobalScore || hasTopScore;

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
            : `AI סיכם ${totalPosts} דיונים`}
        </span>
      </div>

      <div className="card" style={{ padding: '24px 28px' }}>
        {/* Score bars — only when real scores exist */}
        {hasAnyScore && (
          <div style={{ display: 'flex', gap: 24, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)', justifyContent: 'center', flexWrap: 'wrap' }}>
            {hasLocalScore && (
              <ScoreBadge label="ישראל 🇮🇱" score={review.localScore!} color="#3b82f6" />
            )}
            {hasTopScore && (
              <ScoreBadge label="ציון כולל ⭐" score={review.topScore!} color="var(--brand-red)" />
            )}
            {hasGlobalScore && (
              <ScoreBadge label="בינלאומי 🌍" score={review.globalScore!} color="#8b5cf6" />
            )}
          </div>
        )}

        {/* Summaries */}
        {(localSummary || globalSummary) ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: localSummary && globalSummary ? '1fr 1fr' : '1fr',
            gap: 20,
            marginBottom: 20,
          }}>
            {localSummary && (
              <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 10, padding: '14px 16px', borderRight: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>
                  🇮🇱 ביקורות ישראליות{review.localPostCount ? ` · ${review.localPostCount} דיונים` : ''}
                </div>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
                  {localSummary}
                </p>
              </div>
            )}
            {globalSummary && (
              <div style={{ background: 'rgba(139,92,246,0.06)', borderRadius: 10, padding: '14px 16px', borderRight: '3px solid #8b5cf6' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', marginBottom: 8 }}>
                  🌍 ביקורות בינלאומיות{review.globalPostCount ? ` · ${review.globalPostCount} דיונים` : ''}
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

        {/* Pros / Cons */}
        {(review.pros.length > 0 || review.cons.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
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

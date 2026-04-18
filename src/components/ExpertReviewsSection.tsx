'use client';

import { useState } from 'react';
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
  if (score >= 8) return '#16a34a';
  if (score >= 6) return '#d97706';
  return '#dc2626';
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const pct = score / 10;
  const color = scoreColor(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.27, fontWeight: 900, color, lineHeight: 1 }}>{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

const IL_KEYWORDS = ['ישראל', 'טפוז', 'carzone', 'drive.co.il', 'icar', 'פייסבוק'];
function resolveFlag(item: SourceBreakdown): string {
  const lower = (item.source + (item.flag ?? '')).toLowerCase();
  return IL_KEYWORDS.some(k => lower.includes(k)) ? '🇮🇱' : '🌍';
}

// Compact source card — tight padding, inline score
function SourceCard({ item, accent }: { item: SourceBreakdown; accent: string }) {
  const flag = resolveFlag(item);
  const score = item.score;
  return (
    <div style={{
      padding: '9px 12px 9px 14px',
      borderRadius: 8,
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRight: `3px solid ${accent}`,
      position: 'relative',
    }}>
      {/* Top row: source name + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem', lineHeight: 1 }}>{flag}</span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 800,
            color: accent,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '0.01em',
          }}>
            {item.source}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {item.postCount > 0 && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700,
              color: 'var(--text-muted)',
              background: 'var(--bg-muted)',
              padding: '1px 5px', borderRadius: 99,
              border: '1px solid var(--border)',
              whiteSpace: 'nowrap',
            }}>
              {item.postCount} דיונים
            </span>
          )}
          {score != null && (
            <span style={{
              fontSize: '0.8rem', fontWeight: 900,
              color: scoreColor(score),
              letterSpacing: '-0.02em',
            }}>
              {score.toFixed(1)}<span style={{ fontSize: '0.55rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: 0 }}>/10</span>
            </span>
          )}
        </div>
      </div>
      {/* Summary */}
      <p style={{
        margin: 0,
        fontSize: '0.78rem',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
      }}>
        {item.summary}
      </p>
    </div>
  );
}

// Mobile show-count: show first N cards, rest behind "show more" (mobile only)
const MOBILE_SHOW = 2;

// Section group with per-card mobile collapse
function SourceGroup({
  sources,
  label,
  accent,
  bgAccent,
}: {
  sources: SourceBreakdown[];
  label: string;
  accent: string;
  bgAccent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;
  const totalPosts = sources.reduce((s, b) => s + b.postCount, 0);
  const scores = sources.map(s => s.score).filter((s): s is number => s != null);
  const groupAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const hiddenCount = Math.max(0, sources.length - MOBILE_SHOW);

  return (
    <div>
      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px',
        background: bgAccent,
        borderTop: `1px solid ${accent}22`,
        borderBottom: `1px solid ${accent}22`,
        marginBottom: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 2.5, height: 14, background: accent, borderRadius: 2, flexShrink: 0 }} />
          <span style={{
            fontSize: '0.67rem', fontWeight: 900,
            color: accent,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {label}
          </span>
          <span style={{
            fontSize: '0.6rem', fontWeight: 600,
            color: accent + 'aa',
          }}>
            {sources.length} מקורות{totalPosts > 0 ? ` · ${totalPosts} דיונים` : ''}
          </span>
        </div>
        {groupAvg != null && (
          <span style={{
            fontSize: '0.75rem', fontWeight: 900,
            color: scoreColor(groupAvg),
            letterSpacing: '-0.02em',
          }}>
            {groupAvg.toFixed(1)}<span style={{ fontSize: '0.55rem', fontWeight: 500, color: 'var(--text-muted)' }}>/10</span>
          </span>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 10px 10px' }}>
        {/* Always-visible first cards */}
        {sources.slice(0, MOBILE_SHOW).map((item, i) => (
          <SourceCard key={i} item={item} accent={accent} />
        ))}

        {/* Extra cards — hidden on mobile until expanded; always visible on desktop via CSS */}
        {sources.length > MOBILE_SHOW && (
          <div className={expanded ? 'ers-extra-expanded' : 'ers-extra-collapsed'}>
            {sources.slice(MOBILE_SHOW).map((item, i) => (
              <SourceCard key={i + MOBILE_SHOW} item={item} accent={accent} />
            ))}
          </div>
        )}

        {/* Show-more button — mobile only, disappears on desktop via CSS */}
        {hiddenCount > 0 && !expanded && (
          <button
            className="ers-show-more"
            onClick={() => setExpanded(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              width: '100%',
              padding: '6px 12px',
              background: 'transparent',
              border: `1px dashed ${accent}55`,
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: accent,
              letterSpacing: '0.02em',
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              background: `${accent}15`, fontSize: '0.6rem', fontWeight: 900,
            }}>+{hiddenCount}</span>
            עוד מקורות ↓
          </button>
        )}
      </div>
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

  // Split sources into local / global groups
  const localSources  = hasPerSource ? review.sourcesBreakdown.filter(s => resolveFlag(s) === '🇮🇱') : [];
  const globalSources = hasPerSource ? review.sourcesBreakdown.filter(s => resolveFlag(s) === '🌍')  : [];

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
    ? `${makeNameHe} ${modelNameHe} ${year}`
    : `${makeNameHe} ${modelNameHe}`;

  const perSourceTotal = hasPerSource ? review.sourcesBreakdown.reduce((s, b) => s + b.postCount, 0) : 0;

  const badge = isYearSpecific === false && year
    ? 'סיכום כללי'
    : isKnowledge
      ? 'AI ידע'
      : hasPerSource
        ? `AI · ${perSourceTotal > 0 ? `${perSourceTotal} דיונים` : `${review.sourcesBreakdown.length} מקורות`}`
        : `AI · ${totalPosts} דיונים`;

  const wrapperStyle = inline
    ? { overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' as const, background: 'var(--bg-card)' }
    : { overflow: 'hidden', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 32 };

  const footerStyle = inline
    ? { fontSize: '0.62rem', color: 'var(--text-muted)', padding: '5px 14px 10px', margin: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-muted)' }
    : { fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6, paddingRight: 4 };

  const inner = (
    <>
      {/* CSS for mobile-only collapse behaviour */}
      <style>{`
        /* Extra source cards: hidden on mobile by default */
        .ers-extra-collapsed { display: none; flex-direction: column; gap: 5px; }
        .ers-extra-expanded  { display: flex; flex-direction: column; gap: 5px; }
        /* Show-more button: hidden on desktop */
        @media (min-width: 641px) {
          .ers-show-more { display: none !important; }
          .ers-extra-collapsed { display: flex !important; }
        }
        @media (max-width: 640px) {
          .ers-show-more { display: flex; }
        }
      `}</style>

      <div style={wrapperStyle}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: '13px 16px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(230,57,70,0.035) 0%, transparent 55%)',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em',
              color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 3,
            }}>
              מה אומרים הבעלים
            </div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, lineHeight: 1.25, color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em',
                color: 'var(--text-muted)', background: 'var(--bg-muted)',
                padding: '1px 7px', borderRadius: 99, border: '1px solid var(--border)',
              }}>
                {badge}
              </span>
              {userScore != null && userReviewCount && userReviewCount > 0 && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700,
                  color: '#d97706', background: 'rgba(217,119,6,0.08)',
                  padding: '1px 7px', borderRadius: 99,
                }}>
                  ⭐ {userReviewCount} ביקורות · {userScore.toFixed(1)}/10
                </span>
              )}
            </div>
          </div>
          {combined != null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <ScoreRing score={combined} size={50} />
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ציון כולל</span>
            </div>
          )}
        </div>

        {/* ── Sources body (scrollable in inline mode) ── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>

          {hasPerSource ? (
            <>
              {/* 🇮🇱 Israeli group */}
              {localSources.length > 0 && (
                <SourceGroup
                  sources={localSources}
                  label="ביקורות ישראליות"
                  accent="#3b82f6"
                  bgAccent="rgba(59,130,246,0.04)"
                />
              )}

              {/* Divider between groups */}
              {localSources.length > 0 && globalSources.length > 0 && (
                <div style={{ margin: '0 12px', borderTop: '1px dashed var(--border)' }} />
              )}

              {/* 🌍 Global group — always shown */}
              {globalSources.length > 0 && (
                <SourceGroup
                  sources={globalSources}
                  label="ביקורות בינלאומיות"
                  accent="#8b5cf6"
                  bgAccent="rgba(139,92,246,0.04)"
                />
              )}
            </>
          ) : (
            /* Fallback: legacy local/global summaries */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px' }}>
              {localSummary && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRight: '3px solid #3b82f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: '0.75rem' }}>🇮🇱</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.04em' }}>ביקורות ישראליות</span>
                    {review.localPostCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 99, border: '1px solid var(--border)' }}>{review.localPostCount} דיונים</span>}
                    {localScore != null && <span style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 900, color: scoreColor(localScore) }}>{localScore.toFixed(1)}<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/10</span></span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{localSummary}</p>
                </div>
              )}
              {globalSummary && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRight: '3px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: '0.75rem' }}>🌍</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6', letterSpacing: '0.04em' }}>ביקורות בינלאומיות</span>
                    {review.globalPostCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 99, border: '1px solid var(--border)' }}>{review.globalPostCount} דיונים</span>}
                    {globalScore != null && <span style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 900, color: scoreColor(globalScore) }}>{globalScore.toFixed(1)}<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/10</span></span>}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{globalSummary}</p>
                </div>
              )}
              {fallback && !localSummary && !globalSummary && (
                <p style={{ margin: 0, padding: '8px 4px', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{fallback}</p>
              )}
            </div>
          )}

          {/* ── Pros / Cons — always visible ── */}
          {(review.pros.length > 0 || review.cons.length > 0) && (
            <div style={{
              borderTop: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: review.pros.length > 0 && review.cons.length > 0 ? '1fr 1fr' : '1fr',
              marginTop: 'auto',
            }}>
              {review.pros.length > 0 && (
                <div style={{
                  padding: '9px 12px 12px',
                  borderLeft: review.cons.length > 0 ? '1px solid var(--border)' : 'none',
                  background: 'rgba(22,163,74,0.02)',
                }}>
                  <div style={{
                    fontSize: '0.58rem', fontWeight: 900,
                    color: '#16a34a', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ display: 'inline-block', width: 10, height: 2, background: '#16a34a', borderRadius: 1 }} />
                    יתרונות
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {review.pros.map((p, i) => (
                      <div key={`pro-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.73rem', fontWeight: 600, color: '#15803d', lineHeight: 1.4 }}>
                        <span style={{ flexShrink: 0, marginTop: 1, fontWeight: 900 }}>✓</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {review.cons.length > 0 && (
                <div style={{
                  padding: '9px 12px 12px',
                  background: 'rgba(220,38,38,0.02)',
                }}>
                  <div style={{
                    fontSize: '0.58rem', fontWeight: 900,
                    color: '#dc2626', letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ display: 'inline-block', width: 10, height: 2, background: '#dc2626', borderRadius: 1 }} />
                    חסרונות
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {review.cons.map((c, i) => (
                      <div key={`con-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.73rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.4 }}>
                        <span style={{ flexShrink: 0, marginTop: 1, fontWeight: 900 }}>✗</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={footerStyle}>
          AI סיכם ביקורות ודיונים אמיתיים של בעלי רכבים מפורומים ואתרי ביקורות.
        </p>

      </div>
    </>
  );

  if (inline) return inner;

  return (
    <section style={{ marginBottom: 32 }}>
      {inner}
    </section>
  );
}

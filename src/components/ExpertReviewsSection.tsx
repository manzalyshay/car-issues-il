'use client';

import { useState } from 'react';
import type { ExpertReview, SourceBreakdown } from '@/lib/expertReviews';
import { useLocale } from '@/lib/localeContext';

interface Props {
  review: ExpertReview | null;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn?: string;
  modelNameEn?: string;
  year?: number;
  isYearSpecific?: boolean;
  userAvgRating?: number | null;
  userReviewCount?: number;
  inline?: boolean;
  label?: string;
  hideTitle?: boolean;
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

// Maps fully-Hebrew source names to their English equivalents
const HEBREW_SOURCE_EN: Record<string, string> = {
  'פורום טפוז מכוניות': 'Tapuz Car Forum',
  'פורום טפוז': 'Tapuz Car Forum',
  'טפוז': 'Tapuz Car Forum',
  'פייסבוק': 'Facebook',
  'iCar מבחני רכב': 'iCar Car Tests',
  'Drive.co.il מגזין רכב': 'Drive.co.il Magazine',
  'CarZone ביקורות גולשים': 'CarZone User Reviews',
};
function cleanSourceName(name: string): string {
  if (HEBREW_SOURCE_EN[name]) return HEBREW_SOURCE_EN[name];
  const stripped = name.replace(/[\u0590-\u05FF]+/g, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  return stripped || '';
}

function hasHebrew(s: string | null | undefined): boolean {
  return !!(s && /[\u0590-\u05FF]/.test(s));
}

// Compact source card — score always visible, summary collapsible
function SourceCard({ item, accent, translatedSummary }: { item: SourceBreakdown; accent: string; translatedSummary?: string }) {
  const [open, setOpen] = useState(false);
  const { t, locale } = useLocale();
  const er = t.expertReview;
  const flag = resolveFlag(item);
  const score = item.score;
  const enName = cleanSourceName(item.source);
  // On EN site, skip cards where we have no usable English source name
  if (locale === 'en' && !enName) return null;
  const translatedOk = translatedSummary !== undefined && !hasHebrew(translatedSummary);
  const summaryText = locale === 'en'
    ? (translatedOk ? (translatedSummary ?? '') : '')
    : (item.summary ?? '');
  const hasSummary = !!(summaryText && summaryText.trim().length > 10);
  return (
    <div style={{
      borderRadius: 8,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRight: `3px solid ${accent}`,
      overflow: 'hidden',
    }}>
      {/* Score row — always visible */}
      <button
        onClick={() => hasSummary && setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', border: 'none', background: 'transparent',
          cursor: hasSummary ? 'pointer' : 'default',
          textAlign: 'start', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '0.72rem', lineHeight: 1 }}>{flag}</span>
        <span style={{
          flex: 1, fontSize: '0.78rem', fontWeight: 800, color: accent,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em',
        }}>
          {locale === 'en' ? enName : item.source}
        </span>
        {item.postCount > 0 && (
          <span style={{
            fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
            background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 99,
            border: '1px solid var(--border)', whiteSpace: 'nowrap',
          }}>
            {item.postCount} {er.discussions}
          </span>
        )}
        {score != null && (
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: scoreColor(score), letterSpacing: '-0.02em' }}>
            {score.toFixed(1)}<span style={{ fontSize: '0.55rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: 0 }}>/10</span>
          </span>
        )}
        {hasSummary && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
        )}
      </button>
      {/* Expandable summary */}
      {open && hasSummary && (
        <p style={{
          margin: 0, padding: '10px 16px 14px',
          fontSize: '0.78rem', lineHeight: 1.6,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
        }}>
          {summaryText}
        </p>
      )}
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
  translatedSummaries,
}: {
  sources: SourceBreakdown[];
  label: string;
  accent: string;
  bgAccent: string;
  translatedSummaries?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLocale();
  const er = t.expertReview;

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
            {sources.length} {er.sources}{totalPosts > 0 ? ` · ${totalPosts} ${er.discussions}` : ''}
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
          <SourceCard key={i} item={item} accent={accent} translatedSummary={translatedSummaries?.[i]} />
        ))}

        {/* Extra cards — hidden on mobile until expanded; always visible on desktop via CSS */}
        {sources.length > MOBILE_SHOW && (
          <div className={expanded ? 'ers-extra-expanded' : 'ers-extra-collapsed'}>
            {sources.slice(MOBILE_SHOW).map((item, i) => (
              <SourceCard key={i + MOBILE_SHOW} item={item} accent={accent} translatedSummary={translatedSummaries?.[i + MOBILE_SHOW]} />
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
            {er.moreSources}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExpertReviewsSection({
  review, makeNameHe, modelNameHe, makeNameEn, modelNameEn, year, isYearSpecific, userAvgRating, userReviewCount, inline, label, hideTitle,
}: Props) {
  const { t, locale } = useLocale();
  const er = t.expertReview;

  if (!review) return null;

  // Pre-translated EN fields from DB
  const enPros = review.prosEn ?? [];
  const enCons = review.consEn ?? [];
  const enLocalSummary = review.localSummaryEn ?? null;
  const enGlobalSummary = review.globalSummaryEn ?? null;
  const enFallback = review.summaryEn ?? null;

  const localSummaryRaw  = noData(review.localSummaryHe)  ? null : review.localSummaryHe!;
  const globalSummaryRaw = noData(review.globalSummaryHe) ? null : review.globalSummaryHe!;
  const fallbackRaw      = !localSummaryRaw && !globalSummaryRaw && !noData(review.summaryHe) ? review.summaryHe : null;

  // For EN: use pre-translated DB values (guard against any leftover Hebrew)
  const localSummary  = locale === 'en' ? (hasHebrew(enLocalSummary)  ? null : enLocalSummary)  : localSummaryRaw;
  const globalSummary = locale === 'en' ? (hasHebrew(enGlobalSummary) ? null : enGlobalSummary) : globalSummaryRaw;
  const fallback      = locale === 'en' ? (hasHebrew(enFallback)      ? null : enFallback)      : fallbackRaw;

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

  const displayMake  = locale === 'en' && makeNameEn  ? makeNameEn  : makeNameHe;
  const displayModel = locale === 'en' && modelNameEn ? modelNameEn : modelNameHe;
  const title = year ? `${displayMake} ${displayModel} ${year}` : `${displayMake} ${displayModel}`;

  const perSourceTotal = hasPerSource ? review.sourcesBreakdown.reduce((s, b) => s + b.postCount, 0) : 0;

  const badge = isYearSpecific === false && year
    ? er.generalSummary
    : isKnowledge
      ? er.aiKnowledge
      : hasPerSource
        ? `AI · ${perSourceTotal > 0 ? `${perSourceTotal} ${er.discussions}` : `${review.sourcesBreakdown.length} ${er.sources}`}`
        : `AI · ${totalPosts} ${er.discussions}`;

  const wrapperStyle = inline
    ? { overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' as const, background: 'var(--surface)' }
    : { overflow: 'hidden', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 32 };

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
        /* Side-by-side body layout */
        .ers-body-row { display: grid; grid-template-columns: 1fr 210px; border-top: 1px solid var(--border); }
        .ers-pros-cons-col { display: flex; flex-direction: column; border-inline-start: 1px solid var(--border); }
        @media (max-width: 580px) {
          .ers-body-row { grid-template-columns: 1fr !important; }
          .ers-pros-cons-col { border-inline-start: none !important; border-top: 1px solid var(--border); }
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
              {label ?? er.defaultLabel}
            </div>
            {!hideTitle && (
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, lineHeight: 1.25, color: 'var(--text)' }}>
                {title}
              </h2>
            )}
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
                  ⭐ {userReviewCount} {er.reviews} · {userScore.toFixed(1)}/10
                </span>
              )}
            </div>
          </div>
          {combined != null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <ScoreRing score={combined} size={50} />
              <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{er.overallScore}</span>
            </div>
          )}
        </div>

        {/* ── Body: AI summaries | Pros/Cons side-by-side ── */}
        {inline ? (
          /* Inline mode (3D hero card): keep vertical layout */
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {hasPerSource ? (
              locale === 'en' ? (
                <SourceGroup sources={review.sourcesBreakdown} label={er.generalSummary} accent="#8b5cf6" bgAccent="rgba(139,92,246,0.04)"
                  translatedSummaries={review.sourcesBreakdown.map(s => resolveFlag(s) === '🇮🇱' ? (enLocalSummary ?? enFallback ?? '') : (enGlobalSummary ?? enFallback ?? ''))}
                />
              ) : (
                <>
                  {localSources.length > 0 && <SourceGroup sources={localSources} label={er.israeli} accent="#3b82f6" bgAccent="rgba(59,130,246,0.04)" />}
                  {localSources.length > 0 && globalSources.length > 0 && <div style={{ margin: '0 12px', borderTop: '1px dashed var(--border)' }} />}
                  {globalSources.length > 0 && <SourceGroup sources={globalSources} label={er.global} accent="#8b5cf6" bgAccent="rgba(139,92,246,0.04)" />}
                </>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px' }}>
                {localSummary && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRight: '3px solid #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: '0.75rem' }}>{locale === 'en' ? '📝' : '🇮🇱'}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6' }}>{er.israeli}</span>
                      {localScore != null && <span style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 900, color: scoreColor(localScore) }}>{localScore.toFixed(1)}<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/10</span></span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{localSummary}</p>
                  </div>
                )}
                {globalSummary && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRight: '3px solid #8b5cf6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: '0.75rem' }}>🌍</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6' }}>{er.global}</span>
                      {globalScore != null && <span style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 900, color: scoreColor(globalScore) }}>{globalScore.toFixed(1)}<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/10</span></span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{globalSummary}</p>
                  </div>
                )}
                {fallback && !localSummary && !globalSummary && (
                  <p style={{ margin: 0, padding: '8px 4px', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{fallback}</p>
                )}
              </div>
            )}
            {(review.pros.length > 0 || review.cons.length > 0) && (
              <div style={{ borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: review.pros.length > 0 && review.cons.length > 0 ? '1fr 1fr' : '1fr', marginTop: 'auto' }}>
                {review.pros.length > 0 && (
                  <div style={{ padding: '9px 12px 12px', borderLeft: review.cons.length > 0 ? '1px solid var(--border)' : 'none', background: 'rgba(22,163,74,0.02)' }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 2, background: '#16a34a', borderRadius: 1 }} />{er.pros}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(locale === 'en' && enPros.some(Boolean) && !enPros.some(hasHebrew) ? enPros : review.pros).map((p, i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.73rem', fontWeight: 600, color: '#15803d', lineHeight: 1.4 }}><span style={{ flexShrink: 0, fontWeight: 900 }}>✓</span><span>{p}</span></div>)}
                    </div>
                  </div>
                )}
                {review.cons.length > 0 && (
                  <div style={{ padding: '9px 12px 12px', background: 'rgba(220,38,38,0.02)' }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 2, background: '#dc2626', borderRadius: 1 }} />{er.cons}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(locale === 'en' && enCons.some(Boolean) && !enCons.some(hasHebrew) ? enCons : review.cons).map((c, i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.73rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.4 }}><span style={{ flexShrink: 0, fontWeight: 900 }}>✗</span><span>{c}</span></div>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Normal mode: AI summaries | Pros/Cons side-by-side */
          <div className="ers-body-row">
            {/* AI Summaries column */}
            <div style={{ overflowY: 'auto' }}>
              {hasPerSource ? (
                locale === 'en' ? (
                  <SourceGroup sources={review.sourcesBreakdown} label={er.generalSummary} accent="#8b5cf6" bgAccent="rgba(139,92,246,0.04)"
                    translatedSummaries={review.sourcesBreakdown.map(s => resolveFlag(s) === '🇮🇱' ? (enLocalSummary ?? enFallback ?? '') : (enGlobalSummary ?? enFallback ?? ''))}
                  />
                ) : (
                  <>
                    {localSources.length > 0 && <SourceGroup sources={localSources} label={er.israeli} accent="#3b82f6" bgAccent="rgba(59,130,246,0.04)" />}
                    {localSources.length > 0 && globalSources.length > 0 && <div style={{ margin: '0 12px', borderTop: '1px dashed var(--border)' }} />}
                    {globalSources.length > 0 && <SourceGroup sources={globalSources} label={er.global} accent="#8b5cf6" bgAccent="rgba(139,92,246,0.04)" />}
                  </>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px' }}>
                  {localSummary && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRight: '3px solid #3b82f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ fontSize: '0.75rem' }}>{locale === 'en' ? '📝' : '🇮🇱'}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6' }}>{er.israeli}</span>
                        {review.localPostCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 99, border: '1px solid var(--border)' }}>{review.localPostCount} {er.discussions}</span>}
                        {localScore != null && <span style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 900, color: scoreColor(localScore) }}>{localScore.toFixed(1)}<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/10</span></span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{localSummary}</p>
                    </div>
                  )}
                  {globalSummary && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRight: '3px solid #8b5cf6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ fontSize: '0.75rem' }}>🌍</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6' }}>{er.global}</span>
                        {review.globalPostCount > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: 99, border: '1px solid var(--border)' }}>{review.globalPostCount} {er.discussions}</span>}
                        {globalScore != null && <span style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 900, color: scoreColor(globalScore) }}>{globalScore.toFixed(1)}<span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>/10</span></span>}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>{globalSummary}</p>
                    </div>
                  )}
                  {fallback && !localSummary && !globalSummary && (
                    <p style={{ margin: 0, padding: '8px 4px', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>{fallback}</p>
                  )}
                </div>
              )}
            </div>

            {/* Pros/Cons column */}
            {(review.pros.length > 0 || review.cons.length > 0) && (
              <div className="ers-pros-cons-col">
                {review.pros.length > 0 && (
                  <div style={{ padding: '9px 12px 12px', background: 'rgba(22,163,74,0.02)', borderBottom: review.cons.length > 0 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#16a34a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 2, background: '#16a34a', borderRadius: 1 }} />
                      {er.pros}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(locale === 'en' && enPros.some(Boolean) && !enPros.some(hasHebrew) ? enPros : review.pros).map((p, i) => (
                        <div key={`pro-${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.73rem', fontWeight: 600, color: '#15803d', lineHeight: 1.4 }}>
                          <span style={{ flexShrink: 0, marginTop: 1, fontWeight: 900 }}>✓</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {review.cons.length > 0 && (
                  <div style={{ padding: '9px 12px 12px', background: 'rgba(220,38,38,0.02)' }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 10, height: 2, background: '#dc2626', borderRadius: 1 }} />
                      {er.cons}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(locale === 'en' && enCons.some(Boolean) && !enCons.some(hasHebrew) ? enCons : review.cons).map((c, i) => (
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
        )}

        {/* ── Footer ── */}
        <p style={footerStyle}>
          {er.footer}
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

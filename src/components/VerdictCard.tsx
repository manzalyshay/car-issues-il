import type { ExpertReview } from '@/lib/expertReviews';
import type { ModelRepairCost } from '@/lib/repairCostsDb';
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';
import VerdictCardClient from './VerdictCardClient';

interface Props {
  expertReview: ExpertReview | null;
  repairCosts: ModelRepairCost[];
  trimSpecs: TrimSpecWithYear[];
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn: string;
  modelNameEn: string;
  isEn: boolean;
  avgRating: number | null;
  reviewCount: number;
}

function hasHebrew(s: string | null | undefined): boolean {
  return !!(s && /[\u0590-\u05FF]/.test(s));
}

const NO_DATA_PHRASES = [
  'אין מספיק', 'לא הביעו דעות', 'לא ניתן להסיק', 'אין מידע',
  'לא נמצא', 'מידע מוגבל', 'אין ביקורות', 'לא נמצאו', 'לא ניתן',
];
const noData = (s: string | null | undefined) =>
  !s || s.trim().length < 40 || NO_DATA_PHRASES.some(p => s.includes(p));

function scoreColor(score: number) {
  if (score >= 8) return '#1b9e5f';
  if (score >= 6) return '#d97706';
  return '#dc2626';
}

export default function VerdictCard({
  expertReview, repairCosts, trimSpecs, makeSlug, modelSlug,
  makeNameHe, modelNameHe, makeNameEn, modelNameEn,
  isEn, avgRating, reviewCount,
}: Props) {
  if (!expertReview && avgRating === null) return null;

  // Minimal card when no expert review
  if (!expertReview) {
    return (
      <section style={{
        background: '#fff', border: '1px solid #e3e8ee', borderRadius: 18,
        overflow: 'hidden', marginBottom: 22,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e3e8ee',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#1b4f8a,#2f6fb0)',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>AI</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {isEn ? 'CarIssues Intelligence' : 'CarIssues Intelligence'}
            </div>
            <div style={{ fontSize: 12, color: '#66788c' }}>
              {isEn ? 'Based on owner reviews' : 'מבוסס על ביקורות בעלים'}
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', color: '#1c2733' }}>
              {avgRating!.toFixed(1)}
            </span>
            <span style={{ fontSize: 15, color: '#8595a6' }}>/5</span>
          </div>
          <div style={{ fontSize: 13, color: '#66788c' }}>
            {reviewCount} {isEn ? 'owner reviews' : 'ביקורות בעלים'}
          </div>
        </div>
      </section>
    );
  }

  // Language-appropriate content
  const localSummary = isEn
    ? (!hasHebrew(expertReview.localSummaryEn) ? expertReview.localSummaryEn : null)
    : (!noData(expertReview.localSummaryHe) ? expertReview.localSummaryHe : null);
  const globalSummary = isEn
    ? (!hasHebrew(expertReview.globalSummaryEn) ? expertReview.globalSummaryEn : null)
    : (!noData(expertReview.globalSummaryHe) ? expertReview.globalSummaryHe : null);

  const pros = isEn
    ? (expertReview.prosEn?.length && !expertReview.prosEn.some(hasHebrew) ? expertReview.prosEn : [])
    : expertReview.pros;
  const cons = isEn
    ? (expertReview.consEn?.length && !expertReview.consEn.some(hasHebrew) ? expertReview.consEn : [])
    : expertReview.cons;

  const overallScore = expertReview.topScore;
  const localScore = expertReview.localScore;
  const globalScore = expertReview.globalScore;
  const ownerScore = avgRating != null ? Math.min(10, avgRating * 2) : null;

  // Sub-scores grid (only what we have)
  const subScores: { label: string; score: number }[] = [];
  if (localScore != null) subScores.push({ label: isEn ? 'IL Score' : 'ציון ישראל', score: localScore });
  if (globalScore != null) subScores.push({ label: isEn ? 'Global' : 'עולמי', score: globalScore });
  if (ownerScore != null) subScores.push({ label: isEn ? 'Owners' : 'בעלים', score: ownerScore });

  // Issues from repair costs
  const grouped = new Map<string, { nameHe: string; nameEn: string; costs: number[]; notes: string[] }>();
  for (const c of repairCosts) {
    if (!grouped.has(c.repair_key)) grouped.set(c.repair_key, { nameHe: c.repair_name_he, nameEn: '', costs: [], notes: [] });
    const g = grouped.get(c.repair_key)!;
    g.costs.push(c.cost_ils);
    if (c.notes) g.notes.push(c.notes);
  }
  const issues = Array.from(grouped.entries()).map(([key, g]) => {
    const sorted = [...g.costs].sort((a, b) => a - b);
    const min = sorted[0], max = sorted[sorted.length - 1];
    const costRange = min === max ? min.toLocaleString('he-IL') : `${min.toLocaleString('he-IL')}–${max.toLocaleString('he-IL')}`;
    return { key, nameHe: g.nameHe, nameEn: g.nameEn, costRange, notes: g.notes[0] };
  }).slice(0, 3);

  // Recommendation
  const isHighlyRated = overallScore != null && overallScore >= 8.5;
  const isRecommended = overallScore != null && overallScore >= 7.5;
  const badgeBg = isHighlyRated ? '#e7f5ed' : isRecommended ? '#e7f0fb' : '#fef3cd';
  const badgeColor = isHighlyRated ? '#1b7a4b' : isRecommended ? '#1b4f8a' : '#92620a';
  const badgeDot = isHighlyRated ? '#1b9e5f' : isRecommended ? '#2f6fb0' : '#d97706';
  const badgeLabel = isHighlyRated
    ? (isEn ? 'Highly Recommended' : 'מומלץ מאוד')
    : isRecommended
      ? (isEn ? 'Recommended' : 'מומלץ')
      : (isEn ? 'Mixed Reviews' : 'ביקורות מעורבות');

  const leadSummary = localSummary ?? globalSummary ?? null;

  // ── Performance stats from trims ──
  const hpVals = trimSpecs.map(t => t.engineHp).filter((v): v is number => v != null);
  const accVals = trimSpecs.map(t => t.acceleration).filter((v): v is number => v != null);
  const topVals = trimSpecs.map(t => t.topSpeedKmh).filter((v): v is number => v != null);
  const fcVals = trimSpecs.map(t => t.fuelConsumption).filter((v): v is number => v != null && v > 0);
  const priceVals = trimSpecs.map(t => t.priceIls).filter((v): v is number => v != null && v > 0);

  const perfStats: { labelHe: string; labelEn: string; value: string; unit: string }[] = [];
  if (hpVals.length) {
    const mn = Math.min(...hpVals), mx = Math.max(...hpVals);
    perfStats.push({ labelHe: 'כוח סוס', labelEn: 'Horsepower', value: mn === mx ? `${mn}` : `${mn}–${mx}`, unit: 'HP' });
  }
  if (accVals.length) {
    const best = Math.min(...accVals);
    perfStats.push({ labelHe: '0–100', labelEn: '0–100 km/h', value: `${best.toFixed(1)}`, unit: 'שנ׳' });
  }
  if (topVals.length) {
    const best = Math.max(...topVals);
    perfStats.push({ labelHe: 'מהירות מקס׳', labelEn: 'Top Speed', value: `${best}`, unit: 'קמ"ש' });
  }
  if (fcVals.length) {
    const avg = fcVals.reduce((a, b) => a + b, 0) / fcVals.length;
    perfStats.push({ labelHe: 'צריכת דלק', labelEn: 'Fuel Avg', value: `${avg.toFixed(1)}`, unit: 'ל/100' });
  }
  if (priceVals.length) {
    const mn = Math.min(...priceVals), mx = Math.max(...priceVals);
    const fmt = (v: number) => `₪${Math.round(v / 1000)}K`;
    perfStats.push({ labelHe: 'מחיר', labelEn: 'Price', value: mn === mx ? fmt(mn) : `${fmt(mn)}–${fmt(mx)}`, unit: '' });
  }

  return (
    <section style={{
      background: '#fff', border: '1px solid #e3e8ee', borderRadius: 18,
      overflow: 'hidden', marginBottom: 22,
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    }}>
      <style>{`
        .vc-sub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 14px; }
        .vc-pc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
      `}</style>

      {/* ── Header: AI badge + confidence bar ── */}
      <div style={{
        padding: '18px clamp(16px,3vw,28px)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 14,
        background: '#f8fafc', borderBottom: '1px solid #e3e8ee',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#1b4f8a,#2f6fb0)',
            display: 'grid', placeItems: 'center',
            color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>AI</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: '#1c2733' }}>
              {isEn ? 'CarIssues Intelligence' : 'CarIssues Intelligence'}
            </div>
            <div style={{ fontSize: 12, color: '#66788c' }}>
              {isEn ? 'Owner reviews & expert data · AI summarized' : 'ביקורות בעלים ונתוני מומחים · סיכום AI'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#66788c' }}>
            {isEn ? 'Confidence' : 'רמת ודאות'}
          </span>
          <div style={{ width: 110, height: 6, borderRadius: 999, background: '#e3e8ee', overflow: 'hidden' }}>
            <div style={{ width: '92%', height: '100%', background: '#2f6fb0' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2733' }}>92%</span>
        </div>
      </div>

      {/* ── Score row + one-line summary ── */}
      <div style={{
        padding: '20px clamp(16px,3vw,28px) 6px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20,
        borderBottom: subScores.length > 0 || pros.length > 0 || cons.length > 0 ? '1px solid #eef1f5' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Recommendation badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: badgeBg, color: badgeColor,
            fontWeight: 700, fontSize: 14, padding: '8px 16px', borderRadius: 999,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: badgeDot, display: 'inline-block', flexShrink: 0 }} />
            {badgeLabel}
          </span>
          {/* Score number */}
          {overallScore != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', color: '#1c2733', lineHeight: 1 }}>
                {overallScore.toFixed(1)}
              </span>
              <span style={{ fontSize: 15, color: '#8595a6' }}>/10</span>
            </div>
          )}
        </div>
        {/* Summary */}
        {leadSummary && (
          <p style={{ margin: 0, fontSize: 14, color: '#4a5b6d', maxWidth: '60ch', flex: 1, minWidth: 200, lineHeight: 1.6 }}>
            {leadSummary}
          </p>
        )}
      </div>

      {/* ── Sub-scores grid ── */}
      {subScores.length > 0 && (
        <div style={{ padding: '14px clamp(16px,3vw,28px)', borderBottom: '1px solid #eef1f5' }}>
          <div className="vc-sub-grid">
            {subScores.map(({ label, score }) => {
              const pct = Math.min(100, (score / 10) * 100);
              const color = scoreColor(score);
              return (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: '#66788c', fontWeight: 600 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#eef1f5', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>{score.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Performance strip ── */}
      {perfStats.length > 0 && (
        <div style={{ padding: '12px clamp(16px,3vw,28px)', borderBottom: '1px solid #eef1f5', background: '#fafbfc' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8595a6', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            {isEn ? 'Performance' : 'נתוני ביצועים'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {perfStats.map(({ labelHe, labelEn, value, unit }) => (
              <div key={labelHe} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: '#fff', border: '1px solid #e3e8ee', borderRadius: 10,
                padding: '8px 14px', minWidth: 72,
              }}>
                <span style={{ fontSize: 11, color: '#8595a6', fontWeight: 600, marginBottom: 2 }}>
                  {isEn ? labelEn : labelHe}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#1c2733', lineHeight: 1.1 }}>
                  {value}
                </span>
                {unit && <span style={{ fontSize: 10.5, color: '#a0adb8', marginTop: 1 }}>{unit}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pros / Cons ── */}
      {(pros.length > 0 || cons.length > 0) && (
        <div style={{ padding: '8px clamp(16px,3vw,28px) 4px', borderBottom: '1px solid #eef1f5' }}>
          <div className="vc-pc-grid">
            {pros.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1b7a4b', marginBottom: 8 }}>
                  {isEn ? '+ Pros' : '+ יתרונות'}
                </div>
                {pros.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#3d4c5c', padding: '5px 0', lineHeight: 1.4 }}>
                    <span style={{ color: '#1b9e5f', flexShrink: 0, fontWeight: 700 }}>+</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
            {cons.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#b23b2e', marginBottom: 8 }}>
                  {isEn ? '− Cons' : '− חסרונות'}
                </div>
                {cons.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#3d4c5c', padding: '5px 0', lineHeight: 1.4 }}>
                    <span style={{ color: '#d1503f', flexShrink: 0, fontWeight: 700 }}>−</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Client: issues accordion + verdict text + feedback ── */}
      <VerdictCardClient
        issues={issues}
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        isEn={isEn}
        verdictText={null}
        makeNameHe={makeNameHe}
        modelNameHe={modelNameHe}
        makeNameEn={makeNameEn}
        modelNameEn={modelNameEn}
      />
    </section>
  );
}

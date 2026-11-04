import type { ExpertReview } from '@/lib/expertReviews';
import type { ModelRepairCost } from '@/lib/repairCostsDb';
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';
import VerdictCardClient from './VerdictCardClient';
import ScoreSourcesInfo from './ScoreSourcesInfo';
import { aiSourceLabel } from '@/lib/aiSource';
import { type AiScore, AI_SCORE_CAPTION_HE, AI_SCORE_CAPTION_EN, AI_SCORE_ESTIMATED_HE, AI_SCORE_ESTIMATED_EN, blendWithOwnerRating, formatOwnerScoreHe, formatOwnerScoreEn } from '@/lib/aiScore';
import { type ProReviewScoreSet, headlineTestScoreAvg, blendWithTestScore, isClearlyBelowTests, belowTestsNote } from '@/lib/proReviewScoreLabels';

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
  aiScore: AiScore | null;
  /** Verified test scores from other review sites (icar, Autocar, carwow, Top
   * Gear, Car and Driver, etc.) - blended into the displayed score as one of
   * its inputs, with the sources/dates/links shown via the small ⓘ next to it. */
  proReviewScoreSets?: ProReviewScoreSet[] | null;
  /** Recall campaigns on record for the model (same count as the recalls tab), used in the weak-points note. */
  recallCount?: number | null;
}

/** Headline-eligible test-score average (variant-only sets dropped when broader sets exist). */
const computeTestScoreAvg = headlineTestScoreAvg;

function hasHebrew(s: string | null | undefined): boolean {
  return !!(s && /[֐-׿]/.test(s));
}

const NO_DATA_PHRASES = [
  'אין מספיק', 'לא הביעו דעות', 'לא ניתן להסיק', 'אין מידע',
  'לא נמצא', 'מידע מוגבל', 'אין ביקורות', 'לא נמצאו', 'לא ניתן',
];
const noData = (s: string | null | undefined) =>
  !s || s.trim().length < 40 || NO_DATA_PHRASES.some(p => s.includes(p));

export default function VerdictCard({
  expertReview, repairCosts, trimSpecs, makeSlug, modelSlug,
  makeNameHe, modelNameHe, makeNameEn, modelNameEn,
  isEn, avgRating, reviewCount, aiScore, proReviewScoreSets, recallCount,
}: Props) {
  if (!expertReview && avgRating === null && aiScore === null) return null;

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
              {reviewCount > 0
                ? (isEn ? 'Based on owner reviews' : 'מבוסס על ביקורות בעלים')
                : (isEn ? 'Limited data available' : 'מידע מוגבל')}
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {aiScore != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', color: '#1c2733' }}>
                {blendWithTestScore(blendWithOwnerRating(aiScore.score, avgRating, reviewCount), computeTestScoreAvg(proReviewScoreSets)).toFixed(1)}
              </span>
              <span style={{ fontSize: 15, color: '#8595a6' }}>/10</span>
              {aiScore.confidence === 'low' && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92620a', background: '#fef3cd', padding: '2px 8px', borderRadius: 999 }}>
                  {isEn ? AI_SCORE_ESTIMATED_EN : AI_SCORE_ESTIMATED_HE}
                </span>
              )}
              <ScoreSourcesInfo sets={proReviewScoreSets} isHe={!isEn} />
            </div>
          )}
          {avgRating != null && reviewCount > 0 && (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2733' }}>
              {isEn ? formatOwnerScoreEn(avgRating, reviewCount) : formatOwnerScoreHe(avgRating, reviewCount)}
            </div>
          )}
        </div>
        {aiScore != null && (
          <div style={{ padding: '0 24px 16px', fontSize: 12, color: '#8595a6', lineHeight: 1.5 }}>
            {isEn ? AI_SCORE_CAPTION_EN : AI_SCORE_CAPTION_HE}
          </div>
        )}
      </section>
    );
  }

  const curatedData = expertReview.curatedModelData;

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

  const testScoreAvg = computeTestScoreAvg(proReviewScoreSets);
  const overallScore = aiScore != null
    ? blendWithTestScore(blendWithOwnerRating(aiScore.score, avgRating, reviewCount), testScoreAvg)
    : null;
  // When the score sits clearly below the external road tests, say what weighs
  // on the model (its own curated cons and recall record), not why the number is lower.
  const weakPointsNote = isClearlyBelowTests(overallScore, testScoreAvg)
    ? belowTestsNote({ cons, recallCount, isEn })
    : null;
  const ownerScoreLine = (avgRating != null && reviewCount > 0)
    ? (isEn ? formatOwnerScoreEn(avgRating, reviewCount) : formatOwnerScoreHe(avgRating, reviewCount))
    : null;

  // Issues from repair costs - model-specific repair reports only store a Hebrew
  // name (no English translation source), so on EN there is nothing accurate to
  // show here; skip the accordion rather than leak Hebrew or show a blank label.
  const grouped = new Map<string, { nameHe: string; nameEn: string; costs: number[]; notes: string[] }>();
  if (!isEn) {
    for (const c of repairCosts) {
      if (!grouped.has(c.repair_key)) grouped.set(c.repair_key, { nameHe: c.repair_name_he, nameEn: '', costs: [], notes: [] });
      const g = grouped.get(c.repair_key)!;
      g.costs.push(c.cost_ils);
      if (c.notes) g.notes.push(c.notes);
    }
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
  const badgeLabel = curatedData && overallScore == null && reviewCount === 0
    ? (isEn ? 'Model information' : 'מידע על הדגם')
    : isHighlyRated
    ? (isEn ? 'Highly Recommended' : 'מומלץ מאוד')
    : isRecommended
      ? (isEn ? 'Recommended' : 'מומלץ')
      : (isEn ? 'Mixed Reviews' : 'ביקורות מעורבות');

  // curatedData is Hebrew-only Israeli-market curation (no English translation exists) -
  // never fall back to it on the English site, even when the English summary is empty.
  // On EN, show ONLY the approved global_summary_en text - never fall back to
  // localSummaryEn (older, unreviewed AI-generated text with stale Israel pricing).
  const leadSummary = isEn
    ? globalSummary
    : (curatedData?.summary_integrated ?? localSummary ?? globalSummary ?? null);

  // Chips from batch data - Hebrew only (no English translation pipeline yet),
  // so skip them entirely on the English site rather than show untranslated text.
  const chips = isEn ? null : expertReview.chipsJson;
  const chipItems: { label: string; color: string }[] = [];
  if (chips?.who_for_chip) chipItems.push({ label: chips.who_for_chip, color: '#1b4f8a' });
  if (chips?.safety_chip) chipItems.push({ label: chips.safety_chip, color: '#1b7a4b' });
  if (chips?.main_strength_chip) chipItems.push({ label: `✓ ${chips.main_strength_chip}`, color: '#2563eb' });
  if (chips?.main_weakness_chip) chipItems.push({ label: `✗ ${chips.main_weakness_chip}`, color: '#b23b2e' });

  // Pros/cons note (replaces pros/cons when present and arrays are empty)
  const prosConsNote = expertReview.prosConsNote;

  // ── Performance stats from trims ──
  const hpVals = trimSpecs.map(t => t.engineHp).filter((v): v is number => v != null);
  const accVals = trimSpecs.map(t => t.acceleration).filter((v): v is number => v != null);
  const topVals = trimSpecs.map(t => t.topSpeedKmh).filter((v): v is number => v != null);
  const priceVals = curatedData?.on_sale_il === false ? [] : trimSpecs.map(t => t.priceIls).filter((v): v is number => v != null && v > 0);

  const perfStats: { labelHe: string; labelEn: string; value: string; unit: string }[] = [];
  if (hpVals.length) {
    const mn = Math.min(...hpVals), mx = Math.max(...hpVals);
    perfStats.push({ labelHe: 'כוח סוס', labelEn: 'Horsepower', value: mn === mx ? `${mn}` : `${mn}–${mx}`, unit: 'HP' });
  }
  if (accVals.length) {
    const best = Math.min(...accVals);
    perfStats.push({ labelHe: '0–100', labelEn: '0–100 km/h', value: `${best.toFixed(1)}`, unit: isEn ? 'sec' : 'שנ׳' });
  }
  if (topVals.length) {
    const best = Math.max(...topVals);
    perfStats.push({ labelHe: 'מהירות מקס׳', labelEn: 'Top Speed', value: `${best}`, unit: isEn ? 'km/h' : 'קמ"ש' });
  }
  const suppliedConsumption = curatedData?.consumption?.figures ?? [];
  for (const figure of suppliedConsumption) {
    const isFuel = figure.unit === 'km/L';
    const unit = figure.unit === 'km/L'
      ? (isEn ? 'km/L' : 'ק״מ/ל׳')
      : figure.unit === 'kWh/100km'
        ? (isEn ? 'kWh/100 km' : 'קוט״ש ל-100 ק״מ')
        : figure.unit;
    perfStats.push({
      labelHe: isFuel ? 'צריכת דלק' : 'צריכת חשמל',
      labelEn: isFuel ? 'Fuel Economy' : 'Energy Use',
      value: String(figure.value),
      unit,
    });
  }
  const fcElectric = suppliedConsumption.length ? [] : trimSpecs.filter(t => t.engineType === 'electric' && t.fuelConsumption != null && t.fuelConsumption > 0).map(t => t.fuelConsumption!);
  const fcFuel = suppliedConsumption.length ? [] : trimSpecs.filter(t => t.engineType !== 'electric' && t.fuelConsumption != null && t.fuelConsumption! >= 3.0).map(t => t.fuelConsumption!);
  if (fcElectric.length) {
    const avg = fcElectric.reduce((a, b) => a + b, 0) / fcElectric.length;
    perfStats.push({ labelHe: 'צריכת חשמל', labelEn: 'Energy', value: avg.toFixed(1), unit: isEn ? 'kWh/100km' : 'קוט״ש/100ק"מ' });
  }
  if (fcFuel.length) {
    const avgL100 = fcFuel.reduce((a, b) => a + b, 0) / fcFuel.length;
    const kmL = (100 / avgL100).toFixed(1);
    perfStats.push({ labelHe: 'צריכת דלק', labelEn: 'Fuel Avg', value: kmL, unit: isEn ? 'km/L' : 'ק"מ/ל׳' });
  }
  // Israeli shekel pricing - Hebrew site only.
  if (!isEn && curatedData?.on_sale_il === true && typeof curatedData.price_from_ils === 'number') {
    perfStats.push({ labelHe: 'מחיר התחלתי', labelEn: 'Starting Price', value: `₪${curatedData.price_from_ils.toLocaleString('he-IL')}`, unit: '' });
  } else if (!isEn && priceVals.length) {
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
              {curatedData?.on_sale_il === true && reviewCount === 0
                ? (isEn ? 'Based on tests and official data' : 'מבוסס על מבחנים ונתונים רשמיים')
                : aiSourceLabel(expertReview, isEn)}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#66788c' }}>
          {reviewCount > 0
            ? (isEn ? `${reviewCount} owner review${reviewCount > 1 ? 's' : ''} on CarIssues` : (reviewCount === 1 ? 'ביקורת בעלים אחת באתר' : `${reviewCount} ביקורות בעלים באתר`))
            : (isEn ? 'No owner reviews on CarIssues yet' : 'עדיין אין ביקורות בעלים באתר')}
        </div>
      </div>

      {/* ── Score row + one-line summary ── */}
      <div style={{
        padding: '20px clamp(16px,3vw,28px) 6px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20,
        borderBottom: ownerScoreLine || pros.length > 0 || cons.length > 0 ? '1px solid #eef1f5' : 'none',
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
              {aiScore?.confidence === 'low' && (
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92620a', background: '#fef3cd', padding: '2px 8px', borderRadius: 999, marginInlineStart: 4 }}>
                  {isEn ? AI_SCORE_ESTIMATED_EN : AI_SCORE_ESTIMATED_HE}
                </span>
              )}
              <ScoreSourcesInfo sets={proReviewScoreSets} isHe={!isEn} />
            </div>
          )}
        </div>
        {/* Summary */}
        {(leadSummary || weakPointsNote) && (
          <p style={{ margin: 0, fontSize: 14, color: '#4a5b6d', maxWidth: '60ch', flex: 1, minWidth: 200, lineHeight: 1.6 }}>
            {leadSummary}
            {leadSummary && weakPointsNote ? ' ' : null}
            {weakPointsNote}
          </p>
        )}
        {/* Chips */}
        {chipItems.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: '100%', marginTop: leadSummary ? 4 : 0 }}>
            {chipItems.map((c, i) => (
              <span key={i} style={{
                display: 'inline-block', fontSize: 12, fontWeight: 600,
                color: c.color, background: c.color + '12', border: `1px solid ${c.color}30`,
                borderRadius: 999, padding: '3px 12px',
              }}>{c.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── AI score caption ── */}
      {overallScore != null && (
        <div style={{ padding: '0 clamp(16px,3vw,28px) 10px', fontSize: 12, color: '#8595a6', lineHeight: 1.5 }}>
          {isEn ? AI_SCORE_CAPTION_EN : AI_SCORE_CAPTION_HE}
        </div>
      )}

      {/* ── Owner score line ── */}
      {ownerScoreLine && (
        <div style={{ padding: '0 clamp(16px,3vw,28px) 14px', fontSize: 13, fontWeight: 700, color: '#1c2733' }}>
          {ownerScoreLine}
        </div>
      )}

      {/* ── Performance strip ── */}
      {/* curatedData.consumption.text is Hebrew-only Israeli-market curation - never show on EN. */}
      {(perfStats.length > 0 || (!isEn && curatedData?.consumption?.text)) && (
        <div style={{ padding: '12px clamp(16px,3vw,28px)', borderBottom: '1px solid #eef1f5', background: '#fafbfc' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8595a6', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            {isEn ? 'Performance' : 'נתוני ביצועים'}
          </div>
          {perfStats.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {perfStats.map(({ labelHe, labelEn, value, unit }) => (
              <div key={isEn ? labelEn : labelHe} style={{
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
          </div>}
          {!isEn && curatedData?.consumption?.text && (
            <p style={{ margin: perfStats.length ? '10px 0 0' : 0, fontSize: 12.5, color: '#66788c', lineHeight: 1.5 }}>
              {curatedData.consumption.text}
            </p>
          )}
        </div>
      )}

      {/* ── Pros / Cons (or note) ── */}
      {/* prosConsNote is Hebrew-only editorial data with no English translation - on EN,
          prefer the real pros/cons list when we have one, and fall back to a generic
          English placeholder (never the Hebrew text) only when both are empty. */}
      {!isEn && prosConsNote ? (
        <div style={{ padding: '12px clamp(16px,3vw,28px)', borderBottom: '1px solid #eef1f5' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8595a6', marginBottom: 6 }}>
            יתרונות וחסרונות
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: '#4a5b6d', lineHeight: 1.6 }}>
            {prosConsNote}
          </p>
        </div>
      ) : (pros.length > 0 || cons.length > 0) ? (
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
      ) : isEn && prosConsNote ? (
        <div style={{ padding: '12px clamp(16px,3vw,28px)', borderBottom: '1px solid #eef1f5' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8595a6', marginBottom: 6 }}>
            Pros & Cons
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: '#4a5b6d', lineHeight: 1.6 }}>
            Not enough verified data to summarize pros and cons for this model.
          </p>
        </div>
      ) : null}

      {/* ── Client: issues accordion + verdict text + feedback ── */}
      <VerdictCardClient
        issues={issues}
        makeSlug={makeSlug}
        modelSlug={modelSlug}
        isEn={isEn}
        verdictText={null}
      />
    </section>
  );
}

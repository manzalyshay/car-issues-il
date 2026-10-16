/**
 * Deterministic verdict + FAQ for compare pages, built ONLY from data the site has
 * (trim prices/specs, owner reviews, NHTSA recall counts). No LLM, no filler: a sentence
 * or question is produced only when both cars have the underlying numbers.
 */
import { fmtIls, kmPerL, type SpecSummary } from './specSummary';

export interface CarFacts {
  name: string;
  categoryLabel: string;
  spec: SpecSummary;
  reviewCount: number;
  avgRating: number | null;
  /** Recalls in the site's NHTSA cache across all years; null/0 = unknown. */
  recallCount: number | null;
}

export interface FaqItem { q: string; a: string }

export interface CompareInsights {
  verdict: { forA: string; forB: string; basis: string } | null;
  faq: FaqItem[];
}

type Side = 'a' | 'b';
interface Diff { winner: Side; magnitude: number; he: (f: CarFacts) => string; en: (f: CarFacts) => string; label: { he: string; en: string } }

const MIN_REL = 0.03;      // ≥3% relative difference counts as a real difference
const MIN_REVIEWS = 3;     // owner-rating comparisons need at least this many reviews per car

function rel(a: number, b: number) { return Math.abs(a - b) / Math.min(a, b); }

function numericDiff(
  a: number | null, b: number | null, lowerBetter: boolean,
  he: (f: CarFacts) => string, en: (f: CarFacts) => string, label: Diff['label'],
): Diff | null {
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  const m = rel(a, b);
  if (m < MIN_REL) return null;
  const aWins = lowerBetter ? a < b : a > b;
  return { winner: aWins ? 'a' : 'b', magnitude: m, he, en, label };
}

/** Hebrew one-letter prefix (ו/ל/ב/מ): attached to Hebrew words, hyphenated before Latin text or digits. */
function hp(prefix: string, s: string) { return /^[\u0590-\u05FF]/.test(s) ? `${prefix}${s}` : `${prefix}-${s}`; }
function joinHe(parts: string[]) { return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} ${hp('ו', parts[parts.length - 1])}`; }
export function reviewsHe(n: number) { return n === 1 ? 'ביקורת אחת' : `${n} ביקורות`; }
function joinEn(parts: string[]) { return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`; }

export function buildCompareInsights(A: CarFacts, B: CarFacts, locale: 'he' | 'en'): CompareInsights {
  const he = locale === 'he';
  const diffs: Diff[] = [];
  const push = (d: Diff | null) => { if (d) diffs.push(d); };

  push(numericDiff(A.spec.priceMin, B.spec.priceMin, true,
    (f) => `מחיר כניסה נמוך יותר (החל מ-${fmtIls(f.spec.priceMin!)})`,
    (f) => `a lower starting price (from ${fmtIls(f.spec.priceMin!)})`,
    { he: 'מחיר', en: 'price' }));
  push(numericDiff(A.spec.fuelBest, B.spec.fuelBest, true,
    (f) => `צריכת דלק נמוכה יותר (עד ${kmPerL(f.spec.fuelBest!)} ק"מ לליטר לפי נתון היצרן)`,
    (f) => `lower fuel use (up to ${kmPerL(f.spec.fuelBest!)} km/L, manufacturer figure)`,
    { he: 'צריכת דלק', en: 'fuel use' }));
  push(numericDiff(A.spec.cargoMax, B.spec.cargoMax, false,
    (f) => `תא מטען גדול יותר (${f.spec.cargoMax} ליטר)`,
    (f) => `a bigger boot (${f.spec.cargoMax} L)`,
    { he: 'תא מטען', en: 'boot space' }));
  push(numericDiff(A.spec.hpMax, B.spec.hpMax, false,
    (f) => `יותר כוח (עד ${f.spec.hpMax} כ"ס)`,
    (f) => `more power (up to ${f.spec.hpMax} hp)`,
    { he: 'הספק', en: 'power' }));

  if (A.avgRating != null && B.avgRating != null && A.reviewCount >= MIN_REVIEWS && B.reviewCount >= MIN_REVIEWS
      && Math.abs(A.avgRating - B.avgRating) >= 0.3) {
    diffs.push({
      winner: A.avgRating > B.avgRating ? 'a' : 'b',
      magnitude: Math.abs(A.avgRating - B.avgRating) / 5,
      he: (f) => `דירוג בעלים גבוה יותר (${f.avgRating!.toFixed(1)} מתוך 5, ${reviewsHe(f.reviewCount)})`,
      en: (f) => `a higher owner rating (${f.avgRating!.toFixed(1)}/5 from ${f.reviewCount} reviews)`,
      label: { he: 'דירוג בעלים', en: 'owner rating' },
    });
  }

  const recA = A.recallCount ?? 0, recB = B.recallCount ?? 0;
  if (recA > 0 && recB > 0 && recA !== recB && rel(recA, recB) >= 0.25) {
    const aWins = recA < recB;
    diffs.push({
      winner: aWins ? 'a' : 'b',
      magnitude: Math.min(rel(recA, recB), 2) / 4,
      he: (f) => `פחות קריאות ריקול מתועדות (${f === A ? recA : recB} לעומת ${f === A ? recB : recA}, מאגר NHTSA)`,
      en: (f) => `fewer recorded recalls (${f === A ? recA : recB} vs ${f === A ? recB : recA}, NHTSA)`,
      label: { he: 'ריקולים', en: 'recalls' },
    });
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  let verdict: CompareInsights['verdict'] = null;
  if (diffs.length > 0) {
    const sorted = [...diffs].sort((x, y) => y.magnitude - x.magnitude);
    const winsOf = (s: Side) => sorted.filter((d) => d.winner === s).slice(0, 2);
    const line = (s: Side) => {
      const f = s === 'a' ? A : B;
      const wins = winsOf(s);
      if (wins.length > 0) {
        return he
          ? `למי שמעדיף ${joinHe(wins.map((d) => d.he(f)))}.`
          : `buyers who want ${joinEn(wins.map((d) => d.en(f)))}.`;
      }
      const labels = sorted.slice(0, 2).map((d) => (he ? d.label.he : d.label.en));
      return he
        ? `בנתונים שבאתר הוא לא מוביל באף פרמטר שהשווינו (ההבדלים העיקריים: ${joinHe(labels)}); כדאי לשקול אותו אם הפערים האלה פחות חשובים לך.`
        : `it doesn't lead on any measured figure here (main differences: ${joinEn(labels)}); worth a look if those gaps matter less to you.`;
    };
    const sources = [he ? 'מחירון ומפרט הגרסאות באתר' : "the site's trim prices and specs"];
    if (diffs.some((d) => d.label.en === 'owner rating')) sources.push(he ? 'ביקורות בעלים' : 'owner reviews');
    if (diffs.some((d) => d.label.en === 'recalls')) sources.push(he ? 'מאגר הריקולים של NHTSA' : 'NHTSA recall records');
    verdict = { forA: line('a'), forB: line('b'), basis: he ? `מבוסס על ${joinHe(sources)}.` : `Based on ${joinEn(sources)}.` };
  }

  // ── FAQ ───────────────────────────────────────────────────────────────────
  const faq: FaqItem[] = [];
  const pa = A.spec.priceMin, pb = B.spec.priceMin;
  if (pa && pb) {
    const d = Math.abs(pa - pb);
    const cheaper = pa < pb ? A.name : B.name;
    faq.push(he ? {
      q: `מה ההבדל במחיר בין ${A.name} לבין ${B.name}?`,
      a: `לפי מחירון הגרסאות באתר, ${A.name} מתחיל מ-${fmtIls(pa)} ${hp('ו', B.name)} מתחיל מ-${fmtIls(pb)}. `
        + (d < 1000 ? 'מחיר הכניסה של שניהם כמעט זהה.' : `${cheaper} זול יותר בכ-${fmtIls(d)} במחיר הכניסה.`),
    } : {
      q: `What is the price difference between the ${A.name} and the ${B.name}?`,
      a: `Based on the trim prices on this site, the ${A.name} starts at ${fmtIls(pa)} and the ${B.name} at ${fmtIls(pb)}. `
        + (d < 1000 ? 'Their entry prices are almost the same.' : `The ${cheaper} is about ${fmtIls(d)} cheaper to get into.`),
    });
  }

  const relParts: string[] = [];
  if (recA > 0 && recB > 0) {
    relParts.push(he
      ? `במאגר הריקולים של NHTSA (ארה"ב) מתועדות ${recA} קריאות ריקול ${hp('ל', A.name)} ו-${recB} ${hp('ל', B.name)}, לאורך כל שנות הייצור. המספר מושפע גם ממספר שנות הייצור ומהיקף המכירות, ולכן הוא אינדיקציה חלקית בלבד.`
      : `NHTSA (US) records ${recA} recalls for the ${A.name} and ${recB} for the ${B.name} across all model years. The count also reflects how long and how widely each model was sold, so it is only a partial indicator.`);
  }
  if (A.avgRating != null && B.avgRating != null && A.reviewCount >= 2 && B.reviewCount >= 2) {
    relParts.push(he
      ? `דירוג בעלי הרכב באתר: ${A.name} — ${A.avgRating.toFixed(1)} מתוך 5 (${reviewsHe(A.reviewCount)}), ${B.name} — ${B.avgRating.toFixed(1)} מתוך 5 (${reviewsHe(B.reviewCount)}).`
      : `Owner ratings on this site: ${A.name} ${A.avgRating.toFixed(1)}/5 (${A.reviewCount} reviews), ${B.name} ${B.avgRating.toFixed(1)}/5 (${B.reviewCount} reviews).`);
  }
  if (relParts.length > 0) {
    faq.push({
      q: he ? `איזה רכב אמין יותר, ${A.name} או ${B.name}?` : `Which is more reliable, the ${A.name} or the ${B.name}?`,
      a: relParts.join(' '),
    });
  }

  const fa = A.spec.fuelBest, fb = B.spec.fuelBest;
  if (fa && fb) {
    const same = rel(fa, fb) < MIN_REL;
    const better = fa < fb ? A.name : B.name;
    faq.push(he ? {
      q: `איזה רכב חסכוני יותר בדלק?`,
      a: `לפי נתוני היצרן לגרסאות הבנזין וההיברידיות: ${A.name} — עד ${kmPerL(fa)} ק"מ לליטר (${fa} ל' ל-100 ק"מ), ${B.name} — עד ${kmPerL(fb)} ק"מ לליטר (${fb} ל' ל-100 ק"מ). `
        + (same ? 'הצריכה של שניהם כמעט זהה.' : `${better} חסכוני יותר.`),
    } : {
      q: `Which one uses less fuel?`,
      a: `Manufacturer figures for the petrol and hybrid trims: ${A.name} up to ${kmPerL(fa)} km/L (${fa} L/100km), ${B.name} up to ${kmPerL(fb)} km/L (${fb} L/100km). `
        + (same ? 'Consumption is almost the same.' : `The ${better} is more economical.`),
    });
  }

  const ca = A.spec.cargoMax, cb = B.spec.cargoMax;
  if (ca && cb) {
    const d = Math.abs(ca - cb);
    const bigger = ca > cb ? A.name : B.name;
    faq.push(he ? {
      q: `לאיזה רכב יש תא מטען גדול יותר?`,
      a: `נפח תא המטען של ${A.name} הוא ${ca} ליטר ושל ${B.name} ${cb} ליטר. `
        + (rel(ca, cb) < MIN_REL ? 'הנפח כמעט זהה.' : `${hp('ב', bigger)} יש תא מטען גדול יותר ב-${d} ליטר.`),
    } : {
      q: `Which one has more boot space?`,
      a: `The ${A.name} has ${ca} L of boot space and the ${B.name} ${cb} L. `
        + (rel(ca, cb) < MIN_REL ? 'They are almost the same.' : `The ${bigger} offers ${d} L more.`),
    });
  }

  return { verdict, faq };
}

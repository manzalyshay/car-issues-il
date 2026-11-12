/**
 * Facts for a model-vs-model compare page, shared by the page body (ComparePageView) and
 * its search snippet (generateMetadata), so Google shows the same numbers the page does.
 * Only real data: a fact is dropped when either side is missing or the two are nearly equal.
 */
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';
import { normEngine } from '@/lib/specSummary';

export type Consumption = { kind: 'fuel' | 'electric'; score: number; min: number; max: number };

/**
 * Model-level consumption, matching the model page: PHEV electric-range WLTP figures are
 * excluded from km/L. Fuel: km/L (higher is better). Electric: kWh/100km (lower is better).
 */
export function consumptionOf(trims: TrimSpecWithYear[]): Consumption | null {
  const electric = trims.filter(t => normEngine(t.engineType) === 'electric' && typeof t.fuelConsumption === 'number' && t.fuelConsumption > 0 && t.fuelConsumption <= 50);
  const combustion = trims.filter(t => {
    const engine = normEngine(t.engineType);
    return (engine === 'petrol' || engine === 'hybrid' || engine === 'diesel') && typeof t.fuelConsumption === 'number' && t.fuelConsumption >= 3 && t.fuelConsumption <= 20;
  });
  if (combustion.length) {
    const values = combustion.map(t => 100 / t.fuelConsumption!);
    return { kind: 'fuel', score: values.reduce((s, v) => s + v, 0) / values.length, min: Math.min(...values), max: Math.max(...values) };
  }
  if (electric.length) {
    const values = electric.map(t => t.fuelConsumption!);
    return { kind: 'electric', score: values.reduce((s, v) => s + v, 0) / values.length, min: Math.min(...values), max: Math.max(...values) };
  }
  return null;
}

const positiveMin = (trims: TrimSpecWithYear[], key: 'priceIls') => {
  const v = trims.map(t => t[key]).filter((x): x is number => typeof x === 'number' && x > 0);
  return v.length ? Math.min(...v) : null;
};
const positiveMax = (trims: TrimSpecWithYear[], key: 'cargoLiters' | 'engineHp') => {
  const v = trims.map(t => t[key]).filter((x): x is number => typeof x === 'number' && x > 0);
  return v.length ? Math.max(...v) : null;
};

/** Relative difference below this counts as "about the same". */
const NEAR = 0.02;
const differ = (a: number, b: number, threshold = NEAR) => Math.abs(a - b) / Math.max(a, b) >= threshold;

/** Owner ratings are only quoted from this many reviews per model; fewer looks unreliable. */
export const MIN_REVIEWS_TO_QUOTE = 5;

export interface SideData {
  name: string;
  trims: TrimSpecWithYear[];
  /** NHTSA recall count; only compared when both sides have records. */
  recalls: number;
  reviewCount: number;
  reviewAvg: number | null;
}

/** Which side wins each use case, with the numbers behind it. Missing = no real difference or no data. */
export interface UseCaseWinners {
  budget?: { win: 'a' | 'b'; cheap: number; dear: number };
  economy?: { win: 'a' | 'b'; kind: Consumption['kind']; best: number };
  space?: { win: 'a' | 'b'; big: number; small: number };
  power?: { win: 'a' | 'b'; hp: number; otherHp: number };
  recalls?: { win: 'a' | 'b'; few: number; many: number };
  owners?: { win: 'a' | 'b'; avg: number; count: number };
}

export function useCaseWinners(a: SideData, b: SideData): UseCaseWinners {
  const out: UseCaseWinners = {};
  const pa = positiveMin(a.trims, 'priceIls'), pb = positiveMin(b.trims, 'priceIls');
  if (pa && pb && differ(pa, pb)) out.budget = pa < pb ? { win: 'a', cheap: pa, dear: pb } : { win: 'b', cheap: pb, dear: pa };

  const ca = consumptionOf(a.trims), cb = consumptionOf(b.trims);
  if (ca && cb && ca.kind === cb.kind && differ(ca.score, cb.score)) {
    const aWins = ca.kind === 'electric' ? ca.score < cb.score : ca.score > cb.score;
    const w = aWins ? ca : cb;
    out.economy = { win: aWins ? 'a' : 'b', kind: w.kind, best: w.kind === 'electric' ? w.min : w.max };
  }

  const sa = positiveMax(a.trims, 'cargoLiters'), sb = positiveMax(b.trims, 'cargoLiters');
  if (sa && sb && differ(sa, sb, 0.05)) out.space = sa > sb ? { win: 'a', big: sa, small: sb } : { win: 'b', big: sb, small: sa };

  const ha = positiveMax(a.trims, 'engineHp'), hb = positiveMax(b.trims, 'engineHp');
  if (ha && hb && differ(ha, hb, 0.08)) out.power = ha > hb ? { win: 'a', hp: ha, otherHp: hb } : { win: 'b', hp: hb, otherHp: ha };

  // A zero may only mean "not sold in the US", so both sides need records and a clear gap.
  if (a.recalls > 0 && b.recalls > 0 && Math.max(a.recalls, b.recalls) >= 1.5 * Math.min(a.recalls, b.recalls) && Math.abs(a.recalls - b.recalls) >= 2) {
    out.recalls = a.recalls < b.recalls ? { win: 'a', few: a.recalls, many: b.recalls } : { win: 'b', few: b.recalls, many: a.recalls };
  }

  if (a.reviewCount >= MIN_REVIEWS_TO_QUOTE && b.reviewCount >= MIN_REVIEWS_TO_QUOTE && a.reviewAvg !== null && b.reviewAvg !== null && Math.abs(a.reviewAvg - b.reviewAvg) >= 0.3) {
    out.owners = a.reviewAvg > b.reviewAvg ? { win: 'a', avg: a.reviewAvg, count: a.reviewCount } : { win: 'b', avg: b.reviewAvg, count: b.reviewCount };
  }
  return out;
}

const ils = (v: number) => `₪${Math.round(v).toLocaleString('en-US')}`;

/**
 * Search snippet: lead with the concrete differences (price, fuel, recalls) instead of star
 * ratings from one or two reviews. Stars appear only with MIN_REVIEWS_TO_QUOTE reviews a side.
 */
export function compareSnippet(a: SideData, b: SideData, isEn: boolean): string {
  const w = useCaseWinners(a, b);
  const nm = (side: 'a' | 'b') => (side === 'a' ? a.name : b.name);
  // Each fact: who wins, the full clause (with the name) and the clause when the same car
  // already won the previous fact ("...and is also more fuel efficient").
  type F = { win: 'a' | 'b'; full: string; also: string };
  const facts: F[] = [];
  // Prices are Israeli list prices in ILS; carissues.net shows USD, so English skips this one.
  if (w.budget && !isEn) {
    const d = ils(w.budget.dear - w.budget.cheap);
    facts.push({ win: w.budget.win, full: `${nm(w.budget.win)} זול ב-${d}`, also: `גם זול ב-${d}` });
  }
  if (w.economy) {
    const v = w.economy.best.toFixed(1);
    const n = nm(w.economy.win);
    facts.push(w.economy.kind === 'electric'
      ? (isEn ? { win: w.economy.win, full: `the ${n} uses less energy (from ${v} kWh/100km)`, also: `uses less energy (from ${v} kWh/100km)` }
        : { win: w.economy.win, full: `${n} צורך פחות חשמל (מ-${v} קוט"ש/100 ק"מ)`, also: `גם צורך פחות חשמל (מ-${v} קוט"ש/100 ק"מ)` })
      : (isEn ? { win: w.economy.win, full: `the ${n} is more fuel efficient (up to ${v} km/L)`, also: `more fuel efficient (up to ${v} km/L)` }
        : { win: w.economy.win, full: `${n} חסכוני יותר (עד ${v} ק"מ/ל)`, also: `גם חסכוני יותר (עד ${v} ק"מ/ל)` }));
  }
  if (facts.length < 2 && w.recalls) facts.push(isEn
    ? { win: w.recalls.win, full: `the ${nm(w.recalls.win)} has fewer recalls (${w.recalls.few} vs ${w.recalls.many})`, also: `has fewer recalls (${w.recalls.few} vs ${w.recalls.many})` }
    : { win: w.recalls.win, full: `ל${nm(w.recalls.win)} פחות ריקולים (${w.recalls.few} מול ${w.recalls.many})`, also: `גם עם פחות ריקולים (${w.recalls.few} מול ${w.recalls.many})` });
  if (facts.length < 2 && w.space) facts.push(isEn
    ? { win: w.space.win, full: `the ${nm(w.space.win)} has the bigger trunk (${Math.round(w.space.big)} L)`, also: `has the bigger trunk (${Math.round(w.space.big)} L)` }
    : { win: w.space.win, full: `ל${nm(w.space.win)} תא מטען גדול יותר (${Math.round(w.space.big)} ליטר)`, also: `גם בעל תא מטען גדול יותר (${Math.round(w.space.big)} ליטר)` });
  if (facts.length < 2 && w.owners) facts.push(isEn
    ? { win: w.owners.win, full: `owners rate the ${nm(w.owners.win)} higher (${w.owners.avg.toFixed(1)}★, ${w.owners.count} reviews)`, also: `is rated higher by owners (${w.owners.avg.toFixed(1)}★)` }
    : { win: w.owners.win, full: `בעלי ${nm(w.owners.win)} מדרגים אותו גבוה יותר (${w.owners.avg.toFixed(1)}★, ${w.owners.count} ביקורות)`, also: `גם מדורג גבוה יותר בידי בעליו (${w.owners.avg.toFixed(1)}★)` });

  // Kept short: Google cuts descriptions around 150-160 characters.
  const lead = isEn ? `${a.name} or ${b.name}?` : `${a.name} או ${b.name}?`;
  const tail = isEn ? 'Price, fuel, recalls and common problems compared.' : 'השוואת מחיר, דלק, ריקולים ובעיות נפוצות.';
  if (facts.length === 0) return `${lead} ${tail}`;
  const [f1, f2] = facts;
  let body = f1.full;
  if (f2) {
    if (f2.win === f1.win) body += isEn ? ` and ${f2.also}` : ` ו${f2.also}`;
    else body += isEn ? `, while ${f2.full}` : `, ו${f2.full}`;
  }
  return `${lead} ${body.charAt(0).toUpperCase()}${body.slice(1)}. ${tail}`;
}

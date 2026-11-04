/**
 * Pure, client-safe helpers for pro-review score display (no DB imports, so
 * this can be bundled into client components without pulling in @opennextjs/cloudflare).
 */

export interface ProReviewSource {
  site: string;
  market: string | null;
  original: string;
  norm: number;
  date: string | null;
  url: string;
  author?: string;
  evidence?: string;
}

export interface ProReviewScoreSet {
  scoreKey: string;
  setIndex: number;
  score: number;
  n: number;
  generation: string | null;
  generationEn: string | null;
  years: string | null;
  powertrains: string[];
  powertrainsEn: string[];
  assessmentLevel: string | null;
  caveats: string[];
  caveatsEn: string[];
  testedVariants: string[];
  testedVariantsEn: string[];
  notApplicable: string[];
  notApplicableEn: string[];
  sources: ProReviewSource[];
}

/** Parses "2024-" / "2021-2023" into [start, end|null]. Returns null if unparsable. */
export function parseYearRange(years: string | null): [number, number | null] | null {
  if (!years) return null;
  const m = /^(\d{4})-(\d{4})?$/.exec(years.trim());
  if (!m) return null;
  return [parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : null];
}

/** Restricts a model's score sets to those whose `years` range covers the given year. */
export function filterScoreSetsForYear<T extends { years: string | null }>(sets: T[], year: number): T[] | null {
  const matching = sets.filter((s) => {
    const range = parseYearRange(s.years);
    if (!range) return false;
    const [start, end] = range;
    return year >= start && (end === null || year <= end);
  });
  return matching.length > 0 ? matching : null;
}

/** How many years before a model's newest year a test set may end and still count for it. */
export const TEST_YEAR_FALLBACK = 2;

/**
 * Score sets for a page about `year` of a model whose newest listed year is
 * `latestModelYear`. Uses the sets covering `year`; if none do and `year` is in
 * the last TEST_YEAR_FALLBACK years of the model's range, falls back to the sets
 * covering the closest earlier year in that window. Model year lists often run
 * a year or two past the end of production or the newest review (Huracan tests
 * 2014-2024, model listed to 2026). The window is anchored to the end of the
 * range so an older generation's test never stands in for a newer, untested one.
 */
export function scoreSetsForPageYear<T extends { years: string | null }>(sets: T[], year: number, latestModelYear: number | null): T[] | null {
  const exact = filterScoreSetsForYear(sets, year);
  if (exact || latestModelYear == null) return exact;
  const floor = latestModelYear - TEST_YEAR_FALLBACK;
  if (year < floor) return null;
  for (let y = year - 1; y >= floor; y--) {
    const m = filterScoreSetsForYear(sets, y);
    if (m) return m;
  }
  return null;
}

/** Weight of the external test-score average in the displayed headline score. */
export const TEST_SCORE_WEIGHT = 0.3;

/**
 * The score sets that count toward the headline score. A set assessed on a
 * single variant (e.g. an AMG C63 or Ioniq 5 N test) says little about the
 * range most buyers get, so it is left out of the average whenever the model
 * also has a range/powertrain-level set. It still appears in the sources
 * popup. If a model only has variant-level sets, those are used as-is.
 */
export function headlineScoreSets<T extends { assessmentLevel: string | null }>(sets: T[] | null | undefined): T[] {
  if (!sets || sets.length === 0) return [];
  const broad = sets.filter((s) => s.assessmentLevel !== 'variant');
  return broad.length > 0 ? broad : sets;
}

/** Unweighted mean of the headline-eligible sets' scores, or null if none. */
export function headlineTestScoreAvg(sets: Array<{ score: number; assessmentLevel: string | null }> | null | undefined): number | null {
  const used = headlineScoreSets(sets);
  if (used.length === 0) return null;
  return used.reduce((s, set) => s + set.score, 0) / used.length;
}

/**
 * Largest distance the displayed score may sit from the external test average.
 * The base reputation score has no stored sources, the test average does, so the
 * blend is clamped to stay within this band of what the verified tests say.
 */
export const MAX_TEST_DRIFT = 1.5;

/**
 * Blends the external test-score average into a base score (fixed 30% weight),
 * then keeps the result within MAX_TEST_DRIFT of the test average.
 */
export function blendWithTestScore(baseScore: number, testScoreAvg: number | null): number {
  if (testScoreAvg == null) return baseScore;
  const blended = baseScore * (1 - TEST_SCORE_WEIGHT) + testScoreAvg * TEST_SCORE_WEIGHT;
  return Math.min(testScoreAvg + MAX_TEST_DRIFT, Math.max(testScoreAvg - MAX_TEST_DRIFT, blended));
}

/** How far below the external tests a displayed score must be before the summary explains the model's weak points. */
export const BELOW_TESTS_NOTE_GAP = 1.0;

/** True when the displayed score sits clearly below the external test average. */
export function isClearlyBelowTests(displayScore: number | null, testScoreAvg: number | null): boolean {
  return displayScore != null && testScoreAvg != null && testScoreAvg - displayScore >= BELOW_TESTS_NOTE_GAP;
}

function formatYearsLabel(years: string | null, isHe: boolean): string | null {
  const range = parseYearRange(years);
  if (!range) return years;
  const [start, end] = range;
  if (end === null) return isHe ? `${start} ואילך` : `${start}+`;
  return `${start}–${end}`;
}

/**
 * Human label for a score set, shown whenever a model has more than one
 * applicable set so no block is left unexplained - e.g. "FX EV, 2024+" /
 * "FX petrol, 2022-2025" (spec format: powertrain/generation, then years).
 * Always includes years; prefixes the powertrain when the data has one, so
 * same-year siblings (e.g. Kona EV vs Kona petrol/hybrid, both "2023-") stay
 * distinguishable without relying on years alone.
 */
export function labelForScoreSet(set: ProReviewScoreSet, siblings: ProReviewScoreSet[], isHe: boolean): string | null {
  if (siblings.length <= 1) return null;
  const yearsLabel = formatYearsLabel(set.years, isHe);
  const powertrainList = isHe ? set.powertrains : (set.powertrainsEn.length ? set.powertrainsEn : set.powertrains);
  const powertrainLabel = powertrainList.length > 0 ? powertrainList.join(' / ') : null;
  if (powertrainLabel && yearsLabel) return `${powertrainLabel}, ${yearsLabel}`;
  return powertrainLabel ?? yearsLabel;
}

/** Minimum recall campaigns before the below-tests note mentions them. */
export const NOTE_MIN_RECALLS = 3;

/** Adds a closing period unless the text already ends with ? or !. */
function endSentence(s: string): string {
  return /[?!]$/u.test(s) ? s : `${s}.`;
}

function cleanConItem(raw: string, isEn: boolean): string {
  let s = raw.trim().replace(/[.;,\s]+$/u, '');
  // Curated Hebrew cons are sometimes split mid-sentence ("והמחיר לא זול"): drop the leading "and".
  if (!isEn && /^וה/u.test(s)) s = s.slice(1);
  return s;
}

/**
 * One summary sentence about the model's documented weak points, shown when its
 * displayed score sits clearly below the external tests. It talks about the cons
 * themselves (the model's curated cons list and its recall count), never about
 * the score. Returns null when there is nothing documented to say.
 */
export function belowTestsNote(opts: { cons: string[]; recallCount?: number | null; isEn: boolean }): string | null {
  const { isEn } = opts;
  const items = opts.cons
    .filter((c) => typeof c === 'string' && c.trim().length > 0 && (!isEn || !/[֐-׿]/.test(c)))
    .map((c) => cleanConItem(c, isEn))
    .filter((c) => c.length > 0)
    .slice(0, 2);
  const recalls = opts.recallCount != null && opts.recallCount >= NOTE_MIN_RECALLS ? opts.recallCount : null;
  if (items.length === 0 && recalls == null) return null;

  if (isEn) {
    const parts: string[] = [];
    if (items.length) {
      const list = items.map((c, i) => (i === 0 ? c.charAt(0).toUpperCase() + c.slice(1) : c.charAt(0).toLowerCase() + c.slice(1)));
      parts.push(`Worth weighing before buying: ${endSentence(list.join('; '))}`);
    }
    if (recalls != null) parts.push(`${items.length ? 'The model also has' : 'Worth weighing before buying: the model has'} ${recalls} recall campaigns on record.`);
    return parts.join(' ');
  }
  const parts: string[] = [];
  if (items.length) parts.push(`כדאי לקחת בחשבון לפני קנייה: ${endSentence(items.join('; '))}`);
  if (recalls != null) parts.push(`${items.length ? 'בנוסף, לדגם' : 'כדאי לקחת בחשבון לפני קנייה: לדגם'} רשומות ${recalls} קריאות ריקול.`);
  return parts.join(' ');
}

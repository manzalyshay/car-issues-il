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

/** Blends the external test-score average into a base score (fixed 30% weight). */
export function blendWithTestScore(baseScore: number, testScoreAvg: number | null): number {
  if (testScoreAvg == null) return baseScore;
  return baseScore * (1 - TEST_SCORE_WEIGHT) + testScoreAvg * TEST_SCORE_WEIGHT;
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

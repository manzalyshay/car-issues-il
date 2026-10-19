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
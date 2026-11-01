/**
 * Data hygiene for FAQ answers (visible FAQ + FAQPage JSON-LD).
 * FAQ answers must only state real, current, plausible facts.
 */
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';

// ── Placeholder / "no data" strings that sometimes end up in AI-generated cons ──
const PLACEHOLDER_HE = /(לא נמצא|לא נמצאו|לא אותר|אין מידע|אין נתונים|מידע מוגבל|נתונים מוגבלים|לא קיים מידע|לא היה ניתן למצוא)/;
const PLACEHOLDER_EN = /(\bno (full |complete |israeli |reliable |sufficient |official |verified )*(road[- ]?test|data|information|reviews?|rating)s?\b|\b(not|wasn'?t|were not|could not be) (found|located|verified)\b|\blimited (reliability |owner |test )?(data|information)\b|\binsufficient (data|information)\b|\bdata (not|un)available\b)/i;

/** True for "no data found"-style filler rather than a real pro/con. */
export function isPlaceholderText(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return true;
  return PLACEHOLDER_HE.test(s) || PLACEHOLDER_EN.test(s);
}

export function realItems(items: (string | null | undefined)[] | null | undefined): string[] {
  return (items ?? []).filter((s): s is string => !isPlaceholderText(s));
}

// ── Trim selection ───────────────────────────────────────────────────────────

/**
 * Trims currently sold in Israel: Israeli-market trims only, and when model years
 * are recorded, only the latest year. Returns [] when there are no Israeli trims.
 */
export function currentIsraeliTrims(trims: TrimSpecWithYear[]): TrimSpecWithYear[] {
  const il = trims.filter(t => t.isIsrael);
  const years = il.map(t => t.modelYear).filter((y): y is number => y != null);
  if (years.length === 0) return il;
  const latest = Math.max(...years);
  return il.filter(t => t.modelYear === latest);
}

// ── Plausibility bounds (drop data-entry outliers) ───────────────────────────
export const PLAUSIBLE = {
  hp:            { min: 40,  max: 1000 }, // hp
  accel:         { min: 2,   max: 25 },   // s, 0-100 km/h
  electricKwh:   { min: 5,   max: 40 },   // kWh/100km
  fuelL100:      { min: 3,   max: 20 },   // L/100km
  cargoLiters:   { min: 50,  max: 3000 },
} as const;

export const within = (v: number | null | undefined, b: { min: number; max: number }): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= b.min && v <= b.max;

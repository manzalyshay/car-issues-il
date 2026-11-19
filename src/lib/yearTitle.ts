/**
 * Hebrew <title> for a model-year page (/cars/<make>/<model>/<year>), kept to 60 characters
 * where possible (no "| CarIssues" suffix).
 *
 * Search Console (90 days to 2026-11-16): the newest year is found for new-car price searches
 * ("jetour t2 מחיר", "פאסאט 2026"), older years for used-car searches with the year
 * ("ניסאן קשקאי 2021 חוות דעת"). Bare-model searches ("סקודה קאמיק חוות דעת") belong to the
 * model hub, so the two title styles below always lead with the year-specific intent.
 *
 * Newest year:  "<make> <model> <year> ₪150K–₪180K – מחיר בישראל, גרסאות וחוות דעת"
 * Older years:  "<make> <model> <year> יד שנייה – חוות דעת, תקלות ואמינות"
 * With owner reviews for that year, the review count + rating replace the generic tail.
 * Longer candidates fall back to shorter ones; the last one is used even if it is over `max`.
 */
export interface YearTitleInput {
  makeHe: string;
  modelHe: string;
  year: number | string;
  isNewest: boolean;
  /** e.g. " ₪150K–₪180K" (leading space) or "" */
  priceHook?: string;
  reviewCount?: number;
  /** average 1-5 */
  rating?: number | null;
}

export function hebrewYearTitle(input: YearTitleInput, max = 60): string {
  const { makeHe, modelHe, year, isNewest, priceHook = '', reviewCount = 0, rating = null } = input;
  const name = `${makeHe} ${modelHe} ${year}`;
  const reviews = reviewCount > 0
    ? `${reviewCount} ביקורות בעלים${rating ? ` ⭐ ${rating.toFixed(1)}` : ''}`
    : '';
  const candidates = isNewest
    ? [
        ...(reviews ? [`${name}${priceHook} – ${reviews} | מחיר וגרסאות`, `${name} – ${reviews} | מחיר וגרסאות`] : []),
        `${name}${priceHook} – מחיר בישראל, גרסאות וחוות דעת`,
        `${name} – מחיר בישראל, גרסאות וחוות דעת`,
        `${name} – מחיר וחוות דעת`,
      ]
    : [
        ...(reviews ? [`${name} יד שנייה – ${reviews} | תקלות ואמינות`, `${name} – ${reviews} | אמינות`] : []),
        `${name} יד שנייה – חוות דעת, תקלות ואמינות`,
        `${name} – חוות דעת, תקלות ואמינות`,
        `${name} – חוות דעת ואמינות`,
      ];
  return candidates.find((t) => t.length <= max) ?? candidates[candidates.length - 1];
}

/**
 * Hebrew <title> for a model hub page (/cars/<make>/<model>), kept to 60 characters
 * (no "| CarIssues" suffix).
 *
 * Search Console (90 days to 2026-11-14) shows the hub pages are found for the bare
 * model name, in Hebrew AND in English ("מאזדה 3", "mazda 3", "hyundai i20", "kia stonic"),
 * so the title carries both names. The year range is left out: year-specific queries
 * belong to the /<year> pages, and "מאזדה 3 2014-2026" read as a different model name.
 *
 * Tried in order, first one that fits wins:
 *   1. "<make> <model> (<Make Model>) — חוות דעת, בעיות נפוצות ומחיר"
 *   2. "<make> <model> (<Make Model>) — חוות דעת ובעיות נפוצות"
 *   3. "<make> <model> — <tail>"   (no English)
 *   4. "<model> — <tail>"           (make dropped, only for model names of 3+ chars)
 * "ומחיר" only when the model has an Israeli trim price.
 */
export function hebrewModelTitle(
  makeHe: string, modelHe: string, makeEn: string, modelEn: string, hasPrice: boolean, max = 60,
): string {
  const longTail = hasPrice ? 'חוות דעת, בעיות נפוצות ומחיר' : 'חוות דעת ובעיות נפוצות';
  const shortTail = 'חוות דעת ובעיות נפוצות';
  // "Mazda Mazda3" -> "Mazda3"
  const en = modelEn.toLowerCase().startsWith(makeEn.toLowerCase()) ? modelEn : `${makeEn} ${modelEn}`;
  const he = `${makeHe} ${modelHe}`;
  const candidates = [
    `${he} (${en}) — ${longTail}`,
    `${he} (${en}) — ${shortTail}`,
    `${he} — ${longTail}`,
    ...(modelHe.length >= 3 ? [`${modelHe} — ${longTail}`] : []),
  ];
  return candidates.find((t) => t.length <= max) ?? candidates[candidates.length - 1];
}

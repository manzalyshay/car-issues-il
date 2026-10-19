import { dbFirst } from './db';

export interface PricePoint {
  year: number;
  price_usd: number;
  price_ils: number;
}

// Typical used-car market value as % of new price, by years old
// Based on standard auto market depreciation research (iSeeCars, CarEdge, KBB)
const DEPRECIATION = [
  1.00, // 0 yr old (new, 2026)
  0.80, // 1 yr old (2025)
  0.70, // 2 yr old (2024)
  0.62, // 3 yr old (2023)
  0.55, // 4 yr old (2022)
  0.50, // 5 yr old (2021)
  0.45, // 6 yr old (2020)
  0.41, // 7 yr old (2019)
  0.37, // 8 yr old (2018)
  0.34, // 9 yr old (2017)
  0.31, // 10 yr old (2016)
];

const CURRENT_YEAR = 2026;
const ILS_TO_USD = 3.7;

/**
 * Returns estimated used-car market value for model years the car actually existed.
 * Uses the model's years array from the DB to determine the earliest year to show.
 */
export async function getPriceHistory(makeSlug: string, modelSlug: string): Promise<PricePoint[]> {
  const [trimRow, modelRow] = await Promise.all([
    dbFirst<{ price_ils: number }>(
      'SELECT MIN(price_ils) as price_ils FROM car_trims WHERE make_slug = ? AND model_slug = ? AND price_ils IS NOT NULL',
      makeSlug, modelSlug,
    ).catch(() => null),
    dbFirst<{ years: string }>(
      'SELECT years FROM car_models WHERE make_slug = ? AND slug = ? LIMIT 1',
      makeSlug, modelSlug,
    ).catch(() => null),
  ]);

  if (!trimRow?.price_ils) return [];

  const newIls = trimRow.price_ils;
  const newUsd = Math.round(newIls / ILS_TO_USD);

  // Determine earliest year to show from the model's years list
  let firstYear = CURRENT_YEAR - DEPRECIATION.length + 1; // default: oldest in curve
  if (modelRow?.years) {
    try {
      const years: number[] = JSON.parse(modelRow.years);
      if (years.length > 0) firstYear = Math.min(...years);
    } catch { /* ignore parse error */ }
  }

  return DEPRECIATION
    .map((mult, i) => ({ year: CURRENT_YEAR - i, mult }))
    .filter(({ year }) => year >= firstYear)
    .map(({ year, mult }) => ({
      year,
      price_ils: Math.round(newIls * mult / 1000) * 1000,
      price_usd: Math.round(newUsd * mult / 500) * 500,
    }))
    .reverse(); // oldest first
}

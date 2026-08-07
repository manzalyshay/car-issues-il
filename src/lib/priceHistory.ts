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
 * Returns estimated used-car market value for model years 2016–2026.
 * 2026 = current new price; earlier years = used car value today.
 */
export async function getPriceHistory(makeSlug: string, modelSlug: string): Promise<PricePoint[]> {
  const row = await dbFirst<{ price_ils: number }>(
    'SELECT MIN(price_ils) as price_ils FROM car_trims WHERE make_slug = ? AND model_slug = ? AND price_ils IS NOT NULL',
    makeSlug, modelSlug,
  ).catch(() => null);

  if (!row?.price_ils) return [];

  const newIls = row.price_ils;
  const newUsd = Math.round(newIls / ILS_TO_USD);

  return DEPRECIATION.map((mult, i) => ({
    year: CURRENT_YEAR - i,
    price_ils: Math.round(newIls * mult / 1000) * 1000,
    price_usd: Math.round(newUsd * mult / 500) * 500,
  })).reverse(); // oldest first (2016 → 2026)
}

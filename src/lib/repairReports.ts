import { dbAll } from './db';

export interface UserRepairReport {
  id?: string;
  make_slug: string;
  model_slug: string;
  year?: number | null;
  mileage?: number | null;
  repair_key: string;
  repair_name_he: string;
  cost_ils: number;
  workshop_type?: string | null;
  notes?: string | null;
  created_at: string;
}

/** Publicly display only distinct reports within the site's published price ranges. */
export async function getValidatedRepairReports(limit = 100): Promise<UserRepairReport[]> {
  const [reports, ranges] = await Promise.all([
    dbAll<UserRepairReport>(
      'SELECT id, make_slug, model_slug, year, mileage, repair_key, repair_name_he, cost_ils, workshop_type, notes, created_at FROM user_repair_costs ORDER BY created_at DESC LIMIT 1000',
    ),
    dbAll<{ repair_key: string; min_ils: number; max_ils: number }>(
      'SELECT repair_key, MIN(cost_min_ils) AS min_ils, MAX(cost_max_ils) AS max_ils FROM repair_costs WHERE cost_min_ils IS NOT NULL AND cost_max_ils IS NOT NULL GROUP BY repair_key',
    ),
  ]);
  const rangeByKey = new Map(ranges.map(r => [r.repair_key, r]));
  const seen = new Set<string>();
  const valid: UserRepairReport[] = [];
  for (const row of reports) {
    const range = rangeByKey.get(row.repair_key);
    if (!range || !Number.isFinite(row.cost_ils) || row.cost_ils < range.min_ils || row.cost_ils > range.max_ils) continue;
    const key = `${row.make_slug}/${row.model_slug}/${row.repair_key}/${row.cost_ils}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(row);
    if (valid.length >= limit) break;
  }
  return valid;
}

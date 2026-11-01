/**
 * Known car issues from the known_issues table (scraped from CarComplaints, NHTSA, etc.)
 */
import { dbAll } from './db';

export interface KnownIssue {
  id: string;
  makeSlug: string;
  modelSlug: string;
  title: string;
  modelYear: number | null;
  source: string;
  sourceUrl: string | null;
  rank: number | null;
}

/**
 * `year`, when given, restricts to issues whose own `model_year` is within one
 * generation (8 years) of the inspected car - rows with no model_year are kept
 * (the table rarely has it, so excluding them would empty most results).
 */
export async function getKnownIssues(makeSlug: string, modelSlug: string, limit = 10, year?: number): Promise<KnownIssue[]> {
  try {
    const rows = await dbAll<Record<string, unknown>>(
      `SELECT id, make_slug, model_slug, title, model_year, source, source_url, rank
       FROM known_issues
       WHERE make_slug = ? AND model_slug = ?
       ORDER BY rank IS NULL, rank
       LIMIT ?`,
      makeSlug, modelSlug, limit * 3,
    );
    const issues = rows.map((r) => ({
      id: r.id as string,
      makeSlug: r.make_slug as string,
      modelSlug: r.model_slug as string,
      title: r.title as string,
      modelYear: r.model_year as number | null,
      source: r.source as string,
      sourceUrl: r.source_url as string | null,
      rank: r.rank as number | null,
    }));
    const filtered = year == null
      ? issues
      : issues.filter((i) => i.modelYear == null || Math.abs(i.modelYear - year) <= 8);
    return filtered.slice(0, limit);
  } catch {
    return [];
  }
}

/** Human-readable label for a known issue source identifier. */
export function knownIssueSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    carcomplaints: 'CarComplaints.com',
    nhtsa: 'NHTSA',
    edmunds: 'Edmunds',
    carscom: 'Cars.com',
    reddit: 'Reddit',
  };
  return labels[source?.toLowerCase()] ?? source ?? 'Unknown';
}

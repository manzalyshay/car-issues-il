/**
 * Known car issues from the known_issues table (scraped from CarComplaints, NHTSA, etc.)
 */
import { dbAll } from './db';

export interface KnownIssue {
  id: string;
  makeSlug: string;
  modelSlug: string;
  title: string;
  source: string;
  sourceUrl: string | null;
  rank: number | null;
}

export async function getKnownIssues(makeSlug: string, modelSlug: string, limit = 10): Promise<KnownIssue[]> {
  try {
    const rows = await dbAll<Record<string, unknown>>(
      `SELECT id, make_slug, model_slug, title, source, source_url, rank
       FROM known_issues
       WHERE make_slug = ? AND model_slug = ?
       ORDER BY rank IS NULL, rank
       LIMIT ?`,
      makeSlug, modelSlug, limit,
    );
    return rows.map((r) => ({
      id: r.id as string,
      makeSlug: r.make_slug as string,
      modelSlug: r.model_slug as string,
      title: r.title as string,
      source: r.source as string,
      sourceUrl: r.source_url as string | null,
      rank: r.rank as number | null,
    }));
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

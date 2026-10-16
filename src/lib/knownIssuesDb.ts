import { dbAll } from './db';

/** Top reported problems scraped from third-party complaint sites (currently CarComplaints, English titles). */
export interface KnownIssue {
  title: string;
  rank: number | null;
  modelYear: number | null;
  avgMileage: number | null;
  source: string;
  sourceUrl: string | null;
}

export async function getKnownIssues(makeSlug: string, modelSlug: string, limit = 5): Promise<KnownIssue[]> {
  const rows = await dbAll<{ title: string; rank: number | null; model_year: number | null; avg_mileage: number | null; source: string; source_url: string | null }>(
    'SELECT title, rank, model_year, avg_mileage, source, source_url FROM known_issues WHERE make_slug = ? AND model_slug = ? ORDER BY rank IS NULL, rank LIMIT ?',
    makeSlug, modelSlug, limit,
  ).catch(() => []);
  return rows.map((r) => ({
    title: r.title, rank: r.rank, modelYear: r.model_year, avgMileage: r.avg_mileage, source: r.source, sourceUrl: r.source_url,
  }));
}

export function knownIssueSourceLabel(source: string): string {
  return source === 'carcomplaints' ? 'CarComplaints.com' : source;
}

/**
 * Honest labelling for AI summaries (expert_reviews rows). Most rows are generated from the
 * LLM's general knowledge ("AI Knowledge" / "CarIssues Knowledge", no posts behind them) —
 * those must never be presented as based on owner reviews.
 */
export interface AiSourceInput {
  sourceName?: string | null;
  localPostCount?: number | null;
  globalPostCount?: number | null;
}

const KNOWLEDGE_SOURCES = new Set(['AI Knowledge', 'CarIssues Knowledge', 'CarIssues Expert Review', 'CarIssues', '']);

export function isOwnerPostBased(r: AiSourceInput | null | undefined): boolean {
  if (!r) return false;
  const posts = (r.localPostCount ?? 0) + (r.globalPostCount ?? 0);
  return posts > 0 && !KNOWLEDGE_SOURCES.has(r.sourceName ?? '');
}

/** One-line source label for an AI summary. */
export function aiSourceLabel(r: AiSourceInput | null | undefined, isEn: boolean): string {
  if (isOwnerPostBased(r)) {
    const posts = (r!.localPostCount ?? 0) + (r!.globalPostCount ?? 0);
    const src = r!.sourceName ? ` (${r!.sourceName})` : '';
    return isEn ? `AI summary of ${posts} owner posts${src}` : `סיכום AI של ${posts} פוסטים של בעלי רכב${src}`;
  }
  return isEn
    ? 'AI summary from general knowledge — not based on owner reviews on this site'
    : 'סיכום AI על בסיס ידע כללי — לא מבוסס על ביקורות בעלים באתר';
}

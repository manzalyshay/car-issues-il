/**
 * Weaknesses taken from published road tests (model_synthesis): each item is a
 * finding from a named article, stored with the site and link it came from.
 */
import { dbAll } from './db';

export interface ArticleFinding {
  text: string;
  site: string;
  url: string | null;
}

interface StoredFinding { text_he?: string; text_en?: string; source_site?: string; source_url?: string }

/** Price and value remarks are not faults of the car - keep them out of a problems list. */
const NOT_A_FAULT = /מחיר|תמחור|יקר|ש"ח|ש״ח|₪|\bpric|\bexpensive|\bcost|\bNIS\b|£|\$/i;

export function pickFaultFindings(stored: StoredFinding[], locale: 'he' | 'en', limit = 5): ArticleFinding[] {
  const out: ArticleFinding[] = [];
  const seen = new Set<string>();
  for (const f of stored) {
    const text = (locale === 'en' ? f.text_en : f.text_he)?.trim();
    if (!text || !f.source_site || seen.has(text)) continue;
    if (NOT_A_FAULT.test(f.text_he ?? '') || NOT_A_FAULT.test(f.text_en ?? '')) continue;
    seen.add(text);
    out.push({ text, site: f.source_site, url: f.source_url ?? null });
    if (out.length >= limit) break;
  }
  return out;
}

export async function getArticleWeaknesses(makeSlug: string, modelSlug: string, locale: 'he' | 'en'): Promise<ArticleFinding[]> {
  const rows = await dbAll<{ weaknesses: string }>(
    `SELECT weaknesses FROM model_synthesis WHERE make_slug = ? AND model_slug = ? ORDER BY set_index`,
    makeSlug, modelSlug,
  ).catch(() => []);
  const stored: StoredFinding[] = [];
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.weaknesses);
      if (Array.isArray(parsed)) stored.push(...parsed);
    } catch { /* skip malformed row */ }
  }
  return pickFaultFindings(stored, locale);
}

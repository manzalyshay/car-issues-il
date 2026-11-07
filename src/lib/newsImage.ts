/**
 * Finds a freely licensed Wikimedia Commons photo for a news article.
 * Source-site images (e.g. cdn.motor1.com) are not ours to republish, so
 * articles get a Commons photo of the car they are about, with attribution.
 */
import { runWorkersAI } from '@/lib/workersAi';

export interface NewsImage {
  url: string;
  author: string | null;
  license: string;
  sourceUrl: string;
}

const UA = 'CarIssuesBot/1.0 (https://carissues.co.il)';

export { isUsableNewsImage } from './newsImageUrl';

const BAD_FILE = /interior|dashboard|engine|cockpit|logo|badge|emblem|wheel|seat|detail|steering|\.svg|\.gif/i;

/** Ask the model for a short Commons search query naming the car in the headline. */
async function carQueryFromTitle(titleEn: string): Promise<string | null> {
  const prompt =
    'Name the single car (make and model, optionally generation) that this automotive news headline is about, ' +
    'as a short Wikimedia Commons search query of 2-5 words. If no specific car, name the most relevant car of the brand mentioned. ' +
    'Reply with the query only.\n\nHeadline: ' + titleEn;
  const raw = await runWorkersAI([{ role: 'user', content: prompt }], { max_tokens: 20, temperature: 0 });
  const q = raw?.split('\n')[0].replace(/["'`.*]/g, '').trim();
  return q && q.length <= 60 ? q : null;
}

const MAKE_ALIASES: Record<string, string> = { chevy: 'Chevrolet', vw: 'Volkswagen', merc: 'Mercedes-Benz', benz: 'Mercedes-Benz' };
// Words that describe a car but never identify the model, so they can't be the model token.
const GENERIC = new Set([
  'the', 'a', 'an', 'new', 'all', 'all-new', 'next', 'first', 'second', 'third', 'fourth', 'fifth',
  'generation', 'gen', 'facelift', 'refresh', 'refreshed', 'updated', 'model', 'models', 'car', 'cars',
  'suv', 'crossover', 'sedan', 'hatchback', 'wagon', 'coupe', 'pickup', 'truck', 'ev', 'electric', 'hybrid',
  'concept', 'prototype', 'review', 'mk', 'mkii', 'mk2', 'my', 'and', 'with', 'is', 'gets', 'has', 'for',
]);

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/['’]s\b/g, '').split(/[^a-z0-9]+/).filter(Boolean);
}

// First words of two-word makes ("Land Rover", "Mercedes-Benz", "Mercedes-AMG", "Alfa Romeo"...).
const TWO_WORD_MAKE_START = new Set(['land', 'mercedes', 'alfa', 'aston', 'rolls', 'lynk']);

/** Tokens that identify the model: drop the make, years and generic words. */
export function modelTokens(query: string): string[] {
  const t = tokens(query).filter(w => !/^(19|20)\d{2}$/.test(w));
  const makeLen = TWO_WORD_MAKE_START.has(t[0]) ? 2 : 1;
  return t.slice(makeLen).filter(w => !GENERIC.has(w));
}

/** Fallback: leading capitalised words of the headline (usually "Make Model"). */
export function heuristicQuery(titleEn: string): string | null {
  const words = titleEn.replace(/['’]s\b/g, '').replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const caps: string[] = [];
  for (const w of words) {
    if (GENERIC.has(w.toLowerCase()) || /^(19|20)\d{2}$/.test(w)) { if (caps.length) break; continue; }
    if (/^[A-Z0-9]/.test(w)) caps.push(MAKE_ALIASES[w.toLowerCase()] ?? w);
    else if (caps.length) break;
    if (caps.length === 3) break;
  }
  return caps.length ? caps.join(' ') : null;
}

async function searchCommons(query: string): Promise<NewsImage | null> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '8',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '960',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  type Page = {
    index?: number; title: string;
    imageinfo?: { thumburl?: string; descriptionurl?: string; width?: number; height?: number;
      extmetadata?: Record<string, { value?: string }> }[];
  };
  const data = await res.json() as { query?: { pages?: Record<string, Page> } };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  // The photo must be of the model, not just the brand: Commons search is fuzzy, and a
  // brand-only match put a 1950s Bel Air on a 2027 Trax article. Require the model name
  // (first model token of the query) in the file name; a make-only query matches nothing.
  const model = modelTokens(query)[0];
  if (!model) return null;
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii?.thumburl || !ii.descriptionurl || BAD_FILE.test(p.title)) continue;
    if (!tokens(p.title).includes(model)) continue;
    if ((ii.width ?? 0) < (ii.height ?? 0) * 1.2) continue; // landscape only
    const license = ii.extmetadata?.LicenseShortName?.value ?? '';
    if (!/CC|public domain|PD/i.test(license)) continue;
    const author = (ii.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 120) || null;
    return { url: ii.thumburl, author, license, sourceUrl: ii.descriptionurl };
  }
  return null;
}

export async function findNewsImage(titleEn: string | null): Promise<NewsImage | null> {
  if (!titleEn) return null;
  const queries = [await carQueryFromTitle(titleEn).catch(() => null), heuristicQuery(titleEn)]
    .filter((q, i, arr): q is string => !!q && arr.indexOf(q) === i);
  for (const q of queries) {
    const img = await searchCommons(q).catch(() => null);
    if (img) return img;
  }
  return null;
}

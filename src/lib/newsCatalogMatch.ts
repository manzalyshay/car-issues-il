/**
 * Matches a news headline to a model in the site's catalogue, so an article with no
 * free Commons photo can use the site's own photo of that model (already licensed,
 * with attribution). Only an exact make + model match counts: a photo of a different
 * model from the same brand would misrepresent the story, so brand-only headlines
 * return null and the article stays unlisted until a real photo is found.
 */

export interface MatchMake {
  slug: string;
  nameEn: string;
  models: { slug: string; nameEn: string }[];
}

/** Other spellings of a make that headlines use. */
const MAKE_ALIASES: Record<string, string[]> = {
  volkswagen: ['VW'],
  mercedes: ['Mercedes-Benz', 'Mercedes Benz', 'Mercedes'],
  'land-rover': ['Range Rover'],
  chevrolet: ['Chevy'],
  'alfa-romeo': ['Alfa'],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Spaces, hyphens and dots are interchangeable ("CX-5" = "CX5" = "CX 5"). */
const flexible = (s: string) =>
  s.trim().split(/[\s\-.]+/).filter(Boolean).map(escape).join('[\\s\\-.]?');
const wordRe = (s: string) => new RegExp(`(?<![\\w-])${flexible(s)}(?![\\w-])`, 'i');

/** Model names that are also ordinary words; in a headline they count only right after the make. */
const COMMON_WORDS = new Set(['electric', 'spring', 'born', 'note', 'han', 'seal', 'leaf', 'venue', 'spark', 'jazz', 'kicks', 'cooper', 'tang', 'insight', 'discovery', 'defender', 'compass', 'colt', 'alto']);

/** Short, numeric or common-word model names ("3", "Q5", "Note") must follow the make directly ("Mazda 3"). */
const needsMakePrefix = (name: string) =>
  name.replace(/[\s\-.]/g, '').length <= 2 || /^\d+$/.test(name.trim()) || COMMON_WORDS.has(name.trim().toLowerCase());

/**
 * Makes are proper nouns: match as written or in capitals, so "a mini SUV" is not the Mini brand.
 * A digit may follow directly ("Mazda3", "MG4").
 */
const makeIn = (name: string, title: string) =>
  new RegExp(`(?<![\\w-])${flexible(name)}(?![A-Za-z-])`).test(title) ||
  new RegExp(`(?<![\\w-])${flexible(name.toUpperCase())}(?![A-Za-z-])`).test(title);

/** "Series 3" is written "3 Series" in headlines. */
const modelVariants = (bare: string) => {
  const m = bare.match(/^Series\s+(\d)$/i);
  return m ? [bare, `${m[1]} Series`] : [bare];
};

export function matchCatalogModel(
  title: string | null | undefined,
  makes: MatchMake[],
): { makeSlug: string; modelSlug: string } | null {
  if (!title) return null;
  let best: { makeSlug: string; modelSlug: string; len: number } | null = null;

  for (const make of makes) {
    const makeNames = [make.nameEn, ...(MAKE_ALIASES[make.slug] ?? [])].filter(Boolean);
    const foundMake = makeNames.filter((n) => makeIn(n, title));
    if (!foundMake.length) continue;

    for (const model of make.models) {
      const name = model.nameEn?.trim();
      if (!name) continue;
      // Catalogue names sometimes repeat the make ("Mazda CX-5"); match on the model part.
      // ("Mazda3", "MG4" -> "3", "4").
      // Only the make's own name is stripped: an alias like "Range Rover" is part of model names.
      const bare = name.replace(new RegExp(`^${escape(make.nameEn)}[\\s-]?(?=\\S)`, 'i'), '');
      if (!bare) continue;
      const hit = modelVariants(bare).some((v) => needsMakePrefix(v)
        ? foundMake.some((m) => new RegExp(`(?<![\\w-])${flexible(m)}[\\s-]?${flexible(v)}(?![\\w-])`, 'i').test(title))
        : wordRe(v).test(title));
      // Longest model name wins ("Corolla Cross" over "Corolla").
      if (hit && (!best || bare.length > best.len)) best = { makeSlug: make.slug, modelSlug: model.slug, len: bare.length };
    }
  }
  return best && { makeSlug: best.makeSlug, modelSlug: best.modelSlug };
}

/** Drop model years ("2028 Subaru Getaway" -> "Subaru Getaway") from a Commons search query. */
export function stripYears(q: string): string {
  return q.replace(/\b(19|20)\d{2}(\.\d)?\b/g, ' ').replace(/\s+/g, ' ').trim();
}

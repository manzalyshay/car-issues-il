/**
 * Server-side data for the "<model> <year>" summary block on /cars/[make]/[model]/[year]:
 *  - Israeli price per trim for that model year (car_trims rows of exactly that year);
 *  - what changed vs the previous model year (trims added / dropped, list-price changes),
 *    only when both years have their own trim rows;
 *  - the previous generation's known problems, only when pro_review_scores gives the
 *    current generation's start year and known_issues has dated rows before it.
 * Every part is null/empty when the data is missing - nothing is estimated.
 */
import { dbAll } from './db';
import { knownTitleHeStatic } from './translateCache';

const MIN_PLAUSIBLE_PRICE_ILS = 20000;

export interface YearTrim { name: string; hp: number | null; engineType: string | null; priceIls: number | null }
export interface YearChanges { prevYear: number; added: string[]; dropped: string[]; priceChanges: { name: string; from: number; to: number }[] }
export interface PrevGenProblems { genStart: number; fromYear: number; toYear: number; items: string[] }
export interface YearPageData {
  trims: YearTrim[];
  /** true when `trims` are the undated (current) price-list rows, used for the newest model year only. */
  trimsUndated: boolean;
  changes: YearChanges | null;
  prevGen: PrevGenProblems | null;
}

/** Start year of the generation that covers `year`, merging ranges that touch (pre/post facelift). */
export function generationStart(ranges: string[], year: number): number | null {
  const parsed = ranges
    .map((r) => r.match(/^(\d{4})\s*-\s*(\d{4})?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ from: +m[1], to: m[2] ? +m[2] : Infinity }))
    .sort((a, b) => a.from - b.from);
  const cover = parsed.find((r) => year >= r.from && year <= r.to);
  if (!cover) return null;
  let start = cover.from;
  for (let changed = true; changed;) {
    changed = false;
    for (const r of parsed) {
      if (r.from < start && r.to >= start - 1) { start = r.from; changed = true; }
    }
  }
  return start;
}

function uniqueTrims(rows: { name: string; engine_hp: number | null; engine_type: string | null; price_ils: number | null }[]): YearTrim[] {
  const byName = new Map<string, YearTrim>();
  for (const r of rows) {
    const price = r.price_ils != null && r.price_ils >= MIN_PLAUSIBLE_PRICE_ILS ? r.price_ils : null;
    const prev = byName.get(r.name);
    if (!prev || (prev.priceIls == null && price != null)) {
      byName.set(r.name, { name: r.name, hp: r.engine_hp, engineType: r.engine_type, priceIls: price });
    }
  }
  return [...byName.values()];
}

/** Trim identity that ignores word order and punctuation ("1.6 ל' Long, טורבו" == "1.6 ל' טורבו Long"). */
function trimKey(name: string): string {
  return name.toLowerCase().split(/[^0-9a-z\u05D0-\u05EA.]+/).filter(Boolean).sort().join(' ');
}

export async function getYearPageData(
  makeSlug: string, modelSlug: string, year: number, locale: 'he' | 'en', latestYear?: number | null,
): Promise<YearPageData> {
  const [rows, gens] = await Promise.all([
    dbAll<{ model_year: number; name: string; engine_hp: number | null; engine_type: string | null; price_ils: number | null }>(
      `SELECT model_year, name, engine_hp, engine_type, price_ils FROM car_trims
       WHERE make_slug = ? AND model_slug = ? AND is_israel = 1 AND (model_year IN (?, ?) OR model_year IS NULL)
       ORDER BY sort_order`,
      makeSlug, modelSlug, year, year - 1,
    ).catch(() => []),
    dbAll<{ years: string | null }>(
      'SELECT DISTINCT years FROM pro_review_scores WHERE make_slug = ? AND model_slug = ? AND years IS NOT NULL',
      makeSlug, modelSlug,
    ).catch(() => []),
  ]);

  // Most car_trims rows carry no model_year: they are the importer's current price list.
  // Those stand in for the newest model year only, and are labelled as such on the page.
  let trims = uniqueTrims(rows.filter((r) => r.model_year === year));
  let trimsUndated = false;
  if (!trims.length && latestYear === year) {
    trims = uniqueTrims(rows.filter((r) => r.model_year == null));
    trimsUndated = trims.length > 0;
  }
  const prevTrims = uniqueTrims(rows.filter((r) => r.model_year === year - 1));

  let changes: YearChanges | null = null;
  if (!trimsUndated && trims.length && prevTrims.length) {
    const prevBy = new Map(prevTrims.map((t) => [trimKey(t.name), t]));
    const curKeys = new Set(trims.map((t) => trimKey(t.name)));
    const priceChanges = trims
      .map((t) => ({ t, p: prevBy.get(trimKey(t.name)) }))
      .filter(({ t, p }) => p && t.priceIls != null && p.priceIls != null && t.priceIls !== p.priceIls)
      .map(({ t, p }) => ({ name: t.name, from: p!.priceIls!, to: t.priceIls! }));
    const added = trims.filter((t) => !prevBy.has(trimKey(t.name))).map((t) => t.name);
    const dropped = prevTrims.filter((t) => !curKeys.has(trimKey(t.name))).map((t) => t.name);
    if (added.length || dropped.length || priceChanges.length) changes = { prevYear: year - 1, added, dropped, priceChanges };
  }

  let prevGen: PrevGenProblems | null = null;
  const start = generationStart(gens.map((g) => g.years ?? ''), year);
  if (start) {
    const fromYear = start - 8;
    const issues = await dbAll<{ title: string; y0: number; y1: number }>(
      `SELECT title, MIN(model_year) AS y0, MAX(model_year) AS y1, MIN(rank IS NULL) AS unranked, MIN(rank) AS r FROM known_issues
       WHERE make_slug = ? AND model_slug = ? AND model_year BETWEEN ? AND ?
       GROUP BY title ORDER BY unranked, r, COUNT(*) DESC LIMIT 12`,
      makeSlug, modelSlug, fromYear, start - 1,
    ).catch(() => []);
    const shown = issues
      .map((i) => ({ ...i, text: locale === 'he' ? knownTitleHeStatic(i.title) : i.title }))
      .filter((i): i is typeof i & { text: string } => !!i.text)
      .slice(0, 5);
    if (shown.length) {
      prevGen = {
        genStart: start,
        fromYear: Math.min(...shown.map((i) => i.y0)),
        toYear: Math.max(...shown.map((i) => i.y1)),
        items: shown.map((i) => i.text),
      };
    }
  }

  return { trims, trimsUndated, changes, prevGen };
}

/**
 * Single source of truth for which programmatic pages are indexable.
 *
 * The sitemap and the pages' robots meta both call into this module, so a URL is
 * either in the sitemap and indexable, or out of the sitemap and noindex — never a
 * mix. Errors are thrown, not swallowed: callers decide how to fail (pages fail
 * open to `index`, so a transient D1 error can never cache a stray noindex).
 */
import { dbAll, dbFirst } from './db';
import { getAllMakes } from './carsDb';

// ── Model-year pages ──────────────────────────────────────────────────────────

/**
 * Expert reviews generated from the model's general knowledge ("AI Knowledge", or an
 * empty source with no scraped posts) read almost the same for every year, so they
 * don't make a year page distinct from its neighbours. Only reviews with a real source
 * count as year-specific content.
 */
const REAL_EXPERT_REVIEW_SQL = `year IS NOT NULL AND (
  COALESCE(source_name, '') NOT IN ('AI Knowledge', '')
  OR COALESCE(local_post_count, 0) + COALESCE(global_post_count, 0) > 0
)`;

/**
 * A model-year page is indexable when it is the model's newest year (new-car searches
 * like "octavia 2026" land there) or has content specific to that year: owner reviews
 * for the year, Israeli trims listed for the year, or a sourced expert review for the
 * year. Otherwise it shows the model's generic trims/prices and is a near-duplicate of
 * every other year.
 */
export async function isModelYearIndexable(
  makeSlug: string, modelSlug: string, year: number, modelYears: number[],
): Promise<boolean> {
  if (isNewestModelYear(year, modelYears)) return true;
  const row = await dbFirst<{ ok: number }>(
    `SELECT (
       EXISTS(SELECT 1 FROM reviews WHERE make_slug = ?1 AND model_slug = ?2 AND year = ?3)
       OR EXISTS(SELECT 1 FROM car_trims WHERE make_slug = ?1 AND model_slug = ?2 AND model_year = ?3 AND is_israel = 1)
       OR EXISTS(SELECT 1 FROM expert_reviews WHERE make_slug = ?1 AND model_slug = ?2 AND year = ?3 AND ${REAL_EXPERT_REVIEW_SQL})
     ) AS ok`,
    makeSlug, modelSlug, year,
  );
  return row?.ok === 1;
}

function isNewestModelYear(year: number, modelYears: number[]): boolean {
  return modelYears.length > 0 && year === Math.max(...modelYears);
}

/**
 * Model-years with year-specific content (same SQL rule as isModelYearIndexable),
 * as `make/model/year` keys.
 */
async function getModelYearsWithContent(): Promise<Set<string>> {
  const rows = await dbAll<{ make_slug: string; model_slug: string; year: number }>(
    `SELECT make_slug, model_slug, year FROM reviews
     UNION SELECT make_slug, model_slug, model_year FROM car_trims WHERE is_israel = 1 AND model_year IS NOT NULL
     UNION SELECT make_slug, model_slug, year FROM expert_reviews WHERE ${REAL_EXPERT_REVIEW_SQL}`,
  );
  return new Set(rows.map((r) => `${r.make_slug}/${r.model_slug}/${r.year}`));
}

/** Returns a predicate implementing isModelYearIndexable for every model in one query. */
export async function getModelYearIndexability(): Promise<
  (makeSlug: string, modelSlug: string, year: number, modelYears: number[]) => boolean
> {
  const withContent = await getModelYearsWithContent();
  return (makeSlug, modelSlug, year, modelYears) =>
    isNewestModelYear(year, modelYears) || withContent.has(`${makeSlug}/${modelSlug}/${year}`);
}

// ── Compare pages ─────────────────────────────────────────────────────────────

/**
 * Pairs that get real Search Console clicks but fall outside the rule below, mostly
 * cross-category rivals (Stonic vs Fabia, Sportage vs Octavia) or models whose
 * used-price data is off. Source: carissues.co.il, pairs with ≥4 clicks in
 * 2026-07-14..2026-10-12 that the rule doesn't keep. Keys are sorted `make/model`.
 */
const SEARCHED_COMPARE_PAIRS = new Set([
  'kia/stonic|skoda/fabia', 'seat/arona|skoda/fabia', 'hyundai/i20|kia/stonic',
  'skoda/kodiaq|toyota/rav4', 'hyundai/tucson|kia/niro', 'lexus/ux|toyota/rav4',
  'chery/tiggo7|kia/sportage', 'kia/sportage|skoda/octavia', 'hyundai/kona|skoda/octavia',
  'kia/niro|toyota/corolla', 'kia/stonic|toyota/yaris', 'lexus/nx|toyota/rav4',
  'subaru/forester|toyota/rav4', 'byd/atto3|hyundai/kona', 'byd/seal|mg/ehs',
  'byd/seal|toyota/corolla-cross', 'byd/sealion6|toyota/rav4', 'chevrolet/spark|hyundai/i20',
  'chevrolet/trailblazer|kia/seltos', 'honda/crv|toyota/rav4', 'hyundai/tucson|lexus/nx',
  'toyota/rav4|volkswagen/tiguan', 'hyundai/venue|suzuki/swift', 'jeep/grand-cherokee|subaru/forester',
  'mazda/cx5|toyota/chr', 'mazda/cx5|toyota/rav4', 'mazda/mazda3|volkswagen/golf',
  'ssangyong/rexton|subaru/forester', 'subaru/forester|toyota/land-cruiser',
]);

/**
 * Brands with too little Israeli search demand for cross-brand comparisons; their
 * models are still compared with siblings from the same brand.
 */
const LONG_TAIL_MAKES = new Set([
  'jetour', 'gac', 'changan', 'leapmotor', 'xpeng', 'maxus', 'omoda', 'jaecoo', 'lynk-co',
  'haval', 'isuzu', 'infiniti', 'genesis', 'citroen', 'chevrolet', 'lamborghini', 'maserati',
  'polestar', 'alfa-romeo', 'porsche', 'land-rover',
]);

/** Body types shoppers cross-shop within one brand (Yaris vs Yaris Cross, Camry vs RAV4). */
const CROSS_SHOPPED_CATEGORIES = new Set(['suv', 'hatchback', 'sedan', 'electric']);

/** Max ratio between the two models' used-market prices for a same-category pair. */
const MAX_PRICE_RATIO = 1.5;

interface CompareModel { key: string; make: string; category: string; price: number | null }

export interface ComparePolicy {
  isIndexable(keyA: string, keyB: string): boolean;
  /** Indexable pairs as sorted `[keyA, keyB]` tuples (keys are `make/model`). */
  pairs(): [string, string][];
}

let _policy: { at: number; value: ComparePolicy } | null = null;
const POLICY_TTL_MS = 60 * 60 * 1000;

/**
 * Which compare pairs are worth indexing. Of ~14k same-category pairs only ~1.4k ever
 * got an impression, so a pair is kept when it is plausibly searched:
 *   - two models of the same brand in the same or a cross-shopped body type, or
 *   - two non-long-tail brands, same category, used prices within MAX_PRICE_RATIO, or
 *   - it is in SEARCHED_COMPARE_PAIRS.
 * Price is the latest-year private (else dealer) average from price_seller_type,
 * which covers every model, unlike new-car trim prices.
 */
export async function getComparePolicy(): Promise<ComparePolicy> {
  if (_policy && Date.now() - _policy.at < POLICY_TTL_MS) return _policy.value;

  const [makes, priceRows] = await Promise.all([
    getAllMakes(),
    dbAll<{ make_slug: string; model_slug: string; price: number | null }>(
      `SELECT p.make_slug, p.model_slug, COALESCE(p.private_avg, p.dealer_avg) AS price
       FROM price_seller_type p
       JOIN (
         SELECT make_slug, model_slug, MAX(year) AS y FROM price_seller_type
         WHERE COALESCE(private_avg, dealer_avg) > 0 GROUP BY make_slug, model_slug
       ) l ON l.make_slug = p.make_slug AND l.model_slug = p.model_slug AND l.y = p.year`,
    ),
  ]);
  if (makes.length === 0) throw new Error('getComparePolicy: no makes loaded');

  const prices = new Map(priceRows.map((r) => [`${r.make_slug}/${r.model_slug}`, r.price]));
  const models = new Map<string, CompareModel>();
  for (const make of makes) {
    for (const model of make.models) {
      const key = `${make.slug}/${model.slug}`;
      const price = prices.get(key);
      models.set(key, { key, make: make.slug, category: model.category, price: price && price > 0 ? price : null });
    }
  }

  const keep = (a: CompareModel, b: CompareModel): boolean => {
    const [k1, k2] = [a.key, b.key].sort();
    if (SEARCHED_COMPARE_PAIRS.has(`${k1}|${k2}`)) return true;
    if (a.make === b.make) {
      return a.category === b.category
        || (CROSS_SHOPPED_CATEGORIES.has(a.category) && CROSS_SHOPPED_CATEGORIES.has(b.category));
    }
    if (LONG_TAIL_MAKES.has(a.make) || LONG_TAIL_MAKES.has(b.make)) return false;
    if (a.category !== b.category || a.price === null || b.price === null) return false;
    return Math.max(a.price, b.price) / Math.min(a.price, b.price) <= MAX_PRICE_RATIO;
  };

  let pairList: [string, string][] | null = null;
  const value: ComparePolicy = {
    isIndexable(keyA, keyB) {
      const a = models.get(keyA);
      const b = models.get(keyB);
      return !!a && !!b && keyA !== keyB && keep(a, b);
    },
    pairs() {
      if (!pairList) {
        const sorted = [...models.values()].sort((x, y) => (x.key < y.key ? -1 : 1));
        pairList = [];
        for (let i = 0; i < sorted.length; i++) {
          for (let j = i + 1; j < sorted.length; j++) {
            if (keep(sorted[i], sorted[j])) pairList.push([sorted[i].key, sorted[j].key]);
          }
        }
      }
      return pairList;
    },
  };
  _policy = { at: Date.now(), value };
  return value;
}

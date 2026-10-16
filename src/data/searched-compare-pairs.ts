/**
 * Compare pairs people actually search for (Search Console queries containing
 * "vs" / "מול" / "או"), mapped to the site's make/model slugs.
 *
 * These are included in the sitemap and linked from model pages EVEN WHEN the two models
 * are in different categories (the automatic sitemap pairs only same-category models).
 *
 * ── Adding pairs for a new model launch ────────────────────────────────────────────
 * When a model is added to car_models, add ~5 entries pairing it with its obvious
 * rivals: same price band and body size first, then the best-selling model it is
 * cross-shopped against (e.g. a new Chinese EV crossover → Atto 3, MG4, Kona,
 * Model Y, Sealion 6). Use the exact slugs from car_models; order inside a pair
 * doesn't matter. Check Search Console a few weeks later and replace pairs nobody
 * searches for.
 */
export const SEARCHED_COMPARE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['chery/tiggo7', 'volvo/ex30'],          // 'chery tiggo 7 vs volvo ex30'
  ['byd/seal', 'tesla/model-3'],           // 'byd seal vs טסלה מודל 3'
  ['byd/sealion7', 'fiat/500e'],           // 'byd sealion 7 vs fiat 500e'
  ['omoda/omoda9', 'jaecoo/jaecoo8'],      // 'omoda 9 vs jaecoo 8'
  ['byd/atto3', 'hyundai/kona'],           // 'byd atto 3 מול יונדאי קונה חשמלית' (no separate Kona Electric model)
  ['mg/hs', 'mg/mg-zs'],                   // 'mg zs vs hs'
  ['hyundai/kona', 'toyota/corolla-cross'], // 'יונדאי קונה או טויוטה קורולה קרוס'
];

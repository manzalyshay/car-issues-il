/**
 * Compare pages included in the Russian pilot (carissues.co.il/ru/cars/compare/...).
 * The 50 most important pairs: most-clicked (TOP_COMPARE_PAIRS), most-searched
 * (SEARCHED_COMPARE_PAIRS), then the most popular Israeli-market pairs from the compare hub.
 * Any other /ru compare URL returns 404 rather than a thin page. See docs/ru-pilot-plan.md.
 */
import { canonicalComparePath } from '@/lib/comparePairs';

export const RU_COMPARE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['kia/sportage', 'toyota/corolla-cross'],
  ['kia/seltos', 'kia/sportage'],
  ['chery/tiggo8', 'mitsubishi/outlander'],
  ['kia/sorento', 'mitsubishi/outlander'],
  ['kia/niro', 'kia/seltos'],
  ['kia/niro', 'toyota/corolla-cross'],
  ['subaru/forester', 'subaru/outback'],
  ['suzuki/scross', 'toyota/yaris-cross'],
  ['toyota/chr', 'toyota/yaris-cross'],
  ['hyundai/kona', 'toyota/corolla-cross'],
  ['skoda/kamiq', 'skoda/karoq'],
  ['suzuki/scross', 'toyota/corolla-cross'],
  ['hyundai/kona', 'hyundai/tucson'],
  ['hyundai/kona', 'kia/seltos'],
  ['hyundai/tucson', 'toyota/corolla-cross'],
  ['lexus/nx', 'mazda/cx5'],
  ['seat/arona', 'skoda/fabia'],
  ['seat/arona', 'skoda/kamiq'],
  ['toyota/chr', 'toyota/corolla-cross'],
  ['honda/hrv', 'toyota/yaris-cross'],
  ['hyundai/elantra', 'hyundai/kona'],
  ['kia/seltos', 'suzuki/scross'],
  ['kia/stonic', 'skoda/fabia'],
  ['skoda/fabia', 'toyota/yaris'],
  ['skoda/karoq', 'skoda/octavia'],
  ['toyota/camry', 'toyota/corolla'],
  ['mg/hs', 'mg/mg-zs'],
  ['byd/atto3', 'mg/mg4'],
  ['byd/atto3', 'byd/seal'],
  ['hyundai/ioniq-5', 'tesla/model-y'],
  ['chery/tiggo7', 'volvo/ex30'],
  ['byd/seal', 'tesla/model-3'],
  ['byd/sealion7', 'fiat/500e'],
  ['omoda/omoda9', 'jaecoo/jaecoo8'],
  ['byd/atto3', 'hyundai/kona'],
  ['toyota/corolla-cross', 'skoda/karoq'],
  ['toyota/corolla-cross', 'toyota/yaris-cross'],
  ['toyota/corolla-cross', 'nissan/qashqai'],
  ['toyota/corolla-cross', 'kia/seltos'],
  ['toyota/corolla-cross', 'mazda/cx5'],
  ['toyota/corolla-cross', 'volkswagen/tiguan'],
  ['toyota/corolla-cross', 'mazda/cx30'],
  ['toyota/corolla-cross', 'honda/hrv'],
  ['toyota/corolla-cross', 'subaru/xv'],
  ['toyota/corolla-cross', 'mitsubishi/asx'],
  ['toyota/corolla-cross', 'toyota/rav4'],
  ['toyota/corolla-cross', 'peugeot/2008'],
  ['toyota/corolla-cross', 'opel/grandland'],
  ['nissan/qashqai', 'kia/sportage'],
  ['nissan/qashqai', 'hyundai/tucson'],
];

/** Canonical Hebrew compare paths ("/cars/compare/a/b/c/d") that have a Russian page. */
export const RU_COMPARE_PATHS: ReadonlySet<string> = new Set(RU_COMPARE_PAIRS.map(([a, b]) => canonicalComparePath(a, b)));

/** "/cars/compare/..." -> "/ru/cars/compare/..." when the pair is in the pilot, else null. */
export function ruComparePath(hePath: string): string | null {
  return RU_COMPARE_PATHS.has(hePath) ? `/ru${hePath}` : null;
}

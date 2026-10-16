/**
 * Most-clicked compare pages on carissues.co.il (Google Search Console, last 28 days
 * as of 2026-10-16). Drives the /cars/compare hub grid, llms.txt and the sitemaps.
 *
 * Order = click rank. Each entry is [makeSlug/modelSlug, makeSlug/modelSlug]; order inside
 * a pair doesn't matter — URLs are always built via canonicalComparePath().
 * Update from Search Console every few months (pages containing /cars/compare/, by clicks).
 */
export const TOP_COMPARE_PAIRS: ReadonlyArray<readonly [string, string]> = [
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
];

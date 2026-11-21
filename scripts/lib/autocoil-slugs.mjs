/**
 * Our car_models slug (make/model) -> auto.co.il path (https://www.auto.co.il/cars/<path>/),
 * where they differ. Checked against auto.co.il's make pages on 2026-11-21 (Mercedes is
 * under "mercedes/", no longer "mercedes-benz/"). Models whose auto.co.il page mixes in
 * other cars (e-208 in 208, 500e in 500, Cerato in Forte) are deliberately not mapped.
 */
export const AUTOCOIL_SLUGS = {
  'audi/etron': 'audi/e-tron', 'audi/q4-etron': 'audi/q4-e-tron',
  'bmw/series1': 'bmw/1-series', 'bmw/series2': 'bmw/2-series', 'bmw/series3': 'bmw/3-series',
  'bmw/series4': 'bmw/4-series', 'bmw/series5': 'bmw/5-series',
  'byd/atto2': 'byd/atto-2', 'byd/atto3': 'byd/atto-3', 'byd/sealion7': 'byd/sealion-7',
  'chery/arrizo8': 'chery/arrizo-8', 'chery/omoda-fx': 'chery/fx',
  'chery/tiggo4': 'chery/tiggo-4-pro', 'chery/tiggo7': 'chery/tiggo-7-pro', 'chery/tiggo8': 'chery/tiggo-8-pro',
  'honda/crv': 'honda/cr-v', 'honda/hrv': 'honda/hr-v',
  'hyundai/ioniq-5': 'hyundai/ionic-5',
  'isuzu/d-max': 'isuzu/dmax',
  'jaecoo/jaecoo5': 'jaecoo/5', 'jaecoo/jaecoo7': 'jaecoo/j7', 'jaecoo/jaecoo8': 'jaecoo/j8',
  'land-rover/range-rover-evoque': 'land-rover/range-rover-evoke', 'land-rover/range-rover-velar': 'land-rover/rover-velar',
  'lynk-co/01': 'lynkco/01', 'lynk-co/02': 'lynkco/02',
  'maxus/edeliver9': 'maxus/e-deliver-9', 'maxus/mifa9': 'maxus/mifa-9',
  'mazda/cx3': 'mazda/cx-3', 'mazda/cx5': 'mazda/cx-5', 'mazda/cx30': 'mazda/cx-30',
  'mazda/mazda2': 'mazda/2', 'mazda/mazda3': 'mazda/3', 'mazda/mazda5': 'mazda/5', 'mazda/mazda6': 'mazda/6',
  'mercedes/cla': 'mercedes/cla-class', 'mercedes/cls': 'mercedes/cls-class', 'mercedes/gla': 'mercedes/gla-class',
  'mercedes/glc': 'mercedes/glc-class', 'mercedes/gle': 'mercedes/gle-class', 'mercedes/glk': 'mercedes/glk-class',
  'mercedes/sl': 'mercedes/sl-class', 'mercedes/slk': 'mercedes/slk-class',
  'mg/ehs': 'mg/ehs-phev', 'mg/mg-zs': 'mg/zs',
  'mini/mini-electric': 'mini/cooper-electric',
  'mitsubishi/l200': 'mitsubishi/triton',
  'nissan/tiida': 'nissan/tida',
  'omoda/omoda9': 'omoda/9',
  'polestar/polestar-2': 'polestar/2',
  'skoda/enyaq': 'skoda/enyaq-iv',
  'toyota/chr': 'toyota/c-hr',
  'volkswagen/troc': 'volkswagen/t-roc',
};

/**
 * Turns a model's trim rows into a small, sanity-checked spec summary that page copy
 * (verdicts, FAQs, year/make pages) can safely quote. Values outside plausible ranges
 * are dropped instead of shown, and fuel figures only come from combustion trims —
 * the trims table mixes kWh/100km (EVs), plug-in WLTP figures and Hebrew engine labels.
 */

export type NormEngine = 'petrol' | 'hybrid' | 'phev' | 'electric' | 'diesel';

export interface TrimLike {
  name?: string;
  priceIls?: number | null;
  engineHp?: number | null;
  fuelConsumption?: number | null; // L/100km for combustion trims
  cargoLiters?: number | null;
  engineType?: string | null;
  modelYear?: number | null;
}

export interface SpecSummary {
  priceMin: number | null;
  priceMax: number | null;
  pricedTrims: number;
  hpMax: number | null;
  /** Best (lowest) combined consumption in L/100km over petrol/hybrid/diesel trims only. */
  fuelBest: number | null;
  cargoMax: number | null;
  engines: NormEngine[];
  allElectric: boolean;
}

export function normEngine(raw?: string | null): NormEngine | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === 'phev' || s.includes('plug') || s.includes('תקע') || s.includes('נטען')) return 'phev';
  if (s === 'electric' || s === 'ev' || s.includes('חשמל')) return 'electric';
  if (s === 'hybrid' || s.includes('היבר')) return 'hybrid';
  if (s === 'diesel' || s.includes('דיזל') || s.includes('סולר')) return 'diesel';
  if (s === 'petrol' || s === 'gasoline' || s.includes('בנזין') || s.includes('טורבו')) return 'petrol';
  return null;
}

const inRange = (v: number | null | undefined, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

export function summarizeTrims(trims: TrimLike[]): SpecSummary {
  const prices = trims.map((t) => t.priceIls).filter((v): v is number => inRange(v, 30_000, 3_000_000));
  const hps = trims.map((t) => t.engineHp).filter((v): v is number => inRange(v, 40, 1500));
  const cargo = trims.map((t) => t.cargoLiters).filter((v): v is number => inRange(v, 80, 2500));
  const engines = [...new Set(trims.map((t) => normEngine(t.engineType)).filter((e): e is NormEngine => e !== null))];
  const fuel = trims
    .filter((t) => {
      const e = normEngine(t.engineType);
      return e === 'petrol' || e === 'hybrid' || e === 'diesel';
    })
    .map((t) => t.fuelConsumption)
    .filter((v): v is number => inRange(v, 2.5, 20));
  return {
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    pricedTrims: prices.length,
    hpMax: hps.length ? Math.max(...hps) : null,
    fuelBest: fuel.length ? Math.min(...fuel) : null,
    cargoMax: cargo.length ? Math.max(...cargo) : null,
    engines,
    allElectric: engines.length > 0 && engines.every((e) => e === 'electric'),
  };
}

export const fmtIls = (v: number) => `₪${Math.round(v).toLocaleString('en-US')}`;
/** L/100km → km/L, one decimal. */
export const kmPerL = (lPer100: number) => (100 / lPer100).toFixed(1);

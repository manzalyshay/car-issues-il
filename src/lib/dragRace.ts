/**
 * Straight-line acceleration model for the comparison-page drag race.
 *
 * Built from the two figures every trim has: 0-100 km/h time and top speed.
 * Acceleration is assumed to fall off linearly with speed, which gives
 *   v(t) = vmax * (1 - e^(-t/tau))
 * with tau chosen so the car reaches 100 km/h exactly at its published time.
 * It is an estimate from catalogue figures, not a measured run: it ignores
 * launch traction and the weather.
 *
 * The playable race (DragRace.tsx) adds gears on top of that curve: a gearbox,
 * a power band and shift time. The gear model is calibrated per car so that a
 * driver who launches instantly and shifts at the ideal point reproduces the
 * published 0-100 time - a good run matches the catalogue, a sloppy one is slower.
 */
import { normEngine } from './specSummary';

export const RACE_DISTANCE_M = 400;

export interface RaceCar {
  name: string;
  /** Trim the figures belong to */
  trim: string;
  /** Seconds, 0-100 km/h */
  accel: number;
  topSpeedKmh: number;
  hp: number | null;
  /** Electric: one gear, no shifting */
  ev: boolean;
  /** Body style from the catalogue (suv, sedan, hatchback, pickup, coupe, van, electric) - sets the toy car's shape */
  body?: string;
  /** Brand logo drawn on the toy car's tailgate */
  logoUrl?: string;
}

export interface RaceCurve {
  /** m/s */
  vmax: number;
  tau: number;
}

export function raceCurve(car: Pick<RaceCar, 'accel' | 'topSpeedKmh'>): RaceCurve {
  // A top speed at or below 100 km/h would make the 0-100 time unreachable
  const vmaxKmh = Math.max(car.topSpeedKmh, 115);
  const tau = -car.accel / Math.log(1 - 100 / vmaxKmh);
  return { vmax: vmaxKmh / 3.6, tau };
}

/** Speed in km/h after t seconds of full throttle. */
export function speedAt(c: RaceCurve, t: number): number {
  return t <= 0 ? 0 : c.vmax * (1 - Math.exp(-t / c.tau)) * 3.6;
}

/** Metres covered after t seconds of full throttle. */
export function distanceAt(c: RaceCurve, t: number): number {
  return t <= 0 ? 0 : c.vmax * (t - c.tau * (1 - Math.exp(-t / c.tau)));
}

/** Seconds needed to cover `metres` from a standing start. */
export function timeToDistance(c: RaceCurve, metres: number): number {
  let lo = 0;
  let hi = 120;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (distanceAt(c, mid) < metres) lo = mid; else hi = mid;
  }
  return hi;
}

export interface RaceSummary {
  timeA: number;
  timeB: number;
  /** km/h crossing the line */
  trapA: number;
  trapB: number;
  winner: 'a' | 'b' | 'tie';
  /** Metres the loser still has to go when the winner crosses the line */
  gapM: number;
}

/** Both cars launched at the same instant, full throttle to the line. */
export function raceSummary(a: RaceCar, b: RaceCar, metres = RACE_DISTANCE_M): RaceSummary {
  const ca = raceCurve(a);
  const cb = raceCurve(b);
  const timeA = timeToDistance(ca, metres);
  const timeB = timeToDistance(cb, metres);
  const winner = Math.abs(timeA - timeB) < 0.05 ? 'tie' : timeA < timeB ? 'a' : 'b';
  const tWin = Math.min(timeA, timeB);
  const gapM = metres - distanceAt(timeA < timeB ? cb : ca, tWin);
  return { timeA, timeB, trapA: speedAt(ca, timeA), trapB: speedAt(cb, timeB), winner, gapM };
}

interface TrimLike { name: string; acceleration?: number; topSpeedKmh?: number; engineHp?: number; engineType?: string | null }

/** The quickest trim that has both figures - the one each model sends to the race. */
export function pickRaceCar(name: string, trims: TrimLike[], look: { body?: string; logoUrl?: string } = {}): RaceCar | null {
  const usable = trims.filter(t => t.acceleration && t.acceleration > 1.5 && t.topSpeedKmh && t.topSpeedKmh > 60);
  if (usable.length === 0) return null;
  const best = usable.reduce((m, t) => (t.acceleration! < m.acceleration! ? t : m));
  return {
    name,
    trim: best.name,
    accel: best.acceleration!,
    topSpeedKmh: best.topSpeedKmh!,
    hp: best.engineHp ?? null,
    ev: normEngine(best.engineType) === 'electric',
    ...look,
  };
}

// ── Playable model: gears, power band, shift time ─────────────────────────────

/** Share of top speed each gear reaches at the rev limiter (6-speed box). */
const GEAR_SHARES = [0.3, 0.47, 0.63, 0.77, 0.89, 1.02];
/** Rev-counter position (0-1 of the limiter) where an upshift is ideal. */
export const IDEAL_SHIFT = 0.95;
/** An upshift inside this window counts as "perfect". */
export const PERFECT_WINDOW: [number, number] = [0.9, 0.99];
export const REDLINE_RPM = 7000;
const IDLE_RPM = 900;
const SHIFT_TIME = 0.22;

export interface EngineSpec {
  vmax: number;
  tau: number;
  /** Calibration so an ideal run reproduces the published 0-100 time */
  k: number;
  /** m/s at the limiter in each gear */
  gearTop: number[];
  shiftTime: number;
  ev: boolean;
}

export interface CarState {
  /** metres travelled */
  pos: number;
  /** m/s */
  v: number;
  /** 0-based gear index */
  gear: number;
  /** seconds left of an upshift in progress */
  shiftLeft: number;
  onLimiter: boolean;
}

export const newCarState = (): CarState => ({ pos: 0, v: 0, gear: 0, shiftLeft: 0, onLimiter: false });

/** 0 at standstill, 1 at the rev limiter in the current gear. */
export function revShare(spec: EngineSpec, st: CarState): number {
  return Math.min(1, st.v / spec.gearTop[st.gear]);
}

export function rpmOf(spec: EngineSpec, st: CarState): number {
  if (spec.ev) return 0;
  return IDLE_RPM + revShare(spec, st) * (REDLINE_RPM - IDLE_RPM);
}

/** How much of the engine's pull is available at this point of the rev range. */
function powerBand(f: number): number {
  if (f >= 1) return 0;                       // limiter
  if (f > 0.96) return 1 - (f - 0.96) * 3;    // falls off just before the limiter
  const s = Math.min(1, Math.max(0, (f - 0.12) / 0.6));
  return 0.5 + 0.5 * s * s * (3 - 2 * s);    // smoothstep from 50% to 100%
}

/** Advance one car by dt seconds. */
export function stepCar(spec: EngineSpec, st: CarState, throttle: boolean, dt: number): void {
  const base = (spec.vmax - st.v) / spec.tau;
  let a: number;
  if (st.shiftLeft > 0) {
    st.shiftLeft = Math.max(0, st.shiftLeft - dt);
    a = -0.4; // coasting while the clutch is out
    st.onLimiter = false;
  } else if (spec.ev) {
    a = throttle ? spec.k * base : -0.4;
    st.onLimiter = false;
  } else {
    const f = st.v / spec.gearTop[st.gear];
    st.onLimiter = throttle && f >= 0.995;
    a = throttle ? spec.k * base * powerBand(f) : -0.4;
  }
  st.v = Math.max(0, Math.min(spec.vmax, st.v + a * dt));
  st.pos += st.v * dt;
}

/** Start an upshift. Returns the rev share it was made at, or null if no gear is left. */
export function shiftUp(spec: EngineSpec, st: CarState): number | null {
  if (spec.ev || st.shiftLeft > 0 || st.gear >= spec.gearTop.length - 1) return null;
  const at = revShare(spec, st);
  st.gear += 1;
  st.shiftLeft = spec.shiftTime;
  return at;
}

function simulate0to100(spec: EngineSpec, shiftAt: number): number {
  const st = newCarState();
  const dt = 1 / 240;
  for (let t = 0; t < 60; t += dt) {
    if (!spec.ev && st.shiftLeft === 0 && revShare(spec, st) >= shiftAt) shiftUp(spec, st);
    stepCar(spec, st, true, dt);
    if (st.v * 3.6 >= 100) return t + dt;
  }
  return 60;
}

export function buildEngine(car: Pick<RaceCar, 'accel' | 'topSpeedKmh' | 'ev'>): EngineSpec {
  const { vmax, tau } = raceCurve(car);
  const spec: EngineSpec = {
    vmax, tau, k: 1,
    gearTop: car.ev ? [vmax * 1.02] : GEAR_SHARES.map(s => vmax * s),
    shiftTime: car.ev ? 0 : SHIFT_TIME,
    ev: car.ev,
  };
  // Find k so the ideal driver hits 100 km/h at the published time
  let lo = 0.5;
  let hi = 4;
  for (let i = 0; i < 30; i++) {
    spec.k = (lo + hi) / 2;
    if (simulate0to100(spec, IDEAL_SHIFT) > car.accel) lo = spec.k; else hi = spec.k;
  }
  spec.k = (lo + hi) / 2;
  return spec;
}

/** Full-throttle run with an instant launch and ideal shifts: the best this car can do. */
export function idealRun(spec: EngineSpec, metres = RACE_DISTANCE_M): { time: number; trapKmh: number } {
  const st = newCarState();
  const dt = 1 / 240;
  let t = 0;
  while (st.pos < metres && t < 90) {
    if (!spec.ev && st.shiftLeft === 0 && revShare(spec, st) >= IDEAL_SHIFT) shiftUp(spec, st);
    stepCar(spec, st, true, dt);
    t += dt;
  }
  return { time: t, trapKmh: st.v * 3.6 };
}

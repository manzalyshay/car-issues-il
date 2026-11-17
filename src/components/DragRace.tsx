'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  RACE_DISTANCE_M, IDEAL_SHIFT, PERFECT_WINDOW, REDLINE_RPM,
  buildEngine, newCarState, stepCar, shiftUp, revShare, idealRun,
  type RaceCar, type EngineSpec, type CarState,
} from '@/lib/dragRace';

/**
 * Playable 400 m drag race between the two compared models, seen from behind the
 * visitor's car. Hold ↑ (or the GAS button) for throttle, Space (or the GEAR
 * button) to shift up. The rival is driven by the computer with a decent but not
 * perfect launch and shifts. Car physics come from lib/dragRace: a perfect run
 * reproduces each trim's published 0-100 time. Each car is drawn as a blocky toy
 * version of its body style, wearing its brand logo.
 */

const COLORS = ['#2563eb', '#ea580c'] as const;
const LANE_X = [1.8, -1.8] as const; // world x of [player, rival] - the player always drives the right lane
const AUTO_SHIFT = 0.93;             // the automatic gearbox shifts a little early
const SUBSTEP = 1 / 240;

type Phase = 'menu' | 'staging' | 'racing' | 'done' | 'foul';
type Grade = 'perfect' | 'early' | 'late';

interface Sim {
  phase: Phase;
  me: 0 | 1;
  auto: boolean;
  specs: [EngineSpec, EngineSpec];
  cars: [CarState, CarState];
  /** race clock, seconds since the green light */
  t: number;
  /** race-clock time each car launched; -1 = not yet */
  launchT: [number, number];
  /** race-clock time each car crossed the line; -1 = not yet */
  finishT: [number, number];
  /** metres the other car still had to go when the first car crossed */
  gapAtLine: number;
  throttle: boolean;
  /** staging: performance.now() of the three ambers and the green */
  lightsAt: number[];
  rivalReaction: number;
  rivalShiftAt: number;
  shifts: Grade[];
  limiterS: number;
  toast: { text: string; color: string; until: number } | null;
  last: number;
  doneAt: number;
  reported: boolean;
}

interface Result {
  myTime: number;
  rivalTime: number;
  reaction: number;
  win: boolean;
  gapM: number;
  shifts: Grade[];
  limiterS: number;
  trapKmh: number;
}

interface Props { a: RaceCar; b: RaceCar; isEn: boolean }

// ── Deterministic scenery ────────────────────────────────────────────────────

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface Building { x: number; w: number; h: number; windows: { x: number; y: number }[] }

function makeSkyline(): Building[] {
  const r = seeded(42);
  const out: Building[] = [];
  let x = -0.02;
  while (x < 1.02) {
    const w = 0.02 + r() * 0.05;
    const h = 0.04 + r() * r() * 0.22;
    const windows: { x: number; y: number }[] = [];
    for (let i = 0; i < Math.floor(w * h * 2600); i++) if (r() < 0.35) windows.push({ x: r(), y: r() });
    out.push({ x, w, h, windows });
    x += w * (0.85 + r() * 0.3);
  }
  return out;
}

const STARS = (() => { const r = seeded(7); return Array.from({ length: 70 }, () => ({ x: r(), y: r() * 0.8, a: 0.3 + r() * 0.7 })); })();

// ── Drawing helpers ──────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Rear-view proportions (metres) of each body style, built from toy bricks. */
interface BodyShape {
  width: number;
  /** top of the lower body (tailgate / boot lid) */
  deck: number;
  /** top of the roof */
  roof: number;
  /** cabin width at the roof and at the deck, as a share of the body width */
  cabinTop: number;
  cabinBottom: number;
  rails?: boolean;
  spoiler?: boolean;
  /** pickup: an open bed in front of the tailgate */
  bed?: boolean;
}

const BODIES: Record<string, BodyShape> = {
  suv:       { width: 1.92, deck: 1.02, roof: 1.74, cabinTop: 0.84, cabinBottom: 0.94, rails: true },
  electric:  { width: 1.88, deck: 0.96, roof: 1.6, cabinTop: 0.8, cabinBottom: 0.92 },
  hatchback: { width: 1.78, deck: 0.92, roof: 1.5, cabinTop: 0.78, cabinBottom: 0.92 },
  sedan:     { width: 1.84, deck: 0.84, roof: 1.44, cabinTop: 0.64, cabinBottom: 0.84 },
  coupe:     { width: 1.88, deck: 0.8, roof: 1.3, cabinTop: 0.56, cabinBottom: 0.8, spoiler: true },
  pickup:    { width: 1.92, deck: 1.06, roof: 1.86, cabinTop: 0.82, cabinBottom: 0.86, bed: true },
  van:       { width: 1.96, deck: 1.12, roof: 1.96, cabinTop: 0.92, cabinBottom: 0.96 },
};

/**
 * A toy-brick car seen from behind. (cx, groundY) = centre of the rear axle on the
 * ground, m = pixels per metre at that distance.
 */
function drawToyCar(
  ctx: CanvasRenderingContext2D, cx: number, groundY: number, m: number, color: string,
  opts: { body?: string; ev: boolean; flame: number; plate: string; now: number; logo: HTMLImageElement | null },
) {
  const b = BODIES[opts.body ?? ''] ?? BODIES.hatchback;
  const W = b.width * m;
  const x0 = cx - W / 2;
  const y = (h: number) => groundY - h * m;
  const lw = Math.max(1, 0.025 * m);
  const outline = 'rgba(0,0,0,0.45)';

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.ellipse(cx, groundY + 0.02 * m, W * 0.6, 0.17 * m, 0, 0, Math.PI * 2); ctx.fill();

  // chunky toy wheels
  for (const wx of [x0 - 0.04 * m, x0 + W - 0.32 * m]) {
    ctx.fillStyle = '#111';
    roundRect(ctx, wx, y(0.66), 0.36 * m, 0.66 * m, 0.1 * m); ctx.fill();
    ctx.fillStyle = '#9ca3af';
    roundRect(ctx, wx + 0.1 * m, y(0.44), 0.16 * m, 0.2 * m, 0.04 * m); ctx.fill();
  }

  // lower body: a stack of bricks
  const bodyTop = b.deck;
  ctx.fillStyle = color;
  roundRect(ctx, x0, y(bodyTop), W, (bodyTop - 0.22) * m, 0.05 * m); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  // brick seams + a lighter top edge on each layer
  const layer = 0.32;
  for (let h = 0.22 + layer; h < bodyTop - 0.05; h += layer) {
    ctx.fillStyle = shade(color, 0.72);
    ctx.fillRect(x0 + lw, y(h) - lw / 2, W - 2 * lw, lw);
    ctx.fillStyle = shade(color, 1.18);
    ctx.fillRect(x0 + lw, y(h) + lw / 2, W - 2 * lw, lw);
  }
  // deck top face (camera is above) with studs
  const deckFace = 0.1 * m;
  ctx.fillStyle = shade(color, 1.25);
  ctx.fillRect(x0, y(bodyTop) - deckFace, W, deckFace);
  const studs = (left: number, right: number, top: number, n: number) => {
    const span = right - left;
    for (let i = 0; i < n; i++) {
      const sx = left + span * ((i + 0.5) / n);
      const r = Math.max(1.2, 0.07 * m);
      ctx.fillStyle = shade(color, 1.05);
      roundRect(ctx, sx - r, top - r * 0.9, r * 2, r * 1.4, r * 0.5); ctx.fill();
      ctx.fillStyle = shade(color, 1.4);
      ctx.beginPath(); ctx.ellipse(sx, top - r * 0.9, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    }
  };

  // cabin
  const cTop = b.roof;
  const cb = (W * b.cabinBottom) / 2;
  const ct = (W * b.cabinTop) / 2;
  const cabinBase = b.bed ? bodyTop + 0.12 : bodyTop;
  if (b.bed) {
    // open bed between the tailgate and the cab: dark floor with side walls
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x0 + 0.12 * m, y(bodyTop) - deckFace, W - 0.24 * m, deckFace * 0.8);
  } else {
    studs(x0 + 0.1 * m, x0 + W - 0.1 * m, y(bodyTop) - deckFace * 0.45, 6);
  }
  ctx.fillStyle = shade(color, 0.86);
  ctx.beginPath();
  ctx.moveTo(cx - cb, y(cabinBase));
  ctx.lineTo(cx - ct, y(cTop));
  ctx.lineTo(cx + ct, y(cTop));
  ctx.lineTo(cx + cb, y(cabinBase));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  // rear window: a translucent toy tile
  const gIn = 0.07 * m;
  const glass = ctx.createLinearGradient(0, y(cTop), 0, y(cabinBase));
  glass.addColorStop(0, 'rgba(56,189,248,0.55)'); glass.addColorStop(1, 'rgba(15,23,42,0.9)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(cx - cb + gIn * 1.6, y(cabinBase + 0.06));
  ctx.lineTo(cx - ct + gIn, y(cTop - 0.08));
  ctx.lineTo(cx + ct - gIn, y(cTop - 0.08));
  ctx.lineTo(cx + cb - gIn * 1.6, y(cabinBase + 0.06));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = lw * 1.2;
  ctx.beginPath(); ctx.moveTo(cx - ct * 0.5, y(cTop - 0.12)); ctx.lineTo(cx - ct * 0.15, y(cabinBase + 0.12)); ctx.stroke();
  // roof top face with studs
  ctx.fillStyle = shade(color, 1.25);
  ctx.fillRect(cx - ct, y(cTop) - deckFace, ct * 2, deckFace);
  studs(cx - ct + 0.06 * m, cx + ct - 0.06 * m, y(cTop) - deckFace * 0.45, Math.max(2, Math.round((ct * 2) / (0.3 * m))));
  if (b.rails) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(cx - ct - 0.02 * m, y(cTop) - deckFace - 0.06 * m, 0.08 * m, 0.08 * m);
    ctx.fillRect(cx + ct - 0.06 * m, y(cTop) - deckFace - 0.06 * m, 0.08 * m, 0.08 * m);
  }
  if (b.spoiler) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(x0 + 0.1 * m, y(bodyTop + 0.2), W - 0.2 * m, 0.07 * m);
    ctx.fillRect(x0 + 0.35 * m, y(bodyTop + 0.2), 0.06 * m, 0.2 * m);
    ctx.fillRect(x0 + W - 0.41 * m, y(bodyTop + 0.2), 0.06 * m, 0.2 * m);
  }

  // tail lights: translucent red tiles with glow
  ctx.save();
  ctx.shadowColor = '#ef4444'; ctx.shadowBlur = Math.max(4, 0.4 * m);
  const tlY = bodyTop - 0.3;
  ctx.fillStyle = '#f87171';
  roundRect(ctx, x0 + 0.08 * m, y(tlY + 0.14), 0.36 * m, 0.14 * m, 0.03 * m); ctx.fill();
  roundRect(ctx, x0 + W - 0.44 * m, y(tlY + 0.14), 0.36 * m, 0.14 * m, 0.03 * m); ctx.fill();
  ctx.restore();

  // brand badge: a round white tile with the logo
  const badgeR = 0.13 * m;
  const by = y(tlY + 0.07);
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath(); ctx.arc(cx, by, badgeR, 0, Math.PI * 2); ctx.fill();
  if (opts.logo && opts.logo.complete && opts.logo.naturalWidth > 0 && badgeR > 3) {
    const s = badgeR * 1.4;
    const ratio = opts.logo.naturalWidth / opts.logo.naturalHeight;
    const lw2 = ratio >= 1 ? s : s * ratio;
    const lh2 = ratio >= 1 ? s / ratio : s;
    try { ctx.drawImage(opts.logo, cx - lw2 / 2, by - lh2 / 2, lw2, lh2); } catch { /* image not decodable */ }
  }

  // bumper brick
  ctx.fillStyle = '#1f2937';
  roundRect(ctx, x0 + 0.04 * m, y(0.42), W - 0.08 * m, 0.2 * m, 0.04 * m); ctx.fill();

  // Israeli plate (yellow)
  if (m > 16) {
    const pw = 0.52 * m; const ph = 0.12 * m;
    ctx.fillStyle = '#facc15';
    roundRect(ctx, cx - pw / 2, y(0.66), pw, ph, 0.02 * m); ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(cx - pw / 2, y(0.66), 0.06 * m, ph);
    ctx.fillStyle = '#111';
    ctx.font = `700 ${Math.round(0.085 * m)}px ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(opts.plate, cx + 0.03 * m, y(0.6));
  }

  // exhausts + flame on the limiter or a gear change
  if (!opts.ev) {
    for (const ex of [x0 + 0.42 * m, x0 + W - 0.42 * m]) {
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath(); ctx.arc(ex, y(0.32), 0.06 * m, 0, Math.PI * 2); ctx.fill();
      if (opts.flame > 0) {
        const len = (0.25 + 0.2 * Math.sin(opts.now / 25)) * m * opts.flame;
        const g = ctx.createRadialGradient(ex, y(0.32), 0, ex, y(0.32) + len * 0.3, len);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.35, 'rgba(96,165,250,0.85)');
        g.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(ex, y(0.32) + len * 0.25, 0.09 * m, len * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

const subscribeNoop = () => () => {};
const isCoarsePointer = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

// ── Component ────────────────────────────────────────────────────────────────

export default function DragRace({ a, b, isEn }: Props) {
  const cars = useMemo(() => [a, b] as const, [a, b]);
  const t = useCallback((he: string, en: string) => (isEn ? en : he), [isEn]);
  const specs = useMemo(() => [buildEngine(a), buildEngine(b)] as [EngineSpec, EngineSpec], [a, b]);
  const ideal = useMemo(() => [idealRun(specs[0]), idealRun(specs[1])], [specs]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const skyline = useMemo(() => makeSkyline(), []);
  const simRef = useRef<Sim | null>(null);
  const logosRef = useRef<(HTMLImageElement | null)[]>([null, null]);

  const [phase, setPhase] = useState<Phase>('menu');
  const [me, setMe] = useState<0 | 1>(0);
  const [auto, setAuto] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [height, setHeight] = useState(340);
  // Touch screens get bigger pedals and no keyboard hints (false during server render)
  const touch = useSyncExternalStore(subscribeNoop, isCoarsePointer, () => false);
  const [copied, setCopied] = useState(false);

  const myEv = cars[me].ev;

  const freshSim = useCallback((phaseNow: Phase): Sim => ({
    phase: phaseNow, me, auto: auto || cars[me].ev, specs,
    cars: [newCarState(), newCarState()],
    t: 0, launchT: [-1, -1], finishT: [-1, -1], gapAtLine: 0, throttle: false,
    lightsAt: [], rivalReaction: 0.22 + Math.random() * 0.2, rivalShiftAt: 0.9 + Math.random() * 0.06,
    shifts: [], limiterS: 0, toast: null, last: performance.now(), doneAt: 0, reported: false,
  }), [me, auto, cars, specs]);

  // The frame function changes with props; the loop always calls the latest one
  const frameRef = useRef<(now: number) => void>(() => {});
  const tick = useCallback((now: number) => frameRef.current(now), []);

  // ── One animation frame: simulate, then draw ───────────────────────────────
  const frame = useCallback((now: number) => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = Math.min(0.05, Math.max(0, (now - sim.last) / 1000));
    sim.last = now;
    const rival: 0 | 1 = sim.me === 0 ? 1 : 0;

    if (sim.phase === 'staging') {
      if (sim.throttle) {
        sim.phase = 'foul';
        setPhase('foul');
      } else if (now >= sim.lightsAt[3]) {
        sim.phase = 'racing';
        setPhase('racing');
      }
    }

    if (sim.phase === 'racing') {
      let rest = dt;
      while (rest > 1e-9 && sim.phase === 'racing') {
        const h = Math.min(SUBSTEP, rest);
        rest -= h;
        sim.t += h;
        if (sim.launchT[rival] < 0 && sim.t >= sim.rivalReaction) sim.launchT[rival] = sim.t;
        if (sim.launchT[sim.me] < 0 && sim.throttle) sim.launchT[sim.me] = sim.t;
        for (const i of [0, 1] as const) {
          const st = sim.cars[i];
          const spec = sim.specs[i];
          const isMe = i === sim.me;
          const crossed = sim.finishT[i] >= 0;
          const throttle = sim.launchT[i] >= 0 && !crossed && (isMe ? sim.throttle : true);
          // computer-driven gear changes: the rival always, the visitor when on automatic
          if (!spec.ev && st.shiftLeft === 0 && !crossed && (!isMe || sim.auto)) {
            if (revShare(spec, st) >= (isMe ? AUTO_SHIFT : sim.rivalShiftAt)) shiftUp(spec, st);
          }
          stepCar(spec, st, throttle, h);
          if (isMe && st.onLimiter) sim.limiterS += h;
          if (!crossed && st.pos >= RACE_DISTANCE_M) {
            sim.finishT[i] = sim.t;
            const o = i === 0 ? 1 : 0;
            if (sim.finishT[o] < 0) sim.gapAtLine = Math.max(0, RACE_DISTANCE_M - sim.cars[o].pos);
          }
        }
        if ((sim.finishT[0] >= 0 && sim.finishT[1] >= 0) || sim.t > 90) {
          sim.phase = 'done';
          sim.doneAt = now;
        }
      }
    } else if (sim.phase === 'done') {
      // both cars roll on past the line for a moment
      for (const i of [0, 1] as const) stepCar(sim.specs[i], sim.cars[i], false, dt);
      if (!sim.reported && now - sim.doneAt > 900) {
        sim.reported = true;
        const myT = sim.finishT[sim.me] >= 0 ? sim.finishT[sim.me] : 99;
        const rvT = sim.finishT[rival] >= 0 ? sim.finishT[rival] : 99;
        setResult({
          myTime: myT, rivalTime: rvT, reaction: Math.max(0, sim.launchT[sim.me]),
          win: myT <= rvT, gapM: sim.gapAtLine, shifts: [...sim.shifts], limiterS: sim.limiterS,
          trapKmh: (sim.finishT[sim.me] >= 0 ? sim.cars[sim.me].v : 0) * 3.6,
        });
        setPhase('done');
      }
    }

    // ── draw
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.direction = 'ltr';
    const narrow = W < 520;
    const u = narrow ? Math.max(0.72, W / 470) : Math.min(H / 360, W / 520); // HUD scale

    const my = sim.cars[sim.me];
    const rv = sim.cars[rival];
    const mySpec = sim.specs[sim.me];
    const speed = my.v;
    // camera: behind and above the visitor's car; the view widens with speed
    const camZ = my.pos - 4.6 - 6.4;
    const camX = 0.9;
    const camY = 2.1 + Math.sin(now / 40) * Math.min(0.03, speed / 2000);
    const horizon = H * 0.42;
    const focal = H * 1.05 * (1 - Math.min(0.22, (speed / 60) * 0.22));
    const proj = (x: number, yw: number, z: number) => {
      const dz = z - camZ;
      const s = focal / dz;
      return { x: W / 2 + (x - camX) * s, y: horizon + (camY - yw) * s, s, dz };
    };

    // sky, sunset glow, city skyline
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#060a1a'); sky.addColorStop(0.55, '#1e1b4b'); sky.addColorStop(0.88, '#7c2d5a'); sky.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon + 1);
    for (const s of STARS) { ctx.fillStyle = `rgba(255,255,255,${s.a * 0.7})`; ctx.fillRect(s.x * W, s.y * horizon * 0.7, 1.2, 1.2); }
    const sun = ctx.createRadialGradient(W * 0.72, horizon, 0, W * 0.72, horizon, H * 0.5);
    sun.addColorStop(0, 'rgba(251,191,36,0.55)'); sun.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, horizon);
    for (const bd of skyline) {
      const bx = bd.x * W; const bw = bd.w * W; const bh = bd.h * H;
      ctx.fillStyle = '#0a0f24';
      ctx.fillRect(bx, horizon - bh, bw + 1, bh + 1);
      ctx.fillStyle = 'rgba(253,224,71,0.55)';
      for (const w of bd.windows) ctx.fillRect(bx + w.x * (bw - 2), horizon - bh + 2 + w.y * (bh - 4), 1.5, 1.5);
    }

    const ground = ctx.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, '#111827'); ground.addColorStop(1, '#030712');
    ctx.fillStyle = ground; ctx.fillRect(0, horizon, W, H - horizon);

    // road in 5 m bands, far to near
    const NEAR = camZ + 1.2;
    const FAR = camZ + 520;
    const BAND = 5;
    const quad = (x1: number, x2: number, z1: number, z2: number, color: string) => {
      const p1 = proj(x1, 0, z1); const p2 = proj(x2, 0, z1);
      const p3 = proj(x2, 0, z2); const p4 = proj(x1, 0, z2);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
    };
    for (let z = Math.floor(FAR / BAND) * BAND; z >= Math.floor(NEAR / BAND) * BAND; z -= BAND) {
      const z1 = Math.max(z, NEAR);
      const z2 = z + BAND;
      if (z2 <= NEAR) continue;
      const k = Math.floor(z / BAND);
      const even = ((k % 2) + 2) % 2 === 0;
      quad(-12, 12, z1, z2, even ? '#0f1a12' : '#122016');
      quad(-4.3, 4.3, z1, z2, even ? '#2a2e36' : '#30343d');
      quad(-4.75, -4.3, z1, z2, even ? '#dc2626' : '#f3f4f6');
      quad(4.3, 4.75, z1, z2, even ? '#dc2626' : '#f3f4f6');
      quad(-3.75, -3.6, z1, z2, 'rgba(255,255,255,0.7)');
      quad(3.6, 3.75, z1, z2, 'rgba(255,255,255,0.7)');
      if (even) quad(-0.08, 0.08, z1, Math.min(z2, z1 + 3), 'rgba(255,255,255,0.8)');
    }
    if (NEAR < 0.6) quad(-4.3, 4.3, Math.max(NEAR, 0), 0.6, '#f8fafc');
    if (RACE_DISTANCE_M + 2.4 > NEAR && RACE_DISTANCE_M < FAR) {
      const cols = 12;
      for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
        const z1 = Math.max(NEAR, RACE_DISTANCE_M + r * 1.2);
        const z2 = RACE_DISTANCE_M + (r + 1) * 1.2;
        if (z2 <= NEAR) continue;
        const x1 = -4.3 + (8.6 / cols) * c;
        quad(x1, x1 + 8.6 / cols, z1, z2, (r + c) % 2 === 0 ? '#f8fafc' : '#0f172a');
      }
    }

    // roadside objects and cars, sorted far to near
    const objs: { dz: number; draw: () => void }[] = [];
    for (let z = Math.ceil(NEAR / 25) * 25; z < Math.min(FAR, 700); z += 25) {
      for (const side of [-1, 1]) {
        const base = proj(side * 6.2, 0, z);
        if (base.dz < 1.5) continue;
        objs.push({ dz: base.dz, draw: () => {
          const top = proj(side * 6.2, 7.5, z);
          const lamp = proj(side * 4.6, 7.4, z);
          ctx.strokeStyle = '#475569'; ctx.lineWidth = Math.max(1, 0.18 * base.s);
          ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.lineTo(lamp.x, lamp.y); ctx.stroke();
          const r = Math.max(3, 1.6 * lamp.s);
          const g = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, r * 2.2);
          g.addColorStop(0, 'rgba(255,245,200,0.95)'); g.addColorStop(0.25, 'rgba(253,224,71,0.45)'); g.addColorStop(1, 'rgba(253,224,71,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lamp.x, lamp.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
        } });
      }
    }
    for (const mark of [100, 200, 300]) {
      const base = proj(5.6, 0, mark);
      if (base.dz < 1.5 || mark > FAR) continue;
      objs.push({ dz: base.dz, draw: () => {
        const tl = proj(5.0, 2.6, mark); const br = proj(6.6, 1.5, mark);
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = Math.max(1, 0.1 * base.s);
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(base.x, br.y); ctx.stroke();
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
        ctx.fillStyle = '#0f172a'; ctx.font = `800 ${Math.max(8, (br.y - tl.y) * 0.62)}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(mark), (tl.x + br.x) / 2, (tl.y + br.y) / 2);
      } });
    }
    {
      const base = proj(0, 0, RACE_DISTANCE_M);
      if (base.dz > 1.5 && RACE_DISTANCE_M < FAR) objs.push({ dz: base.dz, draw: () => {
        const lp = proj(-5.2, 0, RACE_DISTANCE_M); const rp = proj(5.2, 0, RACE_DISTANCE_M);
        const lt = proj(-5.2, 6.4, RACE_DISTANCE_M); const rt = proj(5.2, 6.4, RACE_DISTANCE_M);
        const bb = proj(0, 5.2, RACE_DISTANCE_M);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = Math.max(2, 0.3 * base.s);
        ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(lt.x, lt.y); ctx.moveTo(rp.x, rp.y); ctx.lineTo(rt.x, rt.y); ctx.stroke();
        const bh = bb.y - lt.y;
        const cols = 16;
        for (let c = 0; c < cols; c++) for (let r = 0; r < 2; r++) {
          ctx.fillStyle = (c + r) % 2 === 0 ? '#f8fafc' : '#0f172a';
          ctx.fillRect(lt.x + ((rt.x - lt.x) / cols) * c, lt.y + (bh / 2) * r, (rt.x - lt.x) / cols + 0.5, bh / 2 + 0.5);
        }
      } });
    }
    const plates = ['12-345-67', '89-012-34'];
    for (const i of [rival, sim.me] as const) {
      const st = sim.cars[i];
      const p = proj(LANE_X[i === sim.me ? 0 : 1], 0, st.pos - 4.6);
      if (p.dz < 0.8) continue;
      objs.push({ dz: p.dz, draw: () => {
        const flame = st.onLimiter ? 1 : st.shiftLeft > 0 ? 0.7 : 0;
        const bob = Math.sin(now / 30 + i) * Math.min(1.2, st.v / 25) * u;
        drawToyCar(ctx, p.x, p.y + bob, p.s, COLORS[i], {
          body: cars[i].body, ev: sim.specs[i].ev, flame, plate: plates[i], now, logo: logosRef.current[i],
        });
        if (i !== sim.me && p.s > 4) {
          const label = cars[i].name;
          ctx.font = `700 ${Math.round(12 * u)}px system-ui, sans-serif`;
          ctx.direction = isEn ? 'ltr' : 'rtl';
          const tw = ctx.measureText(label).width;
          const shape = BODIES[cars[i].body ?? ''] ?? BODIES.hatchback;
          const ty = p.y - (shape.roof + 0.4) * p.s - 8 * u;
          ctx.fillStyle = 'rgba(15,23,42,0.8)';
          const lx = Math.max(tw / 2 + 12 * u, Math.min(W - tw / 2 - 12 * u, p.x));
          roundRect(ctx, lx - tw / 2 - 8 * u, ty - 11 * u, tw + 16 * u, 20 * u, 10 * u); ctx.fill();
          ctx.fillStyle = '#fdba74'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, lx, ty - 1 * u);
          ctx.direction = 'ltr';
        }
      } });
    }
    objs.sort((p, q) => q.dz - p.dz).forEach(o => o.draw());

    // speed streaks + vignette
    if (speed > 12) {
      const alpha = Math.min(0.35, (speed - 12) / 120);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1.2;
      const r = seeded(Math.floor(now / 60) + 1);
      for (let i = 0; i < 18; i++) {
        const ang = r() * Math.PI * 2;
        const r0 = (0.55 + r() * 0.3) * W * 0.6;
        const len = (20 + r() * 50) * (speed / 40) * u;
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(ang) * r0, horizon + Math.sin(ang) * r0 * 0.6);
        ctx.lineTo(W / 2 + Math.cos(ang) * (r0 + len), horizon + Math.sin(ang) * (r0 + len) * 0.6);
        ctx.stroke();
      }
    }
    const vig = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    // ── HUD
    if (sim.phase !== 'menu') {
      // progress strip
      const px0 = 18 * u; const px1 = W - 126 * u; const py = 20 * u;
      ctx.fillStyle = 'rgba(15,23,42,0.75)';
      roundRect(ctx, px0 - 10 * u, py - 11 * u, px1 - px0 + 20 * u, 22 * u, 11 * u); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(px0, py - 1.5 * u, px1 - px0, 3 * u);
      for (const i of [rival, sim.me] as const) {
        const f = Math.min(1, sim.cars[i].pos / RACE_DISTANCE_M);
        ctx.fillStyle = COLORS[i];
        ctx.beginPath(); ctx.arc(px0 + f * (px1 - px0), py, (i === sim.me ? 6.5 : 5) * u, 0, Math.PI * 2); ctx.fill();
        if (i === sim.me) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      // clock + gap
      ctx.fillStyle = 'rgba(15,23,42,0.75)';
      roundRect(ctx, W - 112 * u, py - 13 * u, 100 * u, 26 * u, 8 * u); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.font = `800 ${Math.round(15 * u)}px ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const clock = sim.finishT[sim.me] >= 0 ? sim.finishT[sim.me] : sim.t;
      ctx.fillText(`${clock.toFixed(2)}s`, W - 62 * u, py + 1);
      if (sim.phase === 'racing') {
        const gap = my.pos - rv.pos;
        ctx.font = `800 ${Math.round(12 * u)}px system-ui, sans-serif`;
        ctx.fillStyle = gap >= 0 ? '#86efac' : '#fca5a5';
        ctx.fillText(`${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(1)} m`, W - 62 * u, py + 26 * u);
      }

      // start lights
      if (sim.phase === 'staging' || sim.phase === 'foul' || (sim.phase === 'racing' && sim.t < 1.2)) {
        const tx = W / 2; const ty = 52 * u; const r = 9 * u;
        ctx.fillStyle = 'rgba(2,6,23,0.88)';
        roundRect(ctx, tx - 22 * u, ty - 17 * u, 44 * u, 130 * u, 12 * u); ctx.fill();
        ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1; ctx.stroke();
        const lit = (k: number) => sim.lightsAt[k] !== undefined && now >= sim.lightsAt[k];
        const bulbs = [
          { color: '#f59e0b', on: sim.phase === 'staging' && lit(0) },
          { color: '#f59e0b', on: sim.phase === 'staging' && lit(1) },
          { color: '#f59e0b', on: sim.phase === 'staging' && lit(2) },
          { color: '#22c55e', on: sim.phase === 'racing' },
          { color: '#ef4444', on: sim.phase === 'foul' },
        ];
        bulbs.forEach((bl, k) => {
          ctx.save();
          if (bl.on) { ctx.shadowColor = bl.color; ctx.shadowBlur = 20 * u; }
          ctx.fillStyle = bl.on ? bl.color : 'rgba(148,163,184,0.16)';
          ctx.beginPath(); ctx.arc(tx, ty + k * 24 * u, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
      }

      // rev counter
      const gr = 56 * u; const gx = 16 * u + gr + 8 * u; const gy = H - gr - 22 * u;
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.beginPath(); ctx.arc(gx, gy, gr + 8 * u, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      const a0 = Math.PI * 0.75; const a1 = Math.PI * 2.25;
      const share = mySpec.ev ? Math.min(1, my.v / mySpec.vmax) : revShare(mySpec, my);
      ctx.lineWidth = 6 * u; ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.beginPath(); ctx.arc(gx, gy, gr - 4 * u, a0, a1); ctx.stroke();
      if (!mySpec.ev) {
        ctx.strokeStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(gx, gy, gr - 4 * u, a0 + (a1 - a0) * 0.88, a1); ctx.stroke();
      }
      const arcGrad = ctx.createLinearGradient(gx - gr, gy, gx + gr, gy);
      arcGrad.addColorStop(0, '#22d3ee'); arcGrad.addColorStop(0.7, '#a78bfa'); arcGrad.addColorStop(1, '#f43f5e');
      ctx.strokeStyle = arcGrad;
      ctx.beginPath(); ctx.arc(gx, gy, gr - 4 * u, a0, a0 + (a1 - a0) * Math.max(0.001, share)); ctx.stroke();
      ctx.fillStyle = '#cbd5e1'; ctx.font = `600 ${Math.round(9 * u)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const ticks = mySpec.ev ? 4 : REDLINE_RPM / 1000;
      for (let i = 0; i <= ticks; i++) {
        const ang = a0 + (a1 - a0) * (i / ticks);
        const lbl = mySpec.ev ? String(Math.round((mySpec.vmax * 3.6 * i) / ticks / 10) * 10) : String(i);
        ctx.fillText(lbl, gx + Math.cos(ang) * (gr - 18 * u), gy + Math.sin(ang) * (gr - 18 * u));
      }
      const na = a0 + (a1 - a0) * share;
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2.5 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(na) * (gr - 10 * u), gy + Math.sin(na) * (gr - 10 * u)); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(gx, gy, 17 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.font = `900 ${Math.round((mySpec.ev ? 12 : 19) * u)}px system-ui, sans-serif`;
      ctx.fillText(mySpec.ev ? 'EV' : my.shiftLeft > 0 ? '–' : String(my.gear + 1), gx, gy + 1);
      ctx.fillStyle = '#94a3b8'; ctx.font = `600 ${Math.round(8 * u)}px system-ui, sans-serif`;
      ctx.fillText(mySpec.ev ? 'km/h' : 'x1000 rpm', gx, gy + 34 * u);
      // speed readout + shift lights
      // on phones the speed box and shift lights sit above the gauge, clear of the pedals
      const sx0 = narrow ? gx - gr - 8 * u : gx + gr + 14 * u;
      const sy0 = narrow ? gy - gr - 60 * u : gy - 2 * u;
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      roundRect(ctx, sx0, sy0, 100 * u, 44 * u, 10 * u); ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc'; ctx.font = `900 ${Math.round(26 * u)}px ui-monospace, monospace`;
      ctx.fillText(String(Math.round(my.v * 3.6)), sx0 + 10 * u, sy0 + 23 * u);
      ctx.fillStyle = '#94a3b8'; ctx.font = `600 ${Math.round(10 * u)}px system-ui, sans-serif`;
      ctx.fillText('km/h', sx0 + 64 * u, sy0 + 28 * u);
      if (!mySpec.ev) {
        const n = 7; const ly = sy0 - 14 * u;
        const ready = share >= PERFECT_WINDOW[0] && my.shiftLeft === 0;
        const flash = ready && Math.floor(now / 90) % 2 === 0;
        ctx.fillStyle = 'rgba(2,6,23,0.85)';
        roundRect(ctx, sx0, ly - 9 * u, 100 * u, 18 * u, 9 * u); ctx.fill();
        for (let i = 0; i < n; i++) {
          const thr = 0.6 + (IDEAL_SHIFT - 0.6) * (i / (n - 1));
          const on = share >= thr;
          const col = flash ? '#60a5fa' : i < 3 ? '#22c55e' : i < 5 ? '#facc15' : '#ef4444';
          ctx.save();
          if (on) { ctx.shadowColor = col; ctx.shadowBlur = 10 * u; }
          ctx.fillStyle = on ? col : 'rgba(148,163,184,0.2)';
          ctx.beginPath(); ctx.arc(sx0 + 11 * u + i * 13 * u, ly, 4.5 * u, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      // messages
      ctx.textAlign = 'center';
      if (sim.toast && now < sim.toast.until) {
        ctx.font = `900 ${Math.round(20 * u)}px system-ui, sans-serif`;
        ctx.direction = isEn ? 'ltr' : 'rtl';
        ctx.fillStyle = sim.toast.color;
        ctx.globalAlpha = Math.min(1, (sim.toast.until - now) / 250);
        ctx.fillText(sim.toast.text, W / 2, H * 0.6);
        ctx.globalAlpha = 1;
        ctx.direction = 'ltr';
      }
      if (sim.phase === 'racing' && my.onLimiter && Math.floor(now / 120) % 2 === 0) {
        ctx.font = `900 ${Math.round(14 * u)}px system-ui, sans-serif`;
        ctx.fillStyle = '#f87171';
        ctx.direction = isEn ? 'ltr' : 'rtl';
        ctx.fillText(isEn ? 'REV LIMITER - SHIFT UP!' : 'מגביל סל״ד - העבירו הילוך!', W / 2, H * 0.68);
        ctx.direction = 'ltr';
      }
      if (sim.phase === 'racing' && sim.launchT[sim.me] < 0) {
        ctx.font = `900 ${Math.round(22 * u)}px system-ui, sans-serif`;
        ctx.fillStyle = '#4ade80';
        ctx.direction = isEn ? 'ltr' : 'rtl';
        ctx.fillText(isEn ? 'GO!' : 'סעו!', W / 2, H * 0.6);
        ctx.direction = 'ltr';
      }
    }

    const keepGoing = sim.phase === 'staging' || sim.phase === 'racing' || (sim.phase === 'done' && now - sim.doneAt < 2500);
    if (keepGoing) rafRef.current = requestAnimationFrame(tick);
  }, [skyline, cars, isEn, tick]);

  useEffect(() => { frameRef.current = frame; }, [frame]);

  const paint = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // brand logos for the toy cars; repaint once each one loads
  useEffect(() => {
    cars.forEach((c, i) => {
      if (!c.logoUrl) return;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { logosRef.current[i] = img; if (simRef.current?.phase === 'menu') paint(); };
      img.src = c.logoUrl;
    });
  }, [cars, paint]);

  // the start-line scene behind the menu
  useEffect(() => {
    simRef.current = freshSim('menu');
    paint();
  }, [freshSim, paint]);

  // canvas height follows the width; detect touch screens
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      // phones get a taller, portrait-ish view so the HUD and pedals fit
      setHeight(Math.round(w < 520 ? Math.max(400, Math.min(500, w * 1.2)) : Math.max(300, Math.min(460, w * 0.54))));
      const p = simRef.current?.phase;
      if (p !== 'racing' && p !== 'staging') paint();
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [paint]);

  const start = useCallback(() => {
    const sim = freshSim('staging');
    const now = performance.now();
    const hold = 900 + Math.random() * 1400; // random wait, so the lights cannot be timed
    sim.lightsAt = [now + hold, now + hold + 450, now + hold + 900, now + hold + 1350];
    simRef.current = sim;
    setResult(null); setCopied(false); setPhase('staging');
    wrapRef.current?.focus({ preventScroll: true });
    paint();
  }, [freshSim, paint]);

  const backToMenu = useCallback(() => {
    simRef.current = freshSim('menu');
    setResult(null); setPhase('menu');
    paint();
  }, [freshSim, paint]);

  const setThrottle = useCallback((on: boolean) => {
    if (simRef.current) simRef.current.throttle = on;
  }, []);

  const shift = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.phase !== 'racing' || sim.auto) return;
    const at = shiftUp(sim.specs[sim.me], sim.cars[sim.me]);
    if (at === null) return;
    const grade: Grade = at < PERFECT_WINDOW[0] ? 'early' : at > PERFECT_WINDOW[1] ? 'late' : 'perfect';
    sim.shifts.push(grade);
    const until = performance.now() + 700;
    sim.toast = grade === 'perfect'
      ? { text: isEn ? 'PERFECT SHIFT' : 'העברה מושלמת!', color: '#60a5fa', until }
      : grade === 'early'
        ? { text: isEn ? 'Too early' : 'מוקדם מדי', color: '#facc15', until }
        : { text: isEn ? 'Too late' : 'מאוחר מדי', color: '#f87171', until };
  }, [isEn]);

  // keyboard: ↑ / W throttle, Space / → / Shift gear, Enter start
  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);
    };
    const live = () => { const p = simRef.current?.phase; return p === 'staging' || p === 'racing'; };
    const focused = () => !!wrapRef.current && wrapRef.current.contains(document.activeElement);
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const k = e.code;
      if ((k === 'Enter' || k === 'NumpadEnter') && focused() && !live()) {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return; // a focused button handles its own Enter
        e.preventDefault(); start(); return;
      }
      if (!live()) return;
      if (k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); setThrottle(true); }
      else if (k === 'Space' || k === 'ArrowRight' || k === 'KeyD' || k === 'ShiftLeft' || k === 'ShiftRight') { e.preventDefault(); if (!e.repeat) shift(); }
      else if (k === 'ArrowDown' || k === 'PageDown' || k === 'PageUp') e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'ArrowUp' || e.code === 'KeyW') setThrottle(false); };
    const blur = () => setThrottle(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [start, shift, setThrottle]);

  const other: 0 | 1 = me === 0 ? 1 : 0;
  const shareText = result
    ? t(
        `${result.win ? 'ניצחתי' : 'הפסדתי'} במרוץ 400 מטר עם ${cars[me].name} מול ${cars[other].name}: ${result.myTime.toFixed(2)} שנ׳, זמן תגובה ${result.reaction.toFixed(2)}. נסו לנצח אותי:`,
        `I ${result.win ? 'won' : 'lost'} a 400 m drag race in the ${cars[me].name} against the ${cars[other].name}: ${result.myTime.toFixed(2)} s, reaction ${result.reaction.toFixed(2)} s. Beat me:`,
      )
    : '';
  const share = async () => {
    const url = window.location.href.split('#')[0] + '#drag-race';
    try {
      if (navigator.share) { await navigator.share({ text: shareText, url }); return; }
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      setCopied(true);
    } catch { /* closed the share sheet */ }
  };

  const racing = phase === 'staging' || phase === 'racing';
  const manual = !myEv && !auto;
  const perfect = result ? result.shifts.filter(s => s === 'perfect').length : 0;
  const keycap: React.CSSProperties = { display: 'inline-block', minWidth: 26, padding: '2px 7px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.35)', borderBottomWidth: 3, background: 'rgba(255,255,255,0.08)', fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: '#f8fafc', textAlign: 'center' };
  const btn = (primary: boolean): React.CSSProperties => ({
    padding: primary ? '12px 28px' : '10px 18px', borderRadius: 12, border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)',
    background: primary ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.06)', color: '#fff',
    fontWeight: 800, fontSize: primary ? 16 : 14, cursor: 'pointer', boxShadow: primary ? '0 6px 20px rgba(34,197,94,0.35)' : 'none',
  });

  return (
    <div
      ref={wrapRef}
      tabIndex={-1}
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#020617', outline: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t(`מרוץ 400 מטר: ${a.name} מול ${b.name}`, `400 m drag race: ${a.name} vs ${b.name}`)}
        style={{ width: '100%', height, display: 'block', touchAction: racing ? 'none' : 'auto' }}
      />

      {/* Start screen */}
      {phase === 'menu' && (
        <div dir={isEn ? 'ltr' : 'rtl'} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, background: 'linear-gradient(180deg, rgba(2,6,23,0.3) 0%, rgba(2,6,23,0.88) 72%)', color: '#f8fafc', textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(18px, 3.2vw, 26px)', fontWeight: 900 }}>{t('בחרו מכונית', 'Pick your car')}</div>
          <div role="radiogroup" aria-label={t('באיזו מכונית אתם נוהגים', 'Which car you drive')} style={{ display: 'flex', gap: 10, justifyContent: 'center', width: '100%', maxWidth: 460 }}>
            {cars.map((c, i) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={me === i}
                onClick={() => setMe(i as 0 | 1)}
                style={{ flex: '1 1 0', minWidth: 0, maxWidth: 220, padding: '10px 12px', borderRadius: 14, cursor: 'pointer', textAlign: 'start', color: '#f8fafc', background: me === i ? `linear-gradient(135deg, ${COLORS[i]}, ${shade(COLORS[i], 0.55)})` : 'rgba(15,23,42,0.82)', border: `2px solid ${me === i ? '#fff' : COLORS[i]}`, boxShadow: me === i ? `0 0 24px ${COLORS[i]}88` : 'none' }}
              >
                <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}><bdi>{c.name}</bdi></div>
                <div style={{ fontSize: 12, opacity: 0.88, marginTop: 2 }}>
                  0-100 {c.accel} {t('שנ׳', 's')}{c.hp ? ` · ${c.hp} ${t('כ״ס', 'hp')}` : ''}{c.ev ? ` · ${t('חשמלית', 'EV')}` : ''}
                </div>
                <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>{t('הכי טוב אפשרי', 'Best possible')}: {ideal[i].time.toFixed(2)} {t('שנ׳', 's')}</div>
              </button>
            ))}
          </div>
          {!myEv && (
            <div role="radiogroup" aria-label={t('תיבת הילוכים', 'Gearbox')} style={{ display: 'inline-flex', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', overflow: 'hidden', fontSize: 13, fontWeight: 700 }}>
              {[{ v: false, l: t('הילוכים ידניים', 'Manual') }, { v: true, l: t('אוטומטי', 'Automatic') }].map(o => (
                <button key={o.l} type="button" role="radio" aria-checked={auto === o.v} onClick={() => setAuto(o.v)} style={{ padding: '6px 16px', border: 'none', cursor: 'pointer', color: '#fff', background: auto === o.v ? 'rgba(255,255,255,0.22)' : 'transparent' }}>{o.l}</button>
              ))}
            </div>
          )}
          <button type="button" onClick={start} style={btn(true)}>{t('לקו הזינוק', 'To the start line')}</button>
          {!touch && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12.5, color: '#cbd5e1' }}>
              <span><kbd style={keycap}>↑</kbd> {t('גז (להחזיק)', 'throttle (hold)')}</span>
              {manual && <span><kbd style={keycap}>Space</kbd> {t('העברת הילוך', 'shift up')}</span>}
              <span><kbd style={keycap}>Enter</kbd> {t('התחלה', 'start')}</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 460, lineHeight: 1.5 }}>
            {manual
              ? t('שלושה אורות כתומים ואז ירוק. העבירו הילוך כשנורות ההילוך מהבהבות בכחול - מוקדם מדי מאבד כוח, מאוחר מדי נתקע במגביל.', 'Three amber lights, then green. Shift when the shift lights flash blue - too early loses power, too late hits the limiter.')
              : t('שלושה אורות כתומים ואז ירוק. לחצו גז בדיוק בירוק - מוקדם מדי וזו פסילה.', 'Three amber lights, then green. Hit the throttle right on green - too early and you are disqualified.')}
          </div>
        </div>
      )}

      {/* On-screen pedals (touch and mouse) */}
      {racing && (
        <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }} dir="ltr">
          {manual && (
            <button
              type="button"
              onPointerDown={e => { e.preventDefault(); shift(); }}
              aria-label={t('העברת הילוך', 'Shift up')}
              style={{ width: touch ? 66 : 62, height: touch ? 66 : 62, borderRadius: 18, border: '2px solid rgba(96,165,250,0.7)', background: 'linear-gradient(180deg, rgba(59,130,246,0.3), rgba(30,64,175,0.8))', color: '#fff', fontWeight: 900, fontSize: touch ? 14 : 12, cursor: 'pointer', touchAction: 'none', lineHeight: 1.2 }}
            >▲<br />{t('הילוך', 'GEAR')}</button>
          )}
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setThrottle(true); }}
            onPointerUp={() => setThrottle(false)}
            onPointerCancel={() => setThrottle(false)}
            onLostPointerCapture={() => setThrottle(false)}
            onContextMenu={e => e.preventDefault()}
            aria-label={t('גז', 'Throttle')}
            style={{ width: touch ? 80 : 72, height: touch ? 100 : 86, borderRadius: 18, border: '2px solid rgba(74,222,128,0.8)', background: 'linear-gradient(180deg, rgba(34,197,94,0.35), rgba(21,128,61,0.85))', color: '#fff', fontWeight: 900, fontSize: touch ? 17 : 14, cursor: 'pointer', touchAction: 'none' }}
          >{t('גז', 'GAS')}</button>
        </div>
      )}

      {/* Result / false start */}
      {((phase === 'done' && result) || phase === 'foul') && (
        <div dir={isEn ? 'ltr' : 'rtl'} aria-live="polite" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(2,6,23,0.7)', color: '#f8fafc' }}>
          <div style={{ width: 'min(470px, 100%)', borderRadius: 18, padding: '18px 20px', background: 'linear-gradient(160deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            {phase === 'foul' ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#f87171' }}>{t('זינוק מוקדם!', 'False start!')}</div>
                <p style={{ margin: '8px 0 6px', color: '#cbd5e1', fontSize: 14 }}>{t('לחצתם גז לפני האור הירוק. חכו לירוק ונסו שוב.', 'You hit the throttle before the green light. Wait for green and try again.')}</p>
              </>
            ) : result && (
              <>
                <div style={{ fontSize: 28, fontWeight: 900, color: result.win ? '#86efac' : '#fca5a5' }}>
                  {result.win ? t('ניצחתם! 🏁', 'You win! 🏁') : t('הפסדתם', 'You lost')}
                </div>
                <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 2 }}>
                  {t(`בפער של ${result.gapM.toFixed(1)} מ׳ בקו הסיום`, `by ${result.gapM.toFixed(1)} m at the line`)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0' }}>
                  {[
                    { c: COLORS[me], n: cars[me].name, v: result.myTime, you: true },
                    { c: COLORS[other], n: cars[other].name, v: result.rivalTime, you: false },
                  ].map(r => (
                    <div key={r.n} style={{ padding: '10px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', borderTop: `3px solid ${r.c}` }}>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}><bdi>{r.n}</bdi>{r.you ? t(' (אתם)', ' (you)') : ''}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'ui-monospace, monospace' }} dir="ltr">{r.v >= 99 ? '—' : `${r.v.toFixed(2)}s`}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px 16px', flexWrap: 'wrap', fontSize: 13, color: '#e2e8f0' }}>
                  <span>{t('זמן תגובה', 'Reaction')}: <strong dir="ltr">{result.reaction.toFixed(3)}s</strong></span>
                  {manual && <span>{t('העברות מושלמות', 'Perfect shifts')}: <strong>{perfect}/{result.shifts.length}</strong></span>}
                  <span>{t('מהירות בקו', 'Speed at the line')}: <strong dir="ltr">{Math.round(result.trapKmh)} km/h</strong></span>
                  {result.limiterS > 0.3 && <span style={{ color: '#fca5a5' }}>{t('על המגביל', 'On the limiter')}: <strong dir="ltr">{result.limiterS.toFixed(1)}s</strong></span>}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                  {t(`הכי טוב אפשרי ל${cars[me].name}: ${ideal[me].time.toFixed(2)} שנ׳`, `Best possible for the ${cars[me].name}: ${ideal[me].time.toFixed(2)} s`)}
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <button type="button" onClick={start} style={btn(true)}>{t('עוד סיבוב', 'Race again')}</button>
              <button type="button" onClick={backToMenu} style={btn(false)}>{t('החלפת מכונית', 'Change car')}</button>
              {phase === 'done' && <button type="button" onClick={share} style={btn(false)}>{copied ? t('הועתק ✓', 'Copied ✓') : t('אתגרו חבר', 'Challenge a friend')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

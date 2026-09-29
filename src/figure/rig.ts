/**
 * Het poppetje: één skelet met vaste lichaamsverhoudingen.
 *
 * Coördinaten: viewBox 0 0 200 200, y naar beneden, vloer op y = 184.
 * Hoeken in graden, absoluut: 0 = recht omlaag, 90 = naar rechts (vooruit), 180 = omhoog, -90 = naar links.
 *
 * Een houding (Pose) legt vast waar de heup is, hoe de romp staat en waar handen en voeten
 * naartoe moeten. Ellebogen en knieën worden berekend (inverse kinematica), zodat voeten echt
 * op de grond blijven staan en armen/benen nooit van lengte veranderen.
 */

export type V = [number, number];
/** Doel voor een hand/voet: absolute positie [x, y], of polair t.o.v. schouder/heup {a: hoek, d: afstand}. */
export type Target = V | { a: number; d: number };
export type View = 'side' | 'front';

export type Scale = {
  thighN: number; shinN: number; thighF: number; shinF: number;
  upperN: number; foreN: number; upperF: number; foreF: number;
  torso: number;
  /** Schouderbreedte in vooraanzicht (kleiner = gedraaid). */
  shoulders: number;
  /** Nek (korter = hoofd tussen de schouders, bv. van achteren gezien op handen en knieën). */
  neck: number;
};

export type Pose = {
  hip: V;
  /** Richting van heup naar schouder. 180 = rechtop. */
  torso: number;
  /** Kanteling van het hoofd t.o.v. de romp. */
  head?: number;
  /** [dichtbij, veraf] in zijaanzicht; [rechterhand van de figuur (links in beeld), linker] in vooraanzicht. */
  hands: [Target, Target];
  feet: [Target, Target];
  /** Buigrichting ellebogen/knieën (+1 of -1). */
  elbows?: [number, number];
  knees?: [number, number];
  /** Vaste voethoek (absoluut); anders volgt de voet het scheenbeen. */
  footAbs?: [number, number];
  /** Verkorting door perspectief (bv. dij die naar de kijker wijst). */
  scale?: Partial<Scale>;
};

export const LEN = {
  torso: 46,
  neck: 19,
  thigh: 36,
  shin: 36,
  upper: 27,
  fore: 25,
  foot: 13,
  frontFoot: 9,
  headR: 11.5,
  hipW: 8,
  shW: 13,
} as const;

export const GROUND_Y = 186;

const RAD = Math.PI / 180;
export const dir = (a: number): V => [Math.sin(a * RAD), Math.cos(a * RAD)];
const add = (p: V, v: V, k = 1): V => [p[0] + v[0] * k, p[1] + v[1] * k];
const angleOf = (dx: number, dy: number) => Math.atan2(dx, dy) / RAD;

/** Twee-segment IK: van `root` naar `target` met lengtes l1, l2; `bend` kiest de kant van het gewricht. */
export function solveLimb(root: V, target: V, l1: number, l2: number, bend: number): { joint: V; end: V } {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  const base = d < 1e-6 ? 0 : angleOf(dx, dy);
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const A = Math.acos(Math.min(1, Math.max(-1, cosA))) / RAD;
  const joint = add(root, dir(base + bend * A), l1);
  const end = add(root, dir(base), d);
  return { joint, end };
}

export type Skeleton = {
  view: View;
  hip: V;
  shoulder: V;
  head: V;
  hipN: V; hipF: V; shN: V; shF: V;
  kneeN: V; ankleN: V; toeN: V;
  kneeF: V; ankleF: V; toeF: V;
  elbowN: V; handN: V;
  elbowF: V; handF: V;
};

const DEFAULT_SCALE: Scale = {
  thighN: 1, shinN: 1, thighF: 1, shinF: 1, upperN: 1, foreN: 1, upperF: 1, foreF: 1, torso: 1, shoulders: 1, neck: 1,
};

function resolve(t: Target, root: V): V {
  return Array.isArray(t) ? t : add(root, dir(t.a), t.d);
}

export function computeSkeleton(pose: Pose, view: View): Skeleton {
  const s = { ...DEFAULT_SCALE, ...pose.scale };
  const hip = pose.hip;
  const shoulder = add(hip, dir(pose.torso), LEN.torso * s.torso);
  const head = add(shoulder, dir(pose.torso + (pose.head ?? 0)), LEN.neck * s.neck);

  let hipN = hip, hipF = hip, shN = shoulder, shF = shoulder;
  if (view === 'front') {
    // Loodrecht op de romp: bij rechtop staan is dat horizontaal, bij een zijplank verticaal.
    const perp = dir(pose.torso + 90);
    hipN = add(hip, perp, LEN.hipW);
    hipF = add(hip, perp, -LEN.hipW);
    shN = add(shoulder, perp, LEN.shW * s.shoulders);
    shF = add(shoulder, perp, -LEN.shW * s.shoulders);
  }

  const front = view === 'front';
  const knees = pose.knees ?? (front ? [-1, 1] : [1, 1]);
  const elbows = pose.elbows ?? (front ? [-1, 1] : [-1, -1]);

  const legN = solveLimb(hipN, resolve(pose.feet[0], hipN), LEN.thigh * s.thighN, LEN.shin * s.shinN, knees[0]);
  const legF = solveLimb(hipF, resolve(pose.feet[1], hipF), LEN.thigh * s.thighF, LEN.shin * s.shinF, knees[1]);
  const armN = solveLimb(shN, resolve(pose.hands[0], shN), LEN.upper * s.upperN, LEN.fore * s.foreN, elbows[0]);
  const armF = solveLimb(shF, resolve(pose.hands[1], shF), LEN.upper * s.upperF, LEN.fore * s.foreF, elbows[1]);

  const toe = (knee: V, ankle: V, i: 0 | 1): V => {
    const shinA = angleOf(ankle[0] - knee[0], ankle[1] - knee[1]);
    if (front) {
      const a = pose.footAbs ? pose.footAbs[i] : shinA + (i === 0 ? -75 : 75);
      return add(ankle, dir(a), LEN.frontFoot);
    }
    const a = pose.footAbs ? pose.footAbs[i] : shinA + 90;
    return add(ankle, dir(a), LEN.foot);
  };

  return {
    view,
    hip, shoulder, head, hipN, hipF, shN, shF,
    kneeN: legN.joint, ankleN: legN.end, toeN: toe(legN.joint, legN.end, 0),
    kneeF: legF.joint, ankleF: legF.end, toeF: toe(legF.joint, legF.end, 1),
    elbowN: armN.joint, handN: armN.end,
    elbowF: armF.joint, handF: armF.end,
  };
}

// ── Interpolatie ─────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V, b: V, t: number): V => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function lerpTarget(a: Target, b: Target, t: number): Target {
  if (Array.isArray(a) && Array.isArray(b)) return lerpV(a, b, t);
  if (!Array.isArray(a) && !Array.isArray(b)) return { a: lerp(a.a, b.a, t), d: lerp(a.d, b.d, t) };
  // Gemengde vormen horen niet voor te komen; kies de dichtstbijzijnde.
  return t < 0.5 ? a : b;
}

const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const sa = { ...DEFAULT_SCALE, ...a.scale };
  const sb = { ...DEFAULT_SCALE, ...b.scale };
  const scale = {} as Scale;
  for (const k of Object.keys(DEFAULT_SCALE) as (keyof Scale)[]) scale[k] = lerp(sa[k], sb[k], t);
  return {
    hip: lerpV(a.hip, b.hip, t),
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head ?? 0, b.head ?? 0, t),
    hands: [lerpTarget(a.hands[0], b.hands[0], t), lerpTarget(a.hands[1], b.hands[1], t)],
    feet: [lerpTarget(a.feet[0], b.feet[0], t), lerpTarget(a.feet[1], b.feet[1], t)],
    ...(a.elbows || b.elbows ? { elbows: t < 0.5 ? (a.elbows ?? b.elbows) : (b.elbows ?? a.elbows) } : {}),
    ...(a.knees || b.knees ? { knees: t < 0.5 ? (a.knees ?? b.knees) : (b.knees ?? a.knees) } : {}),
    ...(a.footAbs && b.footAbs ? { footAbs: lerp2(a.footAbs, b.footAbs, t) } : {}),
    scale,
  };
}

// ── Animatie ─────────────────────────────────────────────────────

export type Prop = 'wall' | 'bench';
export type Part = 'legs' | 'arms' | 'torso';

export type FigureAnim = {
  view: View;
  /** Sleutelhoudingen; na de laatste volgt weer de eerste. */
  frames: Pose[];
  /** Tijd (s) van houding i naar houding i+1. */
  times: number[];
  /** 'sine' = rustig versnellen/vertragen per stap; 'linear' voor doorlopende bewegingen (rondjes). */
  ease?: 'sine' | 'linear';
  props?: Prop[];
  /** Lichaamsdelen die het werk doen (krijgen de accentkleur). */
  focus?: Part[];
  /** Welke houding als stilstaand plaatje dient. */
  still?: number;
  /** Spiegelen (bv. zijplank rechts = zijplank links gespiegeld). */
  mirror?: boolean;
  /**
   * Tekenvolgorde in vooraanzicht: 'rear' = van achteren gezien (armen en hoofd achter de romp),
   * 'legsFront' = benen vóór de romp (zittend met de knieën omhoog).
   */
  order?: 'rear' | 'legsFront';
};

const fitCache = new WeakMap<FigureAnim, [number, number, number, number]>();

/**
 * Uitsnede (viewBox) die de hele beweging netjes vult: vierkant, vloer onderaan.
 * Liggende oefeningen worden zo groter in beeld gebracht dan staande.
 */
export function fitViewBox(anim: FigureAnim): [number, number, number, number] {
  const cached = fitCache.get(anim);
  if (cached) return cached;
  let minX = Infinity, maxX = -Infinity, minY = Infinity;
  const total = cycleLength(anim);
  for (let i = 0; i < 32; i++) {
    const sk = computeSkeleton(sampleAnim(anim, (i / 32) * total), anim.view);
    const pts: V[] = [sk.hipN, sk.hipF, sk.shN, sk.shF, sk.kneeN, sk.kneeF, sk.ankleN, sk.ankleF, sk.toeN, sk.toeF, sk.elbowN, sk.elbowF, sk.handN, sk.handF];
    for (const p of pts) {
      minX = Math.min(minX, p[0] - 8);
      maxX = Math.max(maxX, p[0] + 8);
      minY = Math.min(minY, p[1] - 8);
    }
    minX = Math.min(minX, sk.head[0] - LEN.headR);
    maxX = Math.max(maxX, sk.head[0] + LEN.headR);
    minY = Math.min(minY, sk.head[1] - LEN.headR);
  }
  if (anim.props?.includes('wall')) {
    minX = Math.min(minX, 40);
    minY = Math.min(minY, 26);
  }
  if (anim.props?.includes('bench')) minX = Math.min(minX, 14);
  const bottom = GROUND_Y + 8;
  const size = Math.min(210, Math.max(150, maxX - minX + 24, bottom - minY + 12));
  let x = (minX + maxX) / 2 - size / 2;
  if (anim.mirror) x = 200 - x - size;
  const box: [number, number, number, number] = [x, bottom - size, size, size];
  fitCache.set(anim, box);
  return box;
}

export function cycleLength(anim: FigureAnim): number {
  return anim.times.reduce((s, t) => s + t, 0);
}

/** Houding op tijdstip `sec` (loopt eindeloos rond). */
export function sampleAnim(anim: FigureAnim, sec: number): Pose {
  const total = cycleLength(anim);
  let t = ((sec % total) + total) % total;
  const n = anim.frames.length;
  for (let i = 0; i < n; i++) {
    const dt = anim.times[i]!;
    if (t <= dt || i === n - 1) {
      const u = dt > 0 ? Math.min(1, t / dt) : 1;
      const e = anim.ease === 'linear' ? u : 0.5 - 0.5 * Math.cos(Math.PI * u);
      return lerpPose(anim.frames[i]!, anim.frames[(i + 1) % n]!, e);
    }
    t -= dt;
  }
  return anim.frames[0]!;
}

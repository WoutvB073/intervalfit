import { LEN, solveLimb, type Pose, type V } from './rig';

/**
 * Houdingen in 3D bedenken en als vooraanzicht-houding (2D) tekenen.
 * Nodig voor bewegingen die om de lengteas draaien (bv. Russian twists): de draai van de schouders is
 * in 2D niet te tekenen, maar wel als projectie van een 3D-houding (met verkorte ledematen).
 *
 * Assen: x = links van de figuur (+) / rechts (−), y = omhoog (vloer = 0), z = naar de kijker toe.
 * De camera kijkt van voren en kan `yaw` graden om de verticale as draaien (schuin van voren).
 */

export type V3 = [number, number, number];

const RAD = Math.PI / 180;
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm3 = (a: V3): V3 => mul3(a, 1 / (len3(a) || 1));
export const lerp3 = (a: V3, b: V3, t: number): V3 => add3(a, mul3(sub3(b, a), t));

/** Vector `v` draaien om as `axis` (genormaliseerd) over `deg` graden (Rodrigues). */
export function rotate3(v: V3, axis: V3, deg: number): V3 {
  const k = norm3(axis);
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return add3(add3(mul3(v, c), mul3(cross3(k, v), s)), mul3(k, dot3(k, v) * (1 - c)));
}

/** Gewricht (elleboog/knie) tussen `root` en `target`, met de buiging richting `pole`. */
export function joint3(root: V3, target: V3, l1: number, l2: number, pole: V3): V3 {
  const d0 = sub3(target, root);
  const d = Math.min(Math.max(len3(d0), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const u = norm3(d0);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const v = norm3(sub3(pole, mul3(u, dot3(pole, u))));
  return add3(add3(root, mul3(u, a)), mul3(v, h));
}

export type Body3D = {
  pelvis: V3;
  chest: V3;
  head: V3;
  /** Rechts (R) = rechterkant van de figuur = links in beeld (in de 2D-houding "N"). */
  shR: V3; shL: V3;
  elbowR: V3; elbowL: V3;
  handR: V3; handL: V3;
  kneeR: V3; kneeL: V3;
  ankleR: V3; ankleL: V3;
};

const GROUND = 186;
const MIN_SCALE = 0.08;

/** Orthografische projectie naar het 200×200-beeld (vloer op y = 186). */
export function project(p: V3, yaw: number): V {
  const c = Math.cos(yaw * RAD);
  const s = Math.sin(yaw * RAD);
  return [100 + p[0] * c + p[2] * s, GROUND - p[1]];
}

const sub2 = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const len2 = (a: V) => Math.hypot(a[0], a[1]);
const angle2 = (a: V) => Math.atan2(a[0], a[1]) / RAD;
const dirDeg = (a: number): V => [Math.sin(a * RAD), Math.cos(a * RAD)];

/**
 * Zet een 3D-lichaam om naar een vooraanzicht-houding: hoek en verkorting van romp en schouders,
 * verkorte armen/benen (schaal = geprojecteerde lengte), en per elleboog/knie de buigrichting
 * die het dichtst bij de echte (geprojecteerde) plek uitkomt.
 */
export function poseFrom3D(b: Body3D, yaw = 0): Pose {
  const P = (v: V3) => project(v, yaw);
  const hip = P(b.pelvis);
  const chest = P(b.chest);
  const spine = sub2(chest, hip);
  const torso = angle2(spine);
  const perp = dirDeg(torso + 90); // richting van de rechterschouder (N) in het vooraanzicht
  const shoulders = Math.max(MIN_SCALE, ((P(b.shR)[0] - chest[0]) * perp[0] + (P(b.shR)[1] - chest[1]) * perp[1]) / LEN.shW);
  const headV = sub2(P(b.head), chest);

  // Aanzetpunten zoals het skelet ze berekent (zie computeSkeleton, vooraanzicht).
  const shN: V = [chest[0] + perp[0] * LEN.shW * shoulders, chest[1] + perp[1] * LEN.shW * shoulders];
  const shF: V = [chest[0] - perp[0] * LEN.shW * shoulders, chest[1] - perp[1] * LEN.shW * shoulders];
  const hipN: V = [hip[0] + perp[0] * LEN.hipW, hip[1] + perp[1] * LEN.hipW];
  const hipF: V = [hip[0] - perp[0] * LEN.hipW, hip[1] - perp[1] * LEN.hipW];

  const limb = (root: V, joint3D: V3, end3D: V3, base: V, l1: number, l2: number) => {
    const j = P(joint3D);
    const e = P(end3D);
    const s1 = Math.max(MIN_SCALE, len2(sub2(j, base)) / l1);
    const s2 = Math.max(MIN_SCALE, len2(sub2(e, j)) / l2);
    const a = solveLimb(root, e, l1 * s1, l2 * s2, 1).joint;
    const c = solveLimb(root, e, l1 * s1, l2 * s2, -1).joint;
    const bend = len2(sub2(a, j)) <= len2(sub2(c, j)) ? 1 : -1;
    return { end: e, s1, s2, bend };
  };
  const armR = limb(shN, b.elbowR, b.handR, P(b.shR), LEN.upper, LEN.fore);
  const armL = limb(shF, b.elbowL, b.handL, P(b.shL), LEN.upper, LEN.fore);
  const legR = limb(hipN, b.kneeR, b.ankleR, P(add3(b.pelvis, [-LEN.hipW, 0, 0])), LEN.thigh, LEN.shin);
  const legL = limb(hipF, b.kneeL, b.ankleL, P(add3(b.pelvis, [LEN.hipW, 0, 0])), LEN.thigh, LEN.shin);

  return {
    hip,
    torso,
    head: angle2(headV) - torso,
    hands: [armR.end, armL.end],
    feet: [legR.end, legL.end],
    elbows: [armR.bend, armL.bend],
    knees: [legR.bend, legL.bend],
    scale: {
      torso: len2(spine) / LEN.torso,
      neck: len2(headV) / LEN.neck,
      shoulders,
      upperN: armR.s1, foreN: armR.s2, upperF: armL.s1, foreF: armL.s2,
      thighN: legR.s1, shinN: legR.s2, thighF: legL.s1, shinF: legL.s2,
    },
  };
}

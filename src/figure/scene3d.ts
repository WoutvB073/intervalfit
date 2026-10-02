import type { Part, V } from './rig';
import { add3, type Body3D, type V3 } from './body3d';

/**
 * 3D-figuurtje met een camera die er langzaam omheen draait (voor bewegingen die je in 2D niet goed ziet,
 * zoals de draai van de romp bij Russian twists). Geen bibliotheek: 3D-punten worden geprojecteerd en de
 * lichaamsdelen van achter naar voor getekend, in dezelfde lijnstijl en themakleuren als de 2D-figuurtjes.
 *
 * Assen: x = links van de figuur, y = omhoog (vloer = 0), z = naar voren (de kant waar het gezicht naar wijst).
 */
export type Anim3D = {
  kind: '3d';
  /** Duur van één herhaling van de beweging (s). */
  cycle: number;
  /** Tijd voor een hele rondgang van de camera (s). */
  orbit: number;
  /** Camerahoek bij t = 0 (graden; 0 = recht van voren, positief = naar de linkerkant van de figuur). */
  startYaw: number;
  /** Hoe ver de camera van boven kijkt (graden). */
  pitch: number;
  /** Houding op tijdstip `t` binnen één herhaling (0 ≤ t < cycle). */
  body: (t: number) => Body3D;
  /** Lichaamsdelen in de accentkleur. */
  focus: Part[];
  /** Tijdstip (s, op de doorlopende klok) voor het stilstaande plaatje. */
  still: number;
  /** Straal van het matje op de vloer (rond het midden tussen bekken en voeten). */
  mat: number;
};

const RAD = Math.PI / 180;

export type Seg = {
  key: string;
  kind: 'upper' | 'fore' | 'thigh' | 'shin' | 'foot';
  a: V;
  b: V;
  depth: number;
  accent: boolean;
  far: boolean;
  halo: boolean;
};

export type Frame3D = {
  segs: Seg[];
  torso: { pts: V[]; depth: number; accent: boolean };
  head: { c: V; depth: number };
  mat: V[];
};

function camera(yaw: number, pitch: number) {
  const cy = Math.cos(yaw * RAD), sy = Math.sin(yaw * RAD);
  const cp = Math.cos(pitch * RAD), sp = Math.sin(pitch * RAD);
  /** Wereld → beeld (x, y in het 200×200-vlak) + diepte (groter = dichter bij de kijker). */
  return (p: V3): { s: V; d: number } => {
    const xc = p[0] * cy - p[2] * sy;
    const zc = p[0] * sy + p[2] * cy;
    const yc = p[1] * cp - zc * sp;
    const d = zc * cp + p[1] * sp;
    return { s: [100 - xc, 186 - yc], d };
  };
}

export const yawAt = (anim: Anim3D, sec: number) => anim.startYaw + (360 * sec) / anim.orbit;

/** Alles wat getekend moet worden op tijdstip `sec` (doorlopende klok). */
export function frame3D(anim: Anim3D, sec: number): Frame3D {
  const t = ((sec % anim.cycle) + anim.cycle) % anim.cycle;
  const b = anim.body(t);
  const cam = camera(yawAt(anim, sec), anim.pitch);
  const P = (v: V3) => cam(v);
  const hipR = add3(b.pelvis, [-8, 0, 0]);
  const hipL = add3(b.pelvis, [8, 0, 0]);
  const toe = (ankle: V3, side: number): V3 => add3(ankle, [side * 2, -2, 11]);
  const focus = new Set(anim.focus);
  const has = (p: Part, side: 'N' | 'F') => focus.has(p) || focus.has(`${p.replace(/s$/, '')}${side}` as Part);

  const torsoD = P(b.chest).d * 0.5 + P(b.pelvis).d * 0.5;
  // De lichaamshelft die van de kijker af ligt (links/rechts, niet voor/achter) krijgt de lichtere kleur,
  // zoals de verre arm en het verre been in de zijaanzichten.
  const farArm = { R: P(b.shR).d < P(b.shL).d - 4, L: P(b.shL).d < P(b.shR).d - 4 };
  const farLeg = { R: P(hipR).d < P(hipL).d - 4, L: P(hipL).d < P(hipR).d - 4 };
  const seg = (key: string, kind: Seg['kind'], a: V3, c: V3, part: Part, side: 'N' | 'F'): Seg => {
    const pa = P(a), pc = P(c);
    const lr = side === 'N' ? 'R' : 'L';
    return {
      key, kind, a: pa.s, b: pc.s, depth: (pa.d + pc.d) / 2,
      accent: has(part, side),
      far: part === 'arms' ? farArm[lr] : farLeg[lr],
      halo: kind === 'upper' || kind === 'fore',
    };
  };
  // R = rechterkant van de figuur = "N" (dichtbij in de 2D-figuren), L = "F".
  const segs: Seg[] = [
    seg('upperR', 'upper', b.shR, b.elbowR, 'arms', 'N'),
    seg('foreR', 'fore', b.elbowR, b.handR, 'arms', 'N'),
    seg('upperL', 'upper', b.shL, b.elbowL, 'arms', 'F'),
    seg('foreL', 'fore', b.elbowL, b.handL, 'arms', 'F'),
    seg('thighR', 'thigh', hipR, b.kneeR, 'legs', 'N'),
    seg('shinR', 'shin', b.kneeR, b.ankleR, 'legs', 'N'),
    seg('footR', 'foot', b.ankleR, toe(b.ankleR, -1), 'legs', 'N'),
    seg('thighL', 'thigh', hipL, b.kneeL, 'legs', 'F'),
    seg('shinL', 'shin', b.kneeL, b.ankleL, 'legs', 'F'),
    seg('footL', 'foot', b.ankleL, toe(b.ankleL, 1), 'legs', 'F'),
  ];
  const torsoPts = [b.shR, b.shL, hipL, hipR].map((v) => P(v).s);

  // Matje: cirkel op de vloer rond het midden van bekken en voeten.
  const mid: V3 = [(b.pelvis[0] + b.ankleR[0] + b.ankleL[0]) / 3, 0, (b.pelvis[2] + b.ankleR[2] + b.ankleL[2]) / 3];
  const mat: V[] = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return P(add3(mid, [Math.cos(a) * anim.mat, 0, Math.sin(a) * anim.mat * 0.72])).s;
  });

  return {
    segs,
    torso: { pts: torsoPts, depth: torsoD, accent: focus.has('torso') },
    head: { c: P(b.head).s, depth: P(b.head).d + 1.5 },
    mat,
  };
}

const boxCache = new WeakMap<Anim3D, [number, number, number, number]>();

/** Vaste uitsnede die de hele beweging en een hele rondgang van de camera omvat. */
export function fitViewBox3D(anim: Anim3D): [number, number, number, number] {
  const cached = boxCache.get(anim);
  if (cached) return cached;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const n = 72;
  for (let i = 0; i < n; i++) {
    const f = frame3D(anim, (i / n) * anim.orbit + (i % 9) * (anim.cycle / 9));
    const pts: V[] = [...f.segs.flatMap((s) => [s.a, s.b]), ...f.torso.pts, ...f.mat];
    for (const p of pts) {
      minX = Math.min(minX, p[0] - 8);
      maxX = Math.max(maxX, p[0] + 8);
      minY = Math.min(minY, p[1] - 8);
      maxY = Math.max(maxY, p[1] + 8);
    }
    minY = Math.min(minY, f.head.c[1] - 13);
  }
  const size = Math.min(210, Math.max(150, maxX - minX + 8, maxY - minY + 8));
  const box: [number, number, number, number] = [(minX + maxX) / 2 - size / 2, (minY + maxY) / 2 - size / 2, size, size];
  boxCache.set(anim, box);
  return box;
}


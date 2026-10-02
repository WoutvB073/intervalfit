import { add3, joint3, lerp3, mul3, norm3, reach3, rotate3, type Body3D, type V3 } from './body3d';
import type { Anim3D } from './scene3d';
import { getAnimation } from './animations';

/**
 * 3D-animaties (met langzaam draaiende camera), voor oefeningen waarbij een draai om de lengteas
 * de kern is. Sleutel = id uit src/data/exercises.ts. Een oefening staat óf hier, óf in animations.ts.
 */

const RAD = Math.PI / 180;

/**
 * Russian twists: zittend op de billen, romp 38° achterover (V-houding), knieën gebogen, voeten net los van de
 * vloer, handen samen voor de borst. Romp en schouders draaien om de ruggengraat naar links en rechts; de handen
 * gaan daarbij naast de heup richting de vloer. De benen blijven stil.
 */
function russianTwists(): Anim3D {
  const lean = 38;
  const pelvis: V3 = [0, 11, 0];
  const spine: V3 = [0, Math.cos(lean * RAD), -Math.sin(lean * RAD)];
  const forward0: V3 = [0, Math.sin(lean * RAD), Math.cos(lean * RAD)];
  const X: V3 = [1, 0, 0];
  const MAX_TWIST = 55;
  const cycle = 2.6;
  // Benen: stil, knieën omhoog, voeten net van de vloer.
  const hipR = add3(pelvis, [-8, 0, 0]);
  const hipL = add3(pelvis, [8, 0, 0]);
  const ankleR: V3 = [-10, 13, 44];
  const ankleL: V3 = [10, 13, 44];
  const kneeR = joint3(hipR, ankleR, 36, 36, [-0.3, 1, 0.1]);
  const kneeL = joint3(hipL, ankleL, 36, 36, [0.3, 1, 0.1]);

  const body = (t: number): Body3D => {
    const s = Math.sin((2 * Math.PI * t) / cycle); // −1 … 1: rechts … links
    const side = Math.sign(s) || 1;
    const amount = Math.abs(s);
    const twist = MAX_TWIST * s;
    const right = rotate3(X, spine, twist);
    const fwd = rotate3(forward0, spine, twist);
    const chest = add3(pelvis, mul3(spine, 46));
    const shL = add3(chest, mul3(right, 13));
    const shR = add3(chest, mul3(right, -13));
    const head = add3(chest, mul3(norm3(add3(spine, mul3(fwd, 0.3))), 19));
    // Handen: samen voor de borst → naast de heup, net boven de vloer.
    const atChest = add3(add3(chest, mul3(spine, -18)), mul3(fwd, 22));
    const atFloor: V3 = [side * 27, 5, 6];
    const mid = lerp3(atChest, atFloor, Math.pow(amount, 1.6));
    const armR = reach3(shR, add3(mid, mul3(right, -2.5)), 27, 25, [-0.6, -1, 0.1]);
    const armL = reach3(shL, add3(mid, mul3(right, 2.5)), 27, 25, [0.6, -1, 0.1]);
    return {
      pelvis, chest, head, shR, shL, ankleR, ankleL, kneeR, kneeL,
      elbowR: armR.joint, handR: armR.end,
      elbowL: armL.joint, handL: armL.end,
    };
  };
  return {
    kind: '3d',
    cycle,
    orbit: 18,
    startYaw: 30,
    pitch: 24,
    body,
    focus: ['torso'],
    still: cycle / 4, // helemaal naar links gedraaid
    mat: 46,
  };
}

export const ANIMATIONS_3D: Record<string, Anim3D> = {
  'russian-twists': russianTwists(),
};

export function getAnimation3D(id: string | undefined): Anim3D | undefined {
  return id ? ANIMATIONS_3D[id] : undefined;
}

/** Heeft deze oefening een figuurtje (2D of 3D)? Zo niet, dan een letter-tegel. */
export function hasAnimation(id: string | undefined): boolean {
  return !!(getAnimation(id) || getAnimation3D(id));
}

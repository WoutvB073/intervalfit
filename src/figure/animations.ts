import { BAR_Y, STEP, type FigureAnim, type Pose, type Target, type V } from './rig';
import { add3, joint3, lerp3, mul3, norm3, poseFrom3D, rotate3, type Body3D, type V3 } from './body3d';

/**
 * Animaties per oefening (sleutel = id uit src/data/exercises.ts).
 * Een oefening zonder animatie krijgt automatisch een nette letter-tegel.
 *
 * Zijaanzicht: de figuur kijkt naar rechts. Vloer op y = 184; enkels staand op y = 176.
 * Liggend: rompmidden op y ≈ 177, hoofdmidden op y ≈ 172,5.
 * Gestrekt been = 71,9 lang, gestrekte arm = 51,5 (net onder de maximale lengte, dus zonder knik).
 */

const pol = (a: number, d: number): Target => ({ a, d });
const P = (base: Pose, over: Partial<Pose>): Pose => ({ ...base, ...over });

const LEG = 71.9;
const ARM = 51.5;
const BODY = 46 + LEG; // schouder → enkel bij een gestrekt lichaam

const angleTo = (from: V, to: V) => (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;

/** Recht lichaam van schouder naar enkel/knie (plank, opdrukken): de heup ligt op de lijn. */
function straightBody(shoulder: V, end: V): { hip: V; torso: number } {
  const dx = end[0] - shoulder[0];
  const dy = end[1] - shoulder[1];
  const d = Math.hypot(dx, dy);
  const hip: V = [shoulder[0] + (dx / d) * 46, shoulder[1] + (dy / d) * 46];
  return { hip, torso: angleTo(hip, shoulder) };
}

/** Punt op afstand r van `pivot`, op hoogte y (rechts ervan). */
const around = (pivot: V, y: number, r: number): V => [pivot[0] + Math.sqrt(r * r - (pivot[1] - y) ** 2), y];
/** Punt op afstand r van `pivot`, op hoogte y (links ervan). */
const aroundLeft = (pivot: V, y: number, r: number): V => [pivot[0] - Math.sqrt(r * r - (pivot[1] - y) ** 2), y];

// ── Veelgebruikte houdingen ───────────────────────────────────────

/** Platte voet op de grond (voet draait niet mee met het scheenbeen). */
const FLAT: [number, number] = [82, 82];

const STAND: Pose = {
  hip: [100, 105],
  torso: 180,
  head: 0,
  hands: [pol(7, 50), pol(3, 50)],
  feet: [[100, 176], [100, 176]],
  footAbs: FLAT,
};

const FRONT_STAND: Pose = {
  hip: [100, 105],
  torso: 180,
  head: 0,
  hands: [pol(-7, 50), pol(7, 50)],
  feet: [[92, 176], [108, 176]],
};

/** Handen op de heupen (zijaanzicht). */
const ON_HIPS: [Target, Target] = [pol(9, 44), pol(6, 44)];

/** Armen gestrekt langs het lichaam op de vloer (liggend op de rug, hoofd links). */
const ARMS_ON_FLOOR: [Target, Target] = [pol(87, ARM), pol(86, ARM)];

/** Liggend op de rug, hoofd links, knieën gebogen, voeten plat. */
const BACK_BENT: Pose = {
  hip: [95, 177],
  torso: -90,
  head: -15,
  hands: ARMS_ON_FLOOR,
  elbows: [1, 1],
  feet: [[132, 176], [132, 176]],
  footAbs: [95, 95],
};

/** Handen en knieën (zijaanzicht), hoofd rechts. */
const QUAD: Pose = {
  hip: [80, 143],
  torso: 107.7,
  head: 0,
  hands: [pol(0, 50), pol(0, 50)],
  feet: [[46, 179], [46, 179]],
};

// Opdrukken: rond de enkels draaien, handen blijven op de grond.
const PU_ANKLE: V = [40, 173];
const PU_HANDS: [Target, Target] = [[155, 180], [155, 180]];
const HIGH_PLANK: Pose = { ...straightBody(around(PU_ANKLE, 128.8, BODY), PU_ANKLE), head: 0, hands: PU_HANDS, feet: [PU_ANKLE, PU_ANKLE] };
const LOW_PUSHUP: Pose = { ...straightBody(around(PU_ANKLE, 162, BODY), PU_ANKLE), head: 0, hands: PU_HANDS, feet: [PU_ANKLE, PU_ANKLE] };

// Burpees en squat thrusts (handen en voeten absoluut).
const BP_HANDS: [Target, Target] = [[134, 180], [134, 180]];
const BP_SHOULDER: V = [132, 128.5];
const BP_ANKLE: V = aroundLeft(BP_SHOULDER, 173, BODY);
const B_STAND: Pose = { hip: [110, 105], torso: 180, head: 0, hands: [[113, 110], [111, 110]], feet: [[110, 176], [110, 176]], footAbs: [82, 82] };
const B_SQUAT: Pose = { hip: [88, 150], torso: 115, head: 30, hands: BP_HANDS, feet: [[110, 176], [110, 176]], footAbs: [82, 82] };
const B_PLANK: Pose = { ...straightBody(BP_SHOULDER, BP_ANKLE), head: 0, hands: BP_HANDS, feet: [BP_ANKLE, BP_ANKLE], footAbs: [14, 14] };

/** Arm-rondjes: gestrekte armen die kleine cirkels maken. */
function circleFrames(): Pose[] {
  const frames: Pose[] = [];
  for (let k = 0; k < 12; k++) {
    const th = (k / 12) * Math.PI * 2;
    const a = 90 + 8 * Math.sin(th);
    const d = 50.2 + 1.3 * Math.cos(th);
    frames.push(P(FRONT_STAND, { hands: [pol(-a, d), pol(a, d)] }));
  }
  return frames;
}

/** Hardlopen op de plaats: stap links, landen, stap rechts, landen. */
function runCycle(opts: { lift: Target; stanceHip: number; liftHip: number; torso: number; arms: [Target, Target]; step: number }): FigureAnim {
  const stance = pol(0, LEG);
  const land: Pose = { hip: [100, opts.stanceHip], torso: opts.torso, head: 0, hands: [pol(12, 42), pol(12, 42)], feet: [pol(4, 71.2), pol(-3, 71.2)] };
  const a: Pose = { hip: [100, opts.liftHip], torso: opts.torso, head: 0, hands: opts.arms, feet: [opts.lift, stance] };
  const b: Pose = { ...a, hands: [opts.arms[1], opts.arms[0]], feet: [stance, opts.lift] };
  return {
    view: 'side',
    focus: ['legs'],
    frames: [a, land, b, land],
    times: [opts.step, opts.step, opts.step, opts.step],
  };
}

/**
 * Curls (zijaanzicht, staand): de elleboog blijft onder de schouder, de onderarm draait omhoog.
 * Frames langs een boog (met eigen versnellen/vertragen), zodat de hand een cirkel volgt.
 * `mode`: 'both' = beide armen tegelijk, 'alternate' = om en om (hamer curls),
 * 'single' = alleen de arm dichtbij (rechts); de andere hangt stil met de dumbbell. Links = gespiegeld.
 */
function curlAnim(dumbbells: 'end' | 'side', mode: 'both' | 'alternate' | 'single'): FigureAnim {
  const shoulder: V = [100, 59];
  const hand = (fore: number, dx: number): V => {
    const elbow: V = [shoulder[0] + 3 + dx, shoulder[1] + 26.8];
    return [elbow[0] + Math.sin((fore * Math.PI) / 180) * 24.8, elbow[1] + Math.cos((fore * Math.PI) / 180) * 24.8];
  };
  const DOWN = 12;
  const UP = 150;
  const base: Pose = { hip: [100, 105], torso: 180, head: 0, hands: [hand(DOWN, 0), hand(DOWN, -2)], feet: [[100, 176], [100, 176]], footAbs: FLAT };
  const N = 6;
  const angles: number[] = [];
  for (let k = 0; k <= N; k++) angles.push(DOWN + (UP - DOWN) * (0.5 - 0.5 * Math.cos((Math.PI * k) / N)));
  const sweep = [...angles, ...angles.slice(1, -1).reverse()]; // omhoog en weer omlaag
  const frames: Pose[] = [];
  const times: number[] = [];
  const step = 0.8 / N;
  const push = (near: number, far: number, t: number) => {
    frames.push({ ...base, hands: [hand(near, 0), hand(far, -2)] });
    times.push(t);
  };
  if (mode === 'both' || mode === 'single') {
    sweep.forEach((a, i) => push(a, mode === 'single' ? DOWN : a, i === N ? 0.3 : step)); // bovenin even vasthouden
    times[times.length - 1] = 0.35;
  } else {
    sweep.forEach((a, i) => push(a, DOWN, i === N ? 0.25 : step));
    sweep.forEach((a, i) => push(DOWN, a, i === N ? 0.25 : step));
  }
  return { view: 'side', focus: [mode === 'single' ? 'armN' : 'arms'], ease: 'linear', dumbbells, frames, times, still: N };
}

/**
 * Pull-ups en chin-ups (vooraanzicht, aan een stang). Bovenhands = breed, ellebogen naar buiten;
 * onderhands = op schouderbreedte, ellebogen naar voren (bovenarm verkort in beeld).
 */
function hangAnim(grip: 'over' | 'under'): FigureAnim {
  const wide = grip === 'over';
  const hx = wide ? 37 : 15;
  const hands: [Target, Target] = [[100 - hx, BAR_Y], [100 + hx, BAR_Y]];
  const bottomY = wide ? BAR_Y + 45 : BAR_Y + 50; // schouderhoogte hangend (armen gestrekt)
  const topY = BAR_Y + 6; // kin boven de stang
  const legs = { shinN: 0.55, shinF: 0.55 };
  const at = (shY: number): Pose => {
    const pose: Pose = {
      hip: [100, shY + 46],
      torso: 180,
      head: 0,
      hands,
      feet: [[95, shY + 100], [105, shY + 100]],
      scale: legs,
    };
    if (wide) return pose;
    // Onderhands: de onderarm blijft verticaal onder de hand, de elleboog wijst naar voren.
    // Van voren gezien is de bovenarm dan verkort: lengte = afstand schouder → elleboogpunt.
    const elbow: V = [100 - hx, BAR_Y + 25.2];
    const k = Math.max(0.12, Math.hypot(100 - 13 - elbow[0], shY - elbow[1]) / 27);
    return { ...pose, elbows: [1, -1], scale: { ...legs, upperN: k, upperF: k } };
  };
  if (wide) {
    return {
      view: 'front',
      order: 'hang',
      focus: ['arms', 'torso'],
      props: ['bar'],
      grip,
      still: 1,
      frames: [at(bottomY), at(topY), at(topY), at(bottomY)],
      times: [0.9, 0.25, 0.9, 0.45],
    };
  }
  // Veel tussenstappen (lineair, zelf versneld/vertraagd), zodat de elleboog op zijn plek blijft.
  const N = 8;
  const ys = Array.from({ length: N + 1 }, (_, i) => bottomY + (topY - bottomY) * (0.5 - 0.5 * Math.cos((Math.PI * i) / N)));
  const up = ys.map(at);
  const frames = [...up, ...up.slice(1, -1).reverse()];
  const times = frames.map((_, i) => (i === N ? 0.25 : i === frames.length - 1 ? 0.4 : 0.9 / N));
  return { view: 'front', order: 'hang', focus: ['arms', 'torso'], props: ['bar'], grip, ease: 'linear', still: N, frames, times };
}

/**
 * Russian twists, opgebouwd in 3D (zie body3d.ts): zittend op de billen, romp ± 38° achterover (V-houding),
 * knieën gebogen met de hielen op de grond. De romp en schouders draaien om de ruggengraat; de handen
 * (samen voor de borst) tikken naast de heup bijna de vloer aan. De benen blijven stil.
 * `yaw`: camera schuin van voren (graden), zodat zowel de V-houding als de draai te zien is.
 */
function russianTwist(yaw: number): FigureAnim {
  const lean = 38;
  const pelvis: V3 = [0, 11, 0];
  const spine: V3 = [0, Math.cos((lean * Math.PI) / 180), -Math.sin((lean * Math.PI) / 180)];
  const forward0: V3 = [0, Math.sin((lean * Math.PI) / 180), Math.cos((lean * Math.PI) / 180)];
  const X: V3 = [1, 0, 0];
  const MAX_TWIST = 55;

  /** u = 0: midden (handen voor de borst); u = 1: helemaal naar `side` gedraaid (+1 = links van de figuur). */
  const body = (side: number, u: number): Body3D => {
    const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const twist = side * MAX_TWIST * e;
    const right = rotate3(X, spine, twist);
    const fwd = rotate3(forward0, spine, twist);
    const chest = add3(pelvis, mul3(spine, 46));
    const shL = add3(chest, mul3(right, 13));
    const shR = add3(chest, mul3(right, -13));
    const head = add3(chest, mul3(norm3(add3(spine, mul3(fwd, 0.25))), 19));
    // Handen: samen voor de borst → naast de heup, net boven de vloer.
    const atChest = add3(add3(chest, mul3(spine, -18)), mul3(fwd, 22));
    const atFloor: V3 = [side * 27, 5, 7];
    const mid = lerp3(atChest, atFloor, Math.pow(e, 1.3));
    const handL = add3(mid, mul3(right, 2.5));
    const handR = add3(mid, mul3(right, -2.5));
    const hipR = add3(pelvis, [-8, 0, 0]);
    const hipL = add3(pelvis, [8, 0, 0]);
    const ankleR: V3 = [-11, 6, 47];
    const ankleL: V3 = [11, 6, 47];
    return {
      pelvis, chest, head, shR, shL, handR, handL, ankleR, ankleL,
      elbowR: joint3(shR, handR, 27, 25, [-0.6, -1, 0.1]),
      elbowL: joint3(shL, handL, 27, 25, [0.6, -1, 0.1]),
      kneeR: joint3(hipR, ankleR, 36, 36, [-0.35, 1, 0.15]),
      kneeL: joint3(hipL, ankleL, 36, 36, [0.35, 1, 0.15]),
    };
  };
  const N = 5;
  // Voeten plat op de hielen, tenen naar voren (schuin naar rechts in beeld).
  const swing = (side: number) => Array.from({ length: N + 1 }, (_, i): Pose => ({ ...poseFrom3D(body(side, i / N), yaw), footAbs: [76, 76] }));
  const toLeft = swing(1);
  const toRight = swing(-1);
  // midden → links → midden → rechts → (midden)
  const frames = [...toLeft, ...toLeft.slice(1, -1).reverse(), ...toRight, ...toRight.slice(1, -1).reverse()];
  const step = 0.09;
  const times = frames.map((_, i) => (i === N || i === 3 * N - 1 ? 0.16 : step));
  return { view: 'front', order: 'legsFront', focus: ['torso'], ease: 'linear', still: N, frames, times };
}

export const ANIMATIONS: Record<string, FigureAnim> = {
  // ══ Benen & billen ══════════════════════════════════════════════
  squats: (() => {
    // Eerst de heupen naar achteren (scharnieren), dan zakken: zo blijft de knie achter de tenen.
    const mid: Pose = { hip: [80, 119], torso: 162, head: 10, hands: [pol(50, 49), pol(46, 49)], feet: [[100, 176], [100, 176]], footAbs: FLAT };
    const bottom: Pose = { hip: [72, 136], torso: 145, head: 22, hands: [pol(88, 49), pol(84, 49)], feet: [[100, 176], [100, 176]], footAbs: FLAT };
    return {
      view: 'side',
      focus: ['legs'],
      still: 3,
      frames: [STAND, STAND, mid, bottom, bottom, mid],
      times: [0.35, 0.55, 0.55, 0.25, 0.5, 0.6],
    } satisfies FigureAnim;
  })(),

  'goblet-squats': (() => {
    // Zelfde squat als hierboven, met één dumbbell rechtop tegen de borst: handen voor de borst, ellebogen omlaag.
    // De handen bewegen mee met de romp (hoek ten opzichte van de romp blijft gelijk).
    // Elleboog 10° voor de romp omlaag, onderarm schuin omhoog: handen onder de kin (afstand 17,9 onder 74°).
    const atChest = (torso: number): [Target, Target] => [pol(torso - 106, 17.9), pol(torso - 106, 17.9)];
    const stand: Pose = { ...STAND, hands: atChest(180) };
    const mid: Pose = { hip: [80, 119], torso: 162, head: 10, hands: atChest(162), feet: [[100, 176], [100, 176]], footAbs: FLAT };
    const bottom: Pose = { hip: [72, 136], torso: 145, head: 22, hands: atChest(145), feet: [[100, 176], [100, 176]], footAbs: FLAT };
    return {
      view: 'side',
      focus: ['legs'],
      dumbbells: 'goblet',
      still: 3,
      frames: [stand, stand, mid, bottom, bottom, mid],
      times: [0.35, 0.55, 0.55, 0.25, 0.5, 0.6],
    } satisfies FigureAnim;
  })(),

  'jump-squats': (() => {
    const squat: Pose = { hip: [74, 134], torso: 148, head: 20, hands: [pol(-40, 50), pol(-44, 50)], feet: [[100, 176], [100, 176]], footAbs: FLAT };
    return {
      view: 'side',
      focus: ['legs'],
      still: 1,
      frames: [
        squat,
        { hip: [100, 90], torso: 180, head: 0, hands: [pol(172, ARM), pol(168, ARM)], feet: [[100, 161], [100, 161]], footAbs: [60, 60] },
        { hip: [95, 113], torso: 170, head: 5, hands: [pol(40, 50), pol(36, 50)], feet: [[100, 176], [100, 176]], footAbs: FLAT },
        squat,
      ],
      times: [0.38, 0.32, 0.5, 0.4],
    } satisfies FigureAnim;
  })(),

  'sumo-squats': (() => {
    const up: Pose = { hip: [100, 108], torso: 180, head: 0, hands: [[97, 88], [103, 88]], feet: [[70, 176], [130, 176]] };
    const down: Pose = { ...up, hip: [100, 130], hands: [[97, 110], [103, 110]], scale: { thighN: 0.72, thighF: 0.72 } };
    return { view: 'front', focus: ['legs'], still: 1, frames: [up, down, down, up], times: [1.1, 0.3, 1.0, 0.4] } satisfies FigureAnim;
  })(),

  lunges: (() => {
    // Vooruit stappen: de achterste voet blijft staan (hiel omhoog), het lichaam gaat mee naar voren.
    const stand: Pose = { ...STAND, hands: ON_HIPS, footAbs: [82, 82] };
    const stepN: Pose = { hip: [114, 110], torso: 180, head: 0, hands: ON_HIPS, feet: [[140, 166], [100, 176]], footAbs: [70, 82] };
    const lungeN: Pose = { hip: [130, 136], torso: 180, head: 0, hands: ON_HIPS, feet: [[162, 176], [100, 170]], footAbs: [82, 38] };
    const stepF: Pose = { ...stepN, feet: [[100, 176], [140, 166]], footAbs: [82, 70] };
    const lungeF: Pose = { ...lungeN, feet: [[100, 170], [162, 176]], footAbs: [38, 82] };
    return {
      view: 'side',
      focus: ['legs'],
      still: 2,
      frames: [stand, stepN, lungeN, lungeN, stepN, stand, stand, stepF, lungeF, lungeF, stepF, stand],
      times: [0.35, 0.45, 0.3, 0.45, 0.35, 0.25, 0.35, 0.45, 0.3, 0.45, 0.35, 0.25],
    } satisfies FigureAnim;
  })(),

  'reverse-lunges': (() => {
    // Achteruit stappen: de voorste voet blijft staan.
    const stand: Pose = { ...STAND, hands: ON_HIPS, footAbs: [82, 82] };
    const stepN: Pose = { hip: [96, 110], torso: 180, head: 0, hands: ON_HIPS, feet: [[80, 166], [100, 176]], footAbs: [95, 82] };
    const lungeN: Pose = { hip: [70, 136], torso: 180, head: 0, hands: ON_HIPS, feet: [[38, 170], [100, 176]], footAbs: [38, 82] };
    const stepF: Pose = { ...stepN, feet: [[100, 176], [80, 166]], footAbs: [82, 95] };
    const lungeF: Pose = { ...lungeN, feet: [[100, 176], [38, 170]], footAbs: [82, 38] };
    return {
      view: 'side',
      focus: ['legs'],
      still: 2,
      frames: [stand, stepN, lungeN, lungeN, stepN, stand, stand, stepF, lungeF, lungeF, stepF, stand],
      times: [0.35, 0.45, 0.3, 0.45, 0.35, 0.25, 0.35, 0.45, 0.3, 0.45, 0.35, 0.25],
    } satisfies FigureAnim;
  })(),

  'side-lunges': (() => {
    const stand: Pose = { hip: [100, 105], torso: 180, head: 0, hands: [[97, 84], [103, 84]], feet: [[92, 176], [108, 176]] };
    const midN: Pose = { hip: [90, 108], torso: 182, head: 0, hands: [[86, 87], [92, 87]], feet: [[62, 166], [108, 176]] };
    const lungeN: Pose = {
      hip: [72, 128], torso: 184, head: 0, hands: [[66, 106], [72, 106]], feet: [[40, 176], [134, 176]],
      scale: { thighN: 0.75 },
    };
    const midF: Pose = { hip: [110, 108], torso: 178, head: 0, hands: [[108, 87], [114, 87]], feet: [[92, 176], [138, 166]] };
    const lungeF: Pose = {
      hip: [128, 128], torso: 176, head: 0, hands: [[128, 106], [134, 106]], feet: [[66, 176], [160, 176]],
      scale: { thighF: 0.75 },
    };
    return {
      view: 'front',
      focus: ['legs'],
      still: 2,
      frames: [stand, midN, lungeN, lungeN, midN, stand, stand, midF, lungeF, lungeF, midF, stand],
      times: [0.35, 0.45, 0.3, 0.45, 0.35, 0.25, 0.35, 0.45, 0.3, 0.45, 0.35, 0.25],
    } satisfies FigureAnim;
  })(),

  'glute-bridge': (() => {
    const up = P(BACK_BENT, { hip: [91, 157], torso: -65.6, head: -36 });
    return { view: 'side', focus: ['legs'], still: 1, frames: [BACK_BENT, up, up, BACK_BENT], times: [0.9, 0.6, 0.9, 0.45] } satisfies FigureAnim;
  })(),

  'wall-sit': {
    view: 'side',
    focus: ['legs'],
    props: ['wall'],
    frames: [
      { hip: [68, 140], torso: 180, head: -8, hands: [pol(32, 50), pol(29, 50)], feet: [[104, 176], [104, 176]], footAbs: FLAT },
      { hip: [68, 139.2], torso: 180, head: -8, hands: [pol(32, 50), pol(29, 50)], feet: [[104, 176], [104, 176]], footAbs: FLAT },
    ],
    times: [1.6, 1.6],
  },

  'calf-raises': (() => {
    const down: Pose = { ...STAND, hands: ON_HIPS, footAbs: [82, 82] };
    const up: Pose = { hip: [103, 95], torso: 180, head: 0, hands: ON_HIPS, feet: [[105, 166], [105, 166]], footAbs: [32, 32] };
    return { view: 'side', focus: ['legs'], still: 1, frames: [down, up, up, down], times: [0.7, 0.45, 0.7, 0.4] } satisfies FigureAnim;
  })(),

  'donkey-kicks': {
    view: 'side',
    focus: ['legs'],
    still: 1,
    frames: [
      QUAD,
      P(QUAD, { feet: [[48, 104], [46, 179]] }),
      P(QUAD, { feet: [[48, 104], [46, 179]] }),
      QUAD,
      P(QUAD, { feet: [[46, 179], [48, 104]] }),
      P(QUAD, { feet: [[46, 179], [48, 104]] }),
    ],
    times: [0.55, 0.25, 0.55, 0.55, 0.25, 0.55],
  },

  'fire-hydrants': (() => {
    // Van achteren gezien op handen en knieën; het been gaat opzij omhoog.
    const base: Pose = {
      hip: [100, 142],
      torso: 180,
      head: 0,
      hands: [[84, 180], [116, 180]],
      feet: [[92, 183], [108, 183]],
      scale: { torso: 0.3, shinN: 0.15, shinF: 0.15, neck: 0.45 },
    };
    const liftF = P(base, { feet: [[92, 183], [145, 146]], torso: 177 });
    const liftN = P(base, { feet: [[55, 146], [108, 183]], torso: 183 });
    return {
      view: 'front',
      order: 'rear',
      focus: ['legs'],
      still: 1,
      frames: [base, liftF, liftF, base, liftN, liftN],
      times: [0.6, 0.3, 0.6, 0.6, 0.3, 0.6],
    } satisfies FigureAnim;
  })(),

  'side-leg-raises-left': (() => {
    // Vooraanzicht, liggend op de rechterzij (hoofd links in beeld, rechterkant onder),
    // hoofd rust op de gestrekte onderste arm, bovenste hand op de vloer voor de borst.
    // Het bovenste (linker)been gaat gestrekt omhoog tot ± 45°.
    const hip: V = [115, 170];
    const shoulder: V = [69.5, 163];
    const rest: Pose = {
      hip,
      torso: angleTo(hip, shoulder),
      head: 0,
      // Onderste arm: elleboog op de vloer, hand onder het hoofd. Bovenste arm: onderarm plat op de vloer voor de borst.
      hands: [[60, 164], [88, 178]],
      elbows: [1, -1],
      feet: [[185.7, 178.4], pol(83, LEG)],
      footAbs: [92, 83],
    };
    const lifted: Pose = { ...rest, feet: [[185.7, 178.4], pol(135, LEG)], footAbs: [92, 135] };
    return {
      view: 'front',
      focus: ['legF', 'hipF'],
      still: 1,
      frames: [rest, lifted, lifted, rest],
      times: [1.1, 0.3, 1.3, 0.5],
    } satisfies FigureAnim;
  })(),

  // ══ Bovenlichaam ═══════════════════════════════════════════════
  'push-ups': {
    view: 'side',
    focus: ['arms'],
    still: 2,
    frames: [HIGH_PLANK, LOW_PUSHUP, LOW_PUSHUP, HIGH_PLANK],
    times: [0.9, 0.15, 0.85, 0.35],
  },

  'knee-push-ups': (() => {
    const knee: V = [82, 177];
    const reach = 46 + 36;
    const hands: [Target, Target] = [[154, 180], [154, 180]];
    const feet: [Target, Target] = [[52.5, 156.4], [52.5, 156.4]];
    const top: Pose = { ...straightBody(around(knee, 128.8, reach), knee), head: 0, hands, feet };
    const bottom: Pose = { ...straightBody(around(knee, 162, reach), knee), head: 0, hands, feet };
    return { view: 'side', focus: ['arms'], still: 1, frames: [top, bottom, bottom, top], times: [0.9, 0.15, 0.85, 0.35] } satisfies FigureAnim;
  })(),

  'tricep-dips': (() => {
    const hands: [Target, Target] = [[70, 126], [70, 126]];
    const feet: [Target, Target] = [[128, 176], [128, 176]];
    const top: Pose = { hip: [90, 124], torso: 185, head: 0, hands, feet, footAbs: FLAT };
    const bottom: Pose = { hip: [91, 148], torso: 181, head: 0, hands, feet, footAbs: FLAT };
    return {
      view: 'side',
      focus: ['arms'],
      props: ['bench'],
      still: 1,
      frames: [top, bottom, bottom, top],
      times: [0.9, 0.15, 0.85, 0.35],
    } satisfies FigureAnim;
  })(),

  'plank-shoulder-taps': (() => {
    const shoulder: V = around(PU_ANKLE, 128.8, BODY);
    const tap: V = [shoulder[0] + 1, shoulder[1] + 7];
    return {
      view: 'side',
      focus: ['arms', 'torso'],
      still: 1,
      frames: [HIGH_PLANK, P(HIGH_PLANK, { hands: [tap, PU_HANDS[1]] }), HIGH_PLANK, P(HIGH_PLANK, { hands: [PU_HANDS[0], tap] })],
      times: [0.45, 0.45, 0.45, 0.45],
    } satisfies FigureAnim;
  })(),

  'arm-circles': {
    view: 'front',
    focus: ['arms'],
    ease: 'linear',
    frames: circleFrames(),
    times: Array(12).fill(0.075),
  },

  superman: (() => {
    const down: Pose = { hip: [84, 177], torso: 90, head: 15, hands: [pol(90, ARM), pol(90, ARM)], elbows: [1, 1], feet: [pol(-88, LEG), pol(-88, LEG)] };
    const up: Pose = { ...down, torso: 100, head: 22, hands: [pol(103, ARM), pol(102, ARM)], feet: [pol(-100, LEG), pol(-99, LEG)] };
    return { view: 'side', focus: ['torso'], still: 1, frames: [down, up, up, down], times: [0.8, 0.8, 0.8, 0.45] } satisfies FigureAnim;
  })(),

  // ══ Core ═══════════════════════════════════════════════════════
  plank: (() => {
    // Op de onderarmen: elleboog recht onder de schouder.
    const pose = (shY: number): Pose => {
      const shoulder: V = [140, shY];
      const ankle = aroundLeft(shoulder, 174, BODY);
      return { ...straightBody(shoulder, ankle), head: 0, hands: [[165, 179], [165, 179]], feet: [ankle, ankle] };
    };
    return { view: 'side', focus: ['torso'], frames: [pose(152), pose(151.2)], times: [1.6, 1.6] } satisfies FigureAnim;
  })(),

  'side-plank-left': (() => {
    const base: Pose = {
      hip: [101.9, 146.7],
      torso: 101.8,
      head: 0,
      hands: [[144, 73], [152, 181]],
      feet: [[34, 169], [34, 177]],
      scale: { foreF: 0.3 },
    };
    return {
      view: 'front',
      focus: ['torso'],
      frames: [base, P(base, { hip: [101.9, 145.7], torso: 101.3 })],
      times: [1.6, 1.6],
    } satisfies FigureAnim;
  })(),

  crunches: (() => {
    const chest = (torso: number): [Target, Target] => [pol(torso + 180, 22), pol(torso + 176, 22)];
    const down: Pose = P(BACK_BENT, { hands: chest(-90) });
    const up: Pose = P(BACK_BENT, { torso: -122, head: -30, hands: chest(-122) });
    return { view: 'side', focus: ['torso'], still: 1, frames: [down, up, up, down], times: [0.7, 0.3, 0.7, 0.35] } satisfies FigureAnim;
  })(),

  'sit-ups': (() => {
    const chest = (torso: number): [Target, Target] => [pol(torso + 180, 22), pol(torso + 176, 22)];
    const down: Pose = P(BACK_BENT, { hands: chest(-90) });
    const up: Pose = P(BACK_BENT, { torso: -198, head: -8, hands: chest(-198) });
    return { view: 'side', focus: ['torso'], still: 1, frames: [down, up, up, down], times: [1.0, 0.25, 1.0, 0.35] } satisfies FigureAnim;
  })(),

  'bicycle-crunches': (() => {
    const base: Pose = { ...BACK_BENT, torso: -112, head: -25, hands: [pol(-150, 16), pol(-146, 16)], elbows: [-1, -1], footAbs: undefined };
    const a: Pose = { ...base, feet: [[118, 142], [160, 150]], torso: -114 };
    const b: Pose = { ...base, feet: [[160, 150], [118, 142]], torso: -110 };
    return { view: 'side', focus: ['torso'], frames: [a, b], times: [0.55, 0.55] } satisfies FigureAnim;
  })(),

  'russian-twists': russianTwist(40),

  'leg-raises': (() => {
    const down: Pose = { hip: [95, 177], torso: -90, head: -15, hands: ARMS_ON_FLOOR, elbows: [1, 1], feet: [pol(94, LEG), pol(94, LEG)] };
    const up: Pose = { ...down, feet: [pol(178, LEG), pol(178, LEG)] };
    return { view: 'side', focus: ['torso'], still: 1, frames: [down, up, up, down], times: [1.1, 0.25, 1.1, 0.3] } satisfies FigureAnim;
  })(),

  'flutter-kicks': (() => {
    const base: Pose = { hip: [95, 177], torso: -100, head: -20, hands: ARMS_ON_FLOOR, elbows: [1, 1], feet: [pol(106, LEG), pol(96, LEG)] };
    return { view: 'side', focus: ['torso'], frames: [base, { ...base, feet: [pol(96, LEG), pol(106, LEG)] }], times: [0.3, 0.3] } satisfies FigureAnim;
  })(),

  'dead-bug': (() => {
    const a: Pose = { hip: [95, 177], torso: -90, head: -15, hands: [pol(180, ARM), pol(180, ARM)], feet: [pol(135, 50.9), pol(135, 50.9)] };
    const b: Pose = { ...a, hands: [pol(250, ARM), pol(180, ARM)], feet: [pol(135, 50.9), pol(97, LEG)] };
    const d: Pose = { ...a, hands: [pol(180, ARM), pol(250, ARM)], feet: [pol(97, LEG), pol(135, 50.9)] };
    return {
      view: 'side',
      focus: ['torso'],
      still: 1,
      frames: [a, b, b, a, a, d, d, a],
      times: [0.9, 0.35, 0.9, 0.25, 0.9, 0.35, 0.9, 0.25],
    } satisfies FigureAnim;
  })(),

  'bird-dog': (() => {
    const base: Pose = { ...QUAD, feet: [pol(-43.4, 49.5), pol(-43.4, 49.5)] };
    const a: Pose = { ...base, hands: [pol(98, ARM), pol(0, 50)], feet: [pol(-43.4, 49.5), pol(-96, LEG)] };
    const b: Pose = { ...base, hands: [pol(0, 50), pol(98, ARM)], feet: [pol(-96, LEG), pol(-43.4, 49.5)] };
    return {
      view: 'side',
      focus: ['torso'],
      still: 1,
      frames: [base, a, a, base, b, b],
      times: [0.8, 0.6, 0.8, 0.8, 0.6, 0.8],
    } satisfies FigureAnim;
  })(),

  'hollow-hold': (() => {
    const a: Pose = { hip: [104, 177], torso: -100, head: -12, hands: [pol(-122, ARM), pol(-122, ARM)], feet: [pol(100, LEG), pol(100, LEG)] };
    const b: Pose = { ...a, torso: -101, hands: [pol(-123.5, ARM), pol(-123.5, ARM)], feet: [pol(101.5, LEG), pol(101.5, LEG)] };
    return { view: 'side', focus: ['torso'], frames: [a, b], times: [1.5, 1.5] } satisfies FigureAnim;
  })(),

  // ══ Cardio ═════════════════════════════════════════════════════
  'jumping-jacks': (() => {
    const closed: Pose = { hip: [100, 105], torso: 180, head: 0, hands: [pol(-8, 50), pol(8, 50)], feet: [[94, 176], [106, 176]] };
    const air: Pose = { hip: [100, 97], torso: 180, head: 0, hands: [pol(-90, ARM), pol(90, ARM)], feet: [[82, 168], [118, 168]] };
    const open: Pose = { hip: [100, 108], torso: 180, head: 0, hands: [pol(-156, ARM), pol(156, ARM)], feet: [[66, 176], [134, 176]] };
    return {
      view: 'front',
      focus: ['legs', 'arms'],
      still: 2,
      frames: [closed, air, open, air],
      times: [0.24, 0.24, 0.24, 0.24],
    } satisfies FigureAnim;
  })(),

  'high-knees': runCycle({ lift: pol(45, 50.9), stanceHip: 105, liftHip: 101, torso: 178, arms: [pol(-35, 38), pol(70, 38)], step: 0.16 }),

  'butt-kicks': runCycle({ lift: pol(-40, 20), stanceHip: 105, liftHip: 103, torso: 176, arms: [pol(-25, 40), pol(45, 40)], step: 0.15 }),

  burpees: {
    view: 'side',
    focus: ['legs', 'arms'],
    still: 5,
    frames: [
      B_STAND,
      B_SQUAT,
      B_PLANK,
      B_PLANK,
      B_SQUAT,
      { hip: [110, 94], torso: 180, head: 0, hands: [[113, -3], [111, -3]], feet: [[110, 164], [110, 164]], footAbs: [60, 60] },
      { hip: [110, 112], torso: 172, head: -5, hands: [[118, 100], [116, 100]], feet: [[110, 176], [110, 176]], footAbs: [82, 82] },
    ],
    times: [0.55, 0.35, 0.2, 0.35, 0.4, 0.35, 0.35],
  },

  'mountain-climbers': (() => {
    const shoulder: V = [138, 128.5];
    const ankle = aroundLeft(shoulder, 173, BODY);
    const base: Pose = { ...straightBody(shoulder, ankle), head: 0, hands: [[140, 180], [140, 180]], feet: [ankle, ankle] };
    const a: Pose = { ...base, feet: [[100, 166], ankle] };
    const b: Pose = { ...base, feet: [ankle, [100, 166]] };
    return { view: 'side', focus: ['legs', 'torso'], frames: [a, b], times: [0.3, 0.3] } satisfies FigureAnim;
  })(),

  skaters: (() => {
    // Vooraanzicht: landen op één been, het andere zwaait er schuin achterlangs; de andere arm zwaait voor het lichaam langs.
    // Steunbeen: dij wijst naar de kijker (verkort), dus het been lijkt recht maar korter.
    const a: Pose = {
      hip: [70, 122], torso: 190, head: -6,
      hands: [[32, 128], [56, 126]],
      feet: [[62, 176], [38, 170]],
      knees: [-1, 1],
      scale: { thighN: 0.47 },
    };
    const mid: Pose = { hip: [100, 97], torso: 180, head: 0, hands: [[86, 134], [114, 134]], feet: [[96, 168], [104, 168]] };
    const b: Pose = {
      hip: [130, 122], torso: 170, head: 6,
      hands: [[144, 126], [168, 128]],
      feet: [[162, 170], [138, 176]],
      knees: [-1, 1],
      scale: { thighF: 0.47 },
    };
    return {
      view: 'front',
      focus: ['legs'],
      frames: [a, mid, b, mid],
      times: [0.38, 0.3, 0.38, 0.3],
    } satisfies FigureAnim;
  })(),

  'squat-thrusts': {
    view: 'side',
    focus: ['legs', 'arms'],
    still: 1,
    frames: [B_SQUAT, B_PLANK, B_PLANK, B_SQUAT],
    times: [0.35, 0.25, 0.35, 0.35],
  },

  'jog-in-place': runCycle({ lift: pol(12, 58), stanceHip: 105, liftHip: 103, torso: 177, arms: [pol(-20, 40), pol(35, 40)], step: 0.18 }),

  // ══ Uitbreiding: met en zonder materiaal ═══════════════════════
  'step-ups': (() => {
    // Zijaanzicht, trede rechts. Eén been op de trede, omhoog duwen, bijzetten, achteruit terug; dan het andere been.
    const top = STEP.top - 10; // enkelhoogte bovenop de trede
    const arms = (a: number): [Target, Target] => [pol(a, 48), pol(-a, 48)];
    const floor: Pose = { hip: [84, 105], torso: 180, head: 0, hands: arms(0), feet: [[84, 176], [84, 176]], footAbs: FLAT };
    const place: Pose = { hip: [90, 108], torso: 174, head: 0, hands: arms(-14), feet: [[130, top], [84, 176]], footAbs: FLAT };
    const drive: Pose = { hip: [114, 88], torso: 168, head: 4, hands: arms(22), feet: [[130, top], [104, 162]], footAbs: [82, 55] };
    const onTop: Pose = { hip: [131, 75], torso: 180, head: 0, hands: arms(0), feet: [[130, top], [134, top]], footAbs: FLAT };
    const down: Pose = { hip: [112, 92], torso: 176, head: 0, hands: arms(-12), feet: [[94, 166], [134, top]], footAbs: [70, 82] };
    const downFloor: Pose = { hip: [94, 106], torso: 178, head: 0, hands: arms(8), feet: [[86, 176], [132, top]], footAbs: FLAT };
    const swap = (p: Pose): Pose => ({
      ...p,
      hands: [p.hands[1], p.hands[0]],
      feet: [p.feet[1], p.feet[0]],
      ...(p.footAbs ? { footAbs: [p.footAbs[1], p.footAbs[0]] as [number, number] } : {}),
    });
    return {
      view: 'side',
      focus: ['legs'],
      props: ['step'],
      still: 2,
      frames: [floor, place, drive, onTop, down, downFloor, floor, swap(place), swap(drive), swap(onTop), swap(down), swap(downFloor)],
      times: [0.35, 0.35, 0.35, 0.3, 0.35, 0.3, 0.35, 0.35, 0.35, 0.3, 0.35, 0.3],
    } satisfies FigureAnim;
  })(),

  'single-leg-bridge-left': (() => {
    // Zoals de glute bridge, maar het achterste been blijft gestrekt in de lucht.
    // Het voorste been (dichtbij = links) doet het werk. Rechts = gespiegeld.
    const down: Pose = { ...BACK_BENT, feet: [[132, 176], pol(140, LEG)], footAbs: [95, 140] };
    const up: Pose = { ...BACK_BENT, hip: [91, 157], torso: -65.6, head: -36, feet: [[132, 176], pol(114.4, LEG)], footAbs: [95, 114.4] };
    return { view: 'side', focus: ['legN'], still: 1, frames: [down, up, up, down], times: [0.9, 0.6, 0.9, 0.45] } satisfies FigureAnim;
  })(),

  'pike-push-ups': (() => {
    // Omgekeerde V: heupen hoog, hoofd zakt tussen de handen richting de grond.
    const ankle: V = [70, 166];
    const hands: [Target, Target] = [[142, 180], [142, 180]];
    const feet: [Target, Target] = [ankle, ankle];
    const top: Pose = { hip: [100.7, 101], torso: 50, head: 0, hands, feet, footAbs: [30, 30] };
    const bottom: Pose = { hip: [108, 106], torso: 28, head: 0, hands, feet, footAbs: [30, 30] };
    return { view: 'side', focus: ['arms'], still: 1, frames: [top, bottom, bottom, top], times: [0.9, 0.15, 0.85, 0.35] } satisfies FigureAnim;
  })(),

  'plank-up-downs': (() => {
    // Van onderarmplank naar hoge plank en terug, één arm tegelijk; het lichaam draait om de enkels.
    const ankle = PU_ANKLE;
    const shLow = around(ankle, 152, BODY);
    const shMid = around(ankle, 140.5, BODY);
    const forearm = (sh: V): V => [sh[0] + 25, 179];
    const palm = (sh: V): V => [sh[0] + 1, 180];
    const F: Pose = { ...straightBody(shLow, ankle), head: 0, hands: [forearm(shLow), forearm(shLow)], feet: [ankle, ankle] };
    const H: Pose = { ...HIGH_PLANK };
    const upN: Pose = { ...straightBody(shMid, ankle), head: 0, hands: [palm(shMid), forearm(shMid)], feet: [ankle, ankle] };
    const upF: Pose = { ...straightBody(shMid, ankle), head: 0, hands: [forearm(shMid), palm(shMid)], feet: [ankle, ankle] };
    return {
      view: 'side',
      focus: ['arms', 'torso'],
      still: 1,
      frames: [F, upN, H, upN, F, upF, H, upF],
      times: [0.35, 0.35, 0.3, 0.35, 0.35, 0.35, 0.3, 0.35],
    } satisfies FigureAnim;
  })(),

  'v-ups': (() => {
    // Plat liggend met armen boven het hoofd, dan tegelijk romp en gestrekte benen omhoog tot een V.
    const down: Pose = { hip: [100, 177], torso: -90, head: -12, hands: [pol(-92, ARM), pol(-93, ARM)], feet: [pol(92, LEG), pol(92, LEG)] };
    // -265° = 95°, maar zo draaien de armen boven langs (niet door de vloer).
    const up: Pose = { hip: [100, 176], torso: -140, head: -8, hands: [pol(-265, ARM), pol(-266, ARM)], feet: [pol(138, LEG), pol(138, LEG)] };
    return { view: 'side', focus: ['torso'], still: 1, frames: [down, up, up, down], times: [0.75, 0.25, 0.75, 0.35] } satisfies FigureAnim;
  })(),

  'heel-touches': (() => {
    // Op de rug, knieën gebogen, schouders net los; om en om een hand richting de hiel.
    // Van bovenaf gezien (hoofd links): benen gebogen (knieën naar boven, dus verkort in beeld),
    // de romp buigt opzij zodat de hand de hiel aan dezelfde kant aantikt.
    const hip: V = [112, 100];
    const legs = { thighN: 0.62, thighF: 0.62, shinN: 0.5, shinF: 0.5 };
    const feet: [Target, Target] = [[140, 121], [140, 79]];
    const pose = (torso: number, reachN: boolean): Pose => ({
      hip,
      torso,
      head: 0,
      // Gestrekte armen (doel buiten bereik): de reikende hand komt bij de hiel, de andere schuift terug.
      hands: reachN ? [[170, 128], [150, 70]] : [[150, 130], [170, 72]],
      feet,
      knees: [-1, 1],
      elbows: [-1, 1],
      scale: { ...legs, torso: 0.94 },
    });
    return {
      view: 'front',
      topDown: true,
      focus: ['torso'],
      frames: [pose(-76, true), pose(-104, false)],
      times: [0.45, 0.45],
    } satisfies FigureAnim;
  })(),

  'bicep-curls': curlAnim('end', 'both'),
  'bicep-curls-right': curlAnim('end', 'single'),
  'hammer-curls': curlAnim('side', 'alternate'),

  'pull-ups': hangAnim('over'),
  'chin-ups': hangAnim('under'),

  'hanging-knee-raises': (() => {
    // Zijaanzicht: hangend aan een stang bij de deurpost, knieën omhoog tot heuphoogte.
    const hands: [Target, Target] = [[101, BAR_Y], [99, BAR_Y]];
    const down: Pose = { hip: [100, 111.5], torso: 180, head: 0, hands, feet: [pol(-22, 64), pol(-18, 64)], elbows: [1, 1] };
    const up: Pose = { hip: [104, 110], torso: 186, head: -6, hands, feet: [[136, 146], [134, 148]], elbows: [1, 1] };
    return { view: 'side', focus: ['torso'], props: ['barSide'], still: 1, frames: [down, up, up, down], times: [0.8, 0.3, 0.8, 0.4] } satisfies FigureAnim;
  })(),
};

// Zijplank rechts = zijplank links, gespiegeld.
ANIMATIONS['side-plank-right'] = { ...ANIMATIONS['side-plank-left']!, mirror: true };
// Side leg raises rechts = links, gespiegeld (op de linkerzij, rechterbeen omhoog).
ANIMATIONS['side-leg-raises-right'] = { ...ANIMATIONS['side-leg-raises-left']!, mirror: true };
// Bicep curls links = rechts, gespiegeld (de figuur kijkt dan naar links; de werkende arm blijft dichtbij).
ANIMATIONS['bicep-curls-left'] = { ...ANIMATIONS['bicep-curls-right']!, mirror: true };
// Single-leg bridge rechts = links, gespiegeld.
ANIMATIONS['single-leg-bridge-right'] = { ...ANIMATIONS['single-leg-bridge-left']!, mirror: true };

export function getAnimation(id: string | undefined): FigureAnim | undefined {
  return id ? ANIMATIONS[id] : undefined;
}

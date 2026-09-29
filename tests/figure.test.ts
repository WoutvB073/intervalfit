import { describe, expect, it } from 'vitest';
import { ANIMATIONS } from '../src/figure/animations';
import { EXERCISES } from '../src/data/exercises';
import { computeSkeleton, cycleLength, fitViewBox, LEN, sampleAnim, solveLimb, type V } from '../src/figure/rig';

const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('skelet (inverse kinematica)', () => {
  it('houdt de lengtes van de ledematen vast', () => {
    const { joint, end } = solveLimb([0, 0], [30, 40], 36, 36, 1);
    expect(dist([0, 0], joint)).toBeCloseTo(36, 5);
    expect(dist(joint, end)).toBeCloseTo(36, 5);
    expect(end[0]).toBeCloseTo(30, 5);
    expect(end[1]).toBeCloseTo(40, 5);
  });

  it('strekt het been als het doel te ver weg ligt (nooit langer dan het been)', () => {
    const { end } = solveLimb([0, 0], [0, 500], 36, 36, 1);
    expect(dist([0, 0], end)).toBeLessThanOrEqual(72);
  });
});

describe('animaties', () => {
  it('bestaan voor alle oefeningen', () => {
    for (const e of EXERCISES) expect(ANIMATIONS[e.id], e.id).toBeDefined();
  });

  it('geven op elk moment geldige getallen en blijven binnen beeld', () => {
    for (const [id, anim] of Object.entries(ANIMATIONS)) {
      expect(anim.frames.length, id).toBe(anim.times.length);
      const total = cycleLength(anim);
      for (let i = 0; i < 40; i++) {
        const sk = computeSkeleton(sampleAnim(anim, (i / 40) * total), anim.view);
        for (const v of Object.values(sk)) {
          if (Array.isArray(v)) {
            expect(Number.isFinite(v[0]) && Number.isFinite(v[1]), `${id} @${i}`).toBe(true);
          }
        }
        // Niets onder de vloer (vloer op y = 186, dikte van de lijnen meegerekend).
        for (const p of [sk.ankleN, sk.ankleF, sk.handN, sk.handF, sk.kneeN, sk.kneeF]) {
          expect(p[1], `${id} @${i}`).toBeLessThan(186);
        }
      }
      const [, , size] = fitViewBox(anim);
      expect(size, id).toBeGreaterThanOrEqual(150);
      expect(size, id).toBeLessThanOrEqual(210);
    }
  });

  it('squats: voeten blijven staan en de knie komt niet voorbij de tenen', () => {
    const anim = ANIMATIONS.squats!;
    const total = cycleLength(anim);
    for (let i = 0; i < 40; i++) {
      const sk = computeSkeleton(sampleAnim(anim, (i / 40) * total), 'side');
      expect(sk.ankleN[0]).toBeCloseTo(100, 1);
      expect(sk.ankleN[1]).toBeCloseTo(176, 1);
      expect(sk.kneeN[0]).toBeLessThanOrEqual(sk.toeN[0] + 0.5);
    }
  });

  it('opdrukken en plank: rechte lijn van schouder via heup naar enkel', () => {
    for (const id of ['push-ups', 'plank', 'mountain-climbers']) {
      const anim = ANIMATIONS[id]!;
      const sk = computeSkeleton(anim.frames[0]!, 'side');
      // Afstand van de heup tot de lijn schouder–enkel (alleen bij gestrekt achterbeen).
      const ankle = id === 'mountain-climbers' ? sk.ankleF : sk.ankleN;
      const [x1, y1] = sk.shoulder;
      const [x2, y2] = ankle;
      const [x0, y0] = sk.hip;
      const off = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / Math.hypot(y2 - y1, x2 - x1);
      expect(off, id).toBeLessThan(1);
    }
  });

  it('opdrukken bovenin: armen gestrekt', () => {
    const sk = computeSkeleton(ANIMATIONS['push-ups']!.frames[0]!, 'side');
    expect(dist(sk.shN, sk.handN)).toBeGreaterThan(LEN.upper + LEN.fore - 1);
  });
});

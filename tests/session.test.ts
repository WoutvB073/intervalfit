import { describe, expect, it } from 'vitest';
import { Session } from '../src/engine/session';
import { buildTimeline } from '../src/model/timeline';
import type { Workout } from '../src/model/types';

function workout(): Workout {
  return {
    id: 'w',
    name: 'Test',
    rounds: 2,
    restSec: 5,
    roundRestSec: 10,
    exercises: [
      { id: 'a', libraryId: 'jumping-jacks', name: 'Jumping jacks', workSec: 10 },
      { id: 'b', libraryId: 'squats', name: 'Squats', workSec: 20 },
    ],
    createdAt: 0,
    updatedAt: 0,
  };
}

/** Nep-klok die we zelf vooruit zetten. */
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (sec: number) => (t += sec * 1000) };
}

// Fases: [aftellen 10] werk a 10, rust 5, werk b 20, rondepauze 10, werk a 10, rust 5, werk b 20  → totaal 90 s
const setup = () => {
  const c = clock();
  const s = new Session(buildTimeline(workout(), 10), c.now);
  return { c, s };
};

describe('tijdmotor', () => {
  it('telt af en gaat op het juiste moment naar de volgende fase', () => {
    const { c, s } = setup();
    s.start();
    expect(s.phase?.type).toBe('countdown');
    c.advance(9.5);
    expect(s.update()).toEqual([]);
    expect(Math.ceil(s.remaining())).toBe(1);
    c.advance(0.6);
    const changes = s.update();
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ from: 0, to: 1, late: false });
    expect(s.phase?.type).toBe('work');
    expect(s.remaining()).toBeCloseTo(9.9, 5);
  });

  it('klopt na lang wegschakelen: springt in één keer naar de juiste fase (zonder geluid)', () => {
    const { c, s } = setup();
    s.start();
    c.advance(10 + 10 + 5 + 7); // aftellen + werk a + rust + 7 s in werk b
    const changes = s.update();
    expect(changes).toHaveLength(3);
    expect(changes.every((ch) => ch.late)).toBe(true);
    expect(s.index).toBe(3);
    expect(s.elapsed()).toBeCloseTo(7, 5);
  });

  it('pauzeren houdt de tijd stil en hervatten gaat verder waar het was', () => {
    const { c, s } = setup();
    s.start();
    c.advance(12); // 2 s in werk a
    s.update();
    s.pause();
    c.advance(300); // 5 minuten pauze
    expect(s.update()).toEqual([]);
    expect(s.elapsed()).toBeCloseTo(2, 5);
    s.resume();
    c.advance(1);
    s.update();
    expect(s.index).toBe(1);
    expect(s.elapsed()).toBeCloseTo(3, 5);
  });

  it('overslaan gaat naar de volgende fase en telt alleen de gedane tijd', () => {
    const { c, s } = setup();
    s.start();
    c.advance(10 + 4); // 4 s in werk a
    s.update();
    s.skip();
    expect(s.phase?.type).toBe('rest');
    expect(s.elapsed()).toBe(0);
    expect(s.totalWorkSec()).toBeCloseTo(4, 5);
  });

  it('vorige: na 3 s opnieuw dezelfde oefening, anders de vorige oefening', () => {
    const { c, s } = setup();
    s.start();
    c.advance(10 + 10 + 5 + 5); // 5 s in werk b (index 3)
    s.update();
    s.prev();
    expect(s.index).toBe(3); // opnieuw werk b
    expect(s.elapsed()).toBe(0);
    c.advance(1);
    s.prev();
    expect(s.index).toBe(1); // binnen 3 s → vorige oefening (werk a)
    // Tijdens rust → terug naar de oefening die net klaar was
    c.advance(10.2);
    s.update();
    expect(s.phase?.type).toBe('rest');
    s.prev();
    expect(s.index).toBe(1);
  });

  it('vorige vanaf de eerste oefening blijft bij de eerste oefening', () => {
    const { c, s } = setup();
    s.start();
    c.advance(11);
    s.update();
    s.prev();
    expect(s.index).toBe(1);
  });

  it('eindigt na de laatste fase en telt de werktijd per oefening', () => {
    const { c, s } = setup();
    s.start();
    c.advance(90.1);
    const changes = s.update();
    expect(changes.at(-1)?.to).toBe(-1);
    expect(s.status).toBe('finished');
    const stats = Object.fromEntries(s.workStats().map((w) => [w.key, w.workSec]));
    expect(stats['jumping-jacks']).toBeCloseTo(20, 5);
    expect(stats.squats).toBeCloseTo(40, 5);
    expect(s.activeSec()).toBeCloseTo(80, 5); // zonder aftellen
  });

  it('stoppen halverwege telt alleen wat gedaan is', () => {
    const { c, s } = setup();
    s.start();
    c.advance(10 + 10 + 5 + 8);
    s.update();
    s.stop();
    expect(s.status).toBe('finished');
    expect(s.totalWorkSec()).toBeCloseTo(18, 5);
  });

  it('overslaan tijdens pauze blijft gepauzeerd', () => {
    const { c, s } = setup();
    s.start();
    c.advance(12);
    s.update();
    s.pause();
    s.skip();
    expect(s.status).toBe('paused');
    c.advance(30);
    expect(s.elapsed()).toBe(0);
  });

  it('geeft de begintijd van latere fases voor het inplannen van geluid', () => {
    const { s } = setup();
    s.start();
    const t0 = s.phaseStartAt(0);
    expect(s.phaseStartAt(1) - t0).toBe(10_000);
    expect(s.phaseStartAt(3) - t0).toBe(25_000);
  });
});

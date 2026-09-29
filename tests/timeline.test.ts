import { describe, expect, it } from 'vitest';
import { buildTimeline, totalDurationSec, totalWorkSec } from '../src/model/timeline';
import { createSampleWorkouts } from '../src/data/sampleWorkouts';
import type { Workout } from '../src/model/types';

function workout(partial: Partial<Workout>): Workout {
  return {
    id: 'w',
    name: 'Test',
    exercises: [],
    restSec: 10,
    rounds: 1,
    roundRestSec: 30,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

const ex = (id: string, workSec: number, restSec?: number) => ({ id, name: id, workSec, restSec });

describe('buildTimeline', () => {
  it('is leeg zonder oefeningen', () => {
    expect(buildTimeline(workout({}))).toEqual([]);
  });

  it('zet rust tussen oefeningen maar niet na de laatste', () => {
    const w = workout({ exercises: [ex('a', 20), ex('b', 30)], restSec: 10 });
    expect(buildTimeline(w).map((p) => `${p.type}:${p.durationSec}`)).toEqual(['work:20', 'rest:10', 'work:30']);
  });

  it('vervangt de gewone rust door een rondepauze tussen rondes', () => {
    const w = workout({ exercises: [ex('a', 20), ex('b', 30)], rounds: 2, restSec: 10, roundRestSec: 60 });
    expect(buildTimeline(w).map((p) => `${p.type}:${p.durationSec}`)).toEqual([
      'work:20',
      'rest:10',
      'work:30',
      'roundRest:60',
      'work:20',
      'rest:10',
      'work:30',
    ]);
  });

  it('gebruikt een eigen rusttijd per oefening', () => {
    const w = workout({ exercises: [ex('a', 20, 5), ex('b', 30), ex('c', 10)], restSec: 15 });
    expect(buildTimeline(w).filter((p) => p.type === 'rest').map((p) => p.durationSec)).toEqual([5, 15]);
  });

  it('slaat rust van 0 seconden over', () => {
    const w = workout({ exercises: [ex('a', 20), ex('b', 30)], rounds: 2, restSec: 0, roundRestSec: 0 });
    expect(buildTimeline(w).every((p) => p.type === 'work')).toBe(true);
  });

  it('begint met aftellen als dat gevraagd wordt, met de eerste oefening in beeld', () => {
    const w = workout({ exercises: [ex('a', 20), ex('b', 30)] });
    const [first] = buildTimeline(w, 10);
    expect(first).toMatchObject({ type: 'countdown', durationSec: 10, exerciseIndex: 0 });
    expect(first?.exercise.id).toBe('a');
  });

  it('laat bij rust de vólgende oefening en ronde zien', () => {
    const w = workout({ exercises: [ex('a', 20), ex('b', 30)], rounds: 2 });
    const phases = buildTimeline(w);
    expect(phases[1]).toMatchObject({ type: 'rest', exerciseIndex: 1, round: 0 });
    expect(phases[3]).toMatchObject({ type: 'roundRest', exerciseIndex: 0, round: 1 });
  });
});

describe('totale duur', () => {
  it('volgt de formule uit het plan', () => {
    // 2 rondes × (20+30) + 2 × 10 rust + 1 × 60 rondepauze = 100 + 20 + 60
    const w = workout({ exercises: [ex('a', 20), ex('b', 30)], rounds: 2, restSec: 10, roundRestSec: 60 });
    expect(totalDurationSec(w)).toBe(180);
    expect(totalWorkSec(w)).toBe(100);
  });

  it('klopt voor de voorbeeldworkouts', () => {
    const [ochtend, buik] = createSampleWorkouts();
    // 2 × 195 werk + 2 × 5 × 15 rust + 45 rondepauze
    expect(totalDurationSec(ochtend!)).toBe(585);
    // 3 × 215 werk + 3 × (5 × 20 + 5) rust + 2 × 60 rondepauze
    expect(totalDurationSec(buik!)).toBe(1080);
  });
});

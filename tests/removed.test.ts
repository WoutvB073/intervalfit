import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { EXERCISES, getExercise, REMOVED_EXERCISES, toKnownExercise, withKnownExercises } from '../src/data/exercises';
import { ANIMATIONS } from '../src/figure/animations';
import { decodeWorkout } from '../src/storage/share';
import type { Workout } from '../src/model/types';

describe('verwijderde oefeningen (fire hydrants)', () => {
  it('staan niet meer in de bibliotheek en hebben geen animatie', () => {
    for (const id of Object.keys(REMOVED_EXERCISES)) {
      expect(getExercise(id), id).toBeUndefined();
      expect(EXERCISES.some((e) => e.id === id), id).toBe(false);
      expect(ANIMATIONS[id], id).toBeUndefined();
    }
  });

  it('een bestaande workout blijft werken: de oefening wordt een eigen oefening met dezelfde naam en tijden', () => {
    const w: Workout = {
      id: 'w', name: 'Billen', rounds: 2, restSec: 15, roundRestSec: 30, createdAt: 0, updatedAt: 0,
      exercises: [
        { id: 'a', libraryId: 'squats', name: 'Squats', workSec: 40 },
        { id: 'b', libraryId: 'fire-hydrants', name: 'Fire hydrants', workSec: 35, restSec: 10 },
      ],
    };
    const fixed = withKnownExercises(w);
    expect(fixed.exercises[0]).toEqual(w.exercises[0]);
    expect(fixed.exercises[1]).toEqual({ id: 'b', name: 'Fire hydrants', workSec: 35, restSec: 10 });
    // niets te doen → dezelfde workout terug
    expect(withKnownExercises(fixed)).toBe(fixed);
    // zonder naam: naam uit de lijst van verwijderde oefeningen
    expect(toKnownExercise({ id: 'c', libraryId: 'fire-hydrants', name: '', workSec: 20 }).name).toBe('Fire hydrants');
  });

  it('een oude gedeelde link met fire hydrants (zonder eigen naam) blijft werken', () => {
    const code = compressToEncodedURIComponent(
      JSON.stringify({ v: 1, n: 'Oude link', r: 2, s: 15, q: 45, e: [['squats', '', 40], ['fire-hydrants', '', 30, 5]] }),
    );
    const w = decodeWorkout(code)!;
    expect(w.exercises.map((e) => [e.libraryId, e.name, e.workSec, e.restSec])).toEqual([
      ['squats', 'Squats', 40, undefined],
      [undefined, 'Fire hydrants', 30, 5],
    ]);
  });
});

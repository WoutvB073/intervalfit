import type { Workout } from '../model/types';

/**
 * Korte test-workout voor ontwikkelaars (alleen zichtbaar in de ontwikkelaarsmodus):
 * 3 oefeningen van 10 s, 5 s rust, 2 rondes met 10 s rondepauze.
 * Bevat bewust een links/rechts-oefening om de kant in beeld en spraak te testen.
 */
export const DEV_WORKOUT_ID = 'test';

export function createDevWorkout(): Workout {
  const now = Date.now();
  return {
    id: DEV_WORKOUT_ID,
    name: 'Test-workout',
    rounds: 2,
    restSec: 5,
    roundRestSec: 10,
    exercises: [
      { id: 't1', libraryId: 'jumping-jacks', name: 'Jumping jacks', workSec: 10 },
      { id: 't2', libraryId: 'squats', name: 'Squats', workSec: 10 },
      { id: 't3', libraryId: 'side-leg-raises-left', name: 'Side leg raises links', workSec: 10 },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

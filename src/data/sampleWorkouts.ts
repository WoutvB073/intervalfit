import type { Workout, WorkoutExercise } from '../model/types';
import { getExercise } from './exercises';
import { newId } from '../model/id';

function ex(libraryId: string, workSec: number, restSec?: number): WorkoutExercise {
  const lib = getExercise(libraryId);
  if (!lib) throw new Error(`Onbekende oefening: ${libraryId}`);
  return { id: newId(), libraryId, name: lib.name, workSec, ...(restSec !== undefined ? { restSec } : {}) };
}

/** De twee voorbeeldworkouts die bij de eerste keer openen klaarstaan. */
export function createSampleWorkouts(now = Date.now()): Workout[] {
  return [
    {
      id: newId(),
      name: 'Snelle ochtendstart',
      rounds: 2,
      restSec: 15,
      roundRestSec: 45,
      exercises: [
        ex('jumping-jacks', 30),
        ex('squats', 45),
        ex('knee-push-ups', 20),
        ex('plank', 30),
        ex('glute-bridge', 40),
        ex('high-knees', 30),
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      name: 'Buik & billen',
      rounds: 3,
      restSec: 20,
      roundRestSec: 60,
      exercises: [
        ex('sumo-squats', 40),
        ex('glute-bridge', 45),
        ex('donkey-kicks', 30),
        ex('crunches', 30),
        ex('russian-twists', 30),
        ex('side-plank-left', 20, 5),
        ex('side-plank-right', 20),
      ],
      createdAt: now - 1,
      updatedAt: now - 1,
    },
  ];
}

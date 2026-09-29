import { getExercise } from '../data/exercises';
import type { WorkoutExercise } from '../model/types';

/**
 * Klein plaatje van een oefening. Voorlopig een gekleurde tegel met de eerste letter;
 * in stap 2 komt hier het geanimeerde figuurtje (of de eigen foto).
 */
export function ExerciseThumb({ exercise, size = 40 }: { exercise: WorkoutExercise; size?: number }) {
  const lib = getExercise(exercise.libraryId);
  const category = lib?.category ?? 'eigen';
  const letter = exercise.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className={`thumb thumb--${category}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      title={exercise.name}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

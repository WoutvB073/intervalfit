import type { Workout, WorkoutExercise } from './types';

export type PhaseType = 'countdown' | 'work' | 'rest' | 'roundRest';

export type Phase = {
  type: PhaseType;
  durationSec: number;
  /** Ronde (0-gebaseerd) waar deze fase bij hoort; bij rust: de ronde van de vólgende oefening. */
  round: number;
  /** Index van de oefening die bezig is (werk) of die hierna komt (aftellen/rust). */
  exerciseIndex: number;
  exercise: WorkoutExercise;
};

/** Rust ná oefening `index`, rekening houdend met een eigen rusttijd. */
export function restAfter(workout: Workout, index: number): number {
  return workout.exercises[index]?.restSec ?? workout.restSec;
}

/**
 * Zet een workout om in een lijst fases:
 * [aftellen] → werk₁ → rust → … → werkₙ → rondepauze → werk₁ → … → werkₙ.
 * Fases van 0 seconden worden overgeslagen.
 */
export function buildTimeline(workout: Workout, countdownSec = 0): Phase[] {
  const phases: Phase[] = [];
  const list = workout.exercises;
  if (list.length === 0 || workout.rounds < 1) return phases;

  if (countdownSec > 0) {
    phases.push({ type: 'countdown', durationSec: countdownSec, round: 0, exerciseIndex: 0, exercise: list[0]! });
  }

  for (let round = 0; round < workout.rounds; round++) {
    list.forEach((exercise, i) => {
      if (exercise.workSec > 0) {
        phases.push({ type: 'work', durationSec: exercise.workSec, round, exerciseIndex: i, exercise });
      }
      const isLastInRound = i === list.length - 1;
      const isLastRound = round === workout.rounds - 1;
      if (!isLastInRound) {
        const rest = restAfter(workout, i);
        if (rest > 0) {
          phases.push({ type: 'rest', durationSec: rest, round, exerciseIndex: i + 1, exercise: list[i + 1]! });
        }
      } else if (!isLastRound && workout.roundRestSec > 0) {
        phases.push({
          type: 'roundRest',
          durationSec: workout.roundRestSec,
          round: round + 1,
          exerciseIndex: 0,
          exercise: list[0]!,
        });
      }
    });
  }
  return phases;
}

/** Totale duur in seconden (zonder aftellen). */
export function totalDurationSec(workout: Workout): number {
  return buildTimeline(workout).reduce((sum, p) => sum + p.durationSec, 0);
}

/** Totale werktijd in seconden. */
export function totalWorkSec(workout: Workout): number {
  return workout.exercises.reduce((sum, e) => sum + e.workSec, 0) * workout.rounds;
}

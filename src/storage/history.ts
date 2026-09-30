import type { HistoryEntry, Workout } from '../model/types';
import type { WorkStat } from '../engine/session';
import { estimateKcal } from '../model/calories';
import { countsForHistory } from '../model/stats';
import { composeSummary } from '../data/messages';
import { newId } from '../model/id';
import { totalDurationSec } from '../model/timeline';
import { appStateStore, historyStore, settingsStore } from './data';

export type FinishedWorkout = {
  workout: Workout;
  /** Actieve tijd (werk + rust, zonder aftellen en pauzes). */
  activeSec: number;
  workStats: WorkStat[];
  completed: boolean;
  /** Rondes waarin getraind is. */
  roundsDone: number;
  date?: Date;
};

/** Maakt een geschiedenisregel, inclusief kop en boodschappen voor het overzicht. */
export function buildEntry(f: FinishedWorkout, previous: HistoryEntry[], opts: { weightKg?: number; name?: string } = {}): HistoryEntry {
  const workSec = Math.round(f.workStats.reduce((s, w) => s + w.workSec, 0));
  const totalSec = Math.round(Math.max(f.activeSec, workSec));
  const perExercise = f.workStats.map((w) => ({ key: w.key, name: w.name, workSec: Math.round(w.workSec) }));
  const entry: HistoryEntry = {
    id: newId(),
    date: (f.date ?? new Date()).toISOString(),
    workoutId: f.workout.id,
    workoutName: f.workout.name,
    totalSec,
    workSec,
    kcal: estimateKcal(perExercise, totalSec - workSec, opts.weightKg),
    rounds: f.completed ? f.workout.rounds : f.roundsDone,
    roundsPlanned: f.workout.rounds,
    exercisesDone: perExercise.filter((x) => x.workSec > 0).length,
    exercisesPlanned: new Set(f.workout.exercises.map((e) => e.libraryId ?? `eigen:${e.name}`)).size,
    completed: f.completed,
    perExercise,
  };
  const { headline, messages } = composeSummary({ entry, previous, name: opts.name });
  return { ...entry, headline, messages };
}

/**
 * Bewaart een afgeronde (of gestopte) workout. Telt hij niet mee (zie countsForHistory), dan `null`.
 */
export function recordWorkout(f: FinishedWorkout): HistoryEntry | null {
  if (!countsForHistory(f.completed, f.activeSec, totalDurationSec(f.workout))) return null;
  const settings = settingsStore.get();
  const previous = historyStore.get();
  const entry = buildEntry(f, previous, { weightKg: settings.weightKg, name: settings.name });
  historyStore.set((list) => [...list, entry].sort((a, b) => a.date.localeCompare(b.date)));
  // Na de eerste workout is het welkomstkaartje niet meer nodig.
  if (!appStateStore.get().welcomeDismissed) appStateStore.set((s) => ({ ...s, welcomeDismissed: true }));
  freshId = entry.id;
  return entry;
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return historyStore.get().find((e) => e.id === id);
}

/** Id van de workout die net is afgerond: alleen dan confetti en "Nog een keer". */
let freshId: string | null = null;
export function isFresh(id: string): boolean {
  return freshId === id;
}
export function clearFresh(): void {
  freshId = null;
}
export function markFresh(id: string): void {
  freshId = id;
}

import type { HistoryEntry, Settings, Workout } from '../model/types';
import { createStore, readJSON, writeJSON } from './store';
import { createSampleWorkouts } from '../data/sampleWorkouts';
import { newId } from '../model/id';
import { withKnownExercises } from '../data/exercises';

/** Huidige versie van de opslagvorm. Verhoog bij een wijziging en voeg een stap toe in `migrate`. */
export const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  sound: { beeps: true, whistle: true, voice: true, vibrate: true, alwaysAudible: false, volume: 0.8 },
  countdown: { enabled: true, seconds: 10 },
  theme: 'fris',
};

/** Vult ontbrekende (nieuwe) instellingen aan met de standaardwaarden. */
function loadSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    sound: { ...DEFAULT_SETTINGS.sound, ...(s.sound ?? {}) },
    countdown: { ...DEFAULT_SETTINGS.countdown, ...(s.countdown ?? {}) },
  };
}

function loadWorkouts(raw: unknown): Workout[] {
  // Oefeningen die niet meer in de bibliotheek staan worden eigen oefeningen (zie REMOVED_EXERCISES).
  return Array.isArray(raw) ? (raw as Workout[]).filter((w) => w && typeof w.id === 'string').map(withKnownExercises) : [];
}

export const workoutsStore = createStore<Workout[]>('workouts', () => [], loadWorkouts);
export const settingsStore = createStore<Settings>('settings', () => DEFAULT_SETTINGS, loadSettings);
export const historyStore = createStore<HistoryEntry[]>('history', () => [], (r) => (Array.isArray(r) ? r : []));

export type AppState = {
  welcomeDismissed: boolean;
  /** Tips bij de eerste workout al getoond? */
  playerTipsSeen?: boolean;
};
export const appStateStore = createStore<AppState>('app', () => ({ welcomeDismissed: false }));

/**
 * Wordt bij het opstarten aangeroepen. Eerste keer: voorbeeldworkouts klaarzetten.
 * Latere versies: data stap voor stap omzetten, zodat bestaande workouts nooit kapotgaan.
 */
export function migrate(): void {
  const version = readJSON<number>('schema');
  if (version === undefined) {
    if (readJSON('workouts') === undefined) workoutsStore.set(createSampleWorkouts());
    writeJSON('schema', SCHEMA_VERSION);
    return;
  }
  // v2: fire hydrants uit de bibliotheek → in bestaande workouts een eigen oefening (zelfde naam en tijden).
  if (version < 2) workoutsStore.set((list) => list.map(withKnownExercises));
  if (version < SCHEMA_VERSION) writeJSON('schema', SCHEMA_VERSION);
}

// ── Acties op workouts ───────────────────────────────────────────

export function getWorkout(id: string): Workout | undefined {
  return workoutsStore.get().find((w) => w.id === id);
}

export function saveWorkout(workout: Workout): void {
  const updated = { ...workout, updatedAt: Date.now() };
  workoutsStore.set((list) =>
    list.some((w) => w.id === workout.id) ? list.map((w) => (w.id === workout.id ? updated : w)) : [updated, ...list],
  );
}

export function deleteWorkout(id: string): void {
  workoutsStore.set((list) => list.filter((w) => w.id !== id));
}

/** Maakt een kopie direct ná het origineel; foto's worden gedeeld (zelfde verwijzing). */
export function duplicateWorkout(id: string): Workout | undefined {
  const original = getWorkout(id);
  if (!original) return undefined;
  const now = Date.now();
  const copy: Workout = {
    ...original,
    id: newId(),
    name: `${original.name} (kopie)`,
    exercises: original.exercises.map((e) => ({ ...e, id: newId() })),
    createdAt: now,
    updatedAt: now,
  };
  workoutsStore.set((list) => {
    const i = list.findIndex((w) => w.id === id);
    const next = [...list];
    next.splice(i + 1, 0, copy);
    return next;
  });
  return copy;
}

/** Vraagt de browser de gegevens niet zomaar op te ruimen. */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* niet ondersteund */
  }
}

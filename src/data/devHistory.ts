import type { HistoryEntry, Workout } from '../model/types';
import { historyStore, settingsStore, workoutsStore } from '../storage/data';
import { readJSON, writeJSON } from '../storage/store';
import { buildEntry, recordWorkout, type FinishedWorkout } from '../storage/history';
import { totalDurationSec } from '../model/timeline';
import { seededRandom } from './messages';
import { createDevWorkout } from './devWorkout';

/**
 * Nep-geschiedenis voor de ontwikkelaarsmodus, om mijlpalen snel te testen zonder ze echt te doen.
 * De echte geschiedenis wordt bij de eerste keer bewaard en kan worden teruggezet.
 */

const BACKUP_KEY = 'historyBackup';

export function hasRealHistoryBackup(): boolean {
  return readJSON(BACKUP_KEY) !== undefined;
}

export function restoreRealHistory(): void {
  const backup = readJSON<HistoryEntry[]>(BACKUP_KEY);
  if (!backup) return;
  historyStore.set(backup);
  try {
    localStorage.removeItem(`intervalfit.${BACKUP_KEY}`);
  } catch {
    /* niet erg */
  }
}

function backupOnce(): void {
  if (!hasRealHistoryBackup()) writeJSON(BACKUP_KEY, historyStore.get());
}

function workouts(): Workout[] {
  const list = workoutsStore.get().filter((w) => w.exercises.length > 0);
  return list.length ? list : [createDevWorkout()];
}

/** Een workout die `activeSec` lang gedaan is, met werktijd naar verhouding over de oefeningen. */
function fakeFinished(workout: Workout, activeSec: number, completed: boolean, date: Date): FinishedWorkout {
  const perRound = workout.exercises.reduce((s, e) => s + e.workSec, 0) || 1;
  const workShare = Math.min(0.85, (perRound * workout.rounds) / (totalDurationSec(workout) || 1));
  const work = activeSec * workShare;
  const stats = new Map<string, { key: string; name: string; workSec: number }>();
  for (const e of workout.exercises) {
    const key = e.libraryId ?? `eigen:${e.name}`;
    const cur = stats.get(key) ?? { key, name: e.name, workSec: 0 };
    cur.workSec += (work * e.workSec) / perRound;
    stats.set(key, cur);
  }
  const roundsDone = completed ? workout.rounds : Math.max(1, Math.ceil((workout.rounds * activeSec) / (totalDurationSec(workout) || 1)));
  return { workout, activeSec, completed, roundsDone: Math.min(workout.rounds, roundsDone), workStats: [...stats.values()], date };
}

/** [dagen geleden, uur, minuten getraind, afgerond?] */
type Day = [number, number, number, boolean?];

function build(days: Day[]): HistoryEntry[] {
  const list = workouts();
  const settings = settingsStore.get();
  const now = new Date();
  let history: HistoryEntry[] = [];
  days
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .forEach(([ago, hour, min, completed = true], i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago, hour, (i * 17) % 60);
      const w = list[i % list.length]!;
      const entry = buildEntry(fakeFinished(w, min * 60, completed, date), history, { weightKg: settings.weightKg, name: settings.name });
      history = [...history, entry];
    });
  return history;
}

export type Scenario = { id: string; label: string; hint: string; days: () => Day[] };

export const SCENARIOS: Scenario[] = [
  { id: 'leeg', label: 'Leeg', hint: 'Volgende workout = je eerste', days: () => [] },
  { id: 'vier', label: '4 workouts', hint: 'Volgende = 5e (met "Lange workout" ook een record)', days: () => [[9, 10, 12], [6, 19, 14], [4, 9, 11], [2, 20, 13]] },
  {
    id: 'negen',
    label: '9 workouts',
    hint: 'Volgende = 10e',
    days: () => [20, 18, 16, 14, 12, 10, 8, 6, 4].map((d, i): Day => [d, 9 + (i % 3) * 5, 12 + (i % 4) * 2]),
  },
  { id: 'reeks2', label: '2 dagen op rij', hint: 'Gisteren en eergisteren; volgende = 3 dagen op rij', days: () => [[2, 10, 14], [1, 18, 15]] },
  {
    id: 'reeks6',
    label: '6 dagen op rij',
    hint: 'Volgende = een hele week op rij',
    days: () => [6, 5, 4, 3, 2, 1].map((d, i): Day => [d, 8 + i * 2, 12 + i]),
  },
  { id: 'pauze', label: 'Pauze van 12 dagen', hint: 'Volgende = "welkom terug"', days: () => [[30, 10, 15], [22, 19, 16], [12, 9, 15]] },
  {
    id: 'uren',
    label: '49 workouts, bijna 10 uur',
    hint: 'Volgende = 50e workout én 10 uur totaal',
    days: () => Array.from({ length: 49 }, (_, i): Day => [100 - i * 2, 8 + (i % 5) * 3, 12]),
  },
  {
    id: 'gevarieerd',
    label: '2 maanden gevarieerd',
    hint: 'Voor het bekijken van Mijn voortgang',
    days: () => {
      const r = seededRandom('gevarieerd');
      const out: Day[] = [];
      for (let d = 60; d >= 1; d--) {
        if (r() < 0.55) out.push([d, 7 + Math.floor(r() * 15), 8 + Math.floor(r() * 25), r() > 0.12]);
      }
      return out;
    },
  },
];

export function loadScenario(s: Scenario): void {
  backupOnce();
  historyStore.set(build(s.days()));
}

export type FakeFinish = { id: string; label: string; hint: string; minutes: number; completed: boolean; hour?: number };

export const FAKE_FINISHES: FakeFinish[] = [
  { id: 'normaal', label: 'Workout afgerond (15 min)', hint: 'Nu, eerste workout uit je lijst', minutes: 15, completed: true },
  { id: 'lang', label: 'Lange workout (45 min)', hint: 'Voor "langste workout ooit"', minutes: 45, completed: true },
  { id: 'gestopt', label: 'Gestopt na 6 minuten', hint: 'Telt mee, met aangepaste boodschap', minutes: 6, completed: false },
  { id: 'kort', label: 'Gestopt na 40 seconden', hint: 'Telt niet mee (onder 1 minuut)', minutes: 40 / 60, completed: false },
  { id: 'vroeg', label: 'Vroeg in de ochtend (7:05)', hint: 'Vandaag om 7:05, voor "vroege vogel"', minutes: 15, completed: true, hour: 7 },
];

/** Doet alsof er nu een workout is afgerond; geeft de nieuwe regel terug (of null onder 1 minuut). */
export function fakeFinish(f: FakeFinish): HistoryEntry | null {
  backupOnce();
  const now = new Date();
  const date = f.hour === undefined ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate(), f.hour, 5);
  return recordWorkout(fakeFinished(workouts()[0]!, f.minutes * 60, f.completed, date));
}

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { Workout, WorkoutExercise } from '../model/types';
import { getExercise, REMOVED_EXERCISES } from '../data/exercises';
import { newId } from '../model/id';

/**
 * Een workout in een link: compacte JSON met korte sleutels, gecomprimeerd met lz-string.
 *   { v: 1, n: naam, r: rondes, s: rust, q: rondepauze, e: [[bibliotheek-id, eigen naam, werktijd, eigen rust?], …] }
 * Eigen foto's gaan niet mee (te groot).
 */
type Compact = {
  v: 1;
  n: string;
  r: number;
  s: number;
  q: number;
  e: [string, string, number, number?][];
};

const LIMITS = { name: 60, exercises: 100, workSec: 3600, restSec: 3600, rounds: 50 };

export function encodeWorkout(w: Workout): string {
  const compact: Compact = {
    v: 1,
    n: w.name,
    r: w.rounds,
    s: w.restSec,
    q: w.roundRestSec,
    e: w.exercises.map((e) => {
      const lib = getExercise(e.libraryId);
      const row: [string, string, number, number?] = [
        lib ? lib.id : '',
        lib && lib.name === e.name ? '' : e.name,
        e.workSec,
      ];
      if (e.restSec !== undefined) row.push(e.restSec);
      return row;
    }),
  };
  // lz-string gebruikt ook + en $; die kunnen in chat-apps de link breken → vervangen door ~ en _.
  return compressToEncodedURIComponent(JSON.stringify(compact)).replace(/\+/g, '~').replace(/\$/g, '_');
}

/** Terug naar de lz-string-tekens (ook oude links met + en $ blijven werken). */
const toLz = (code: string) => code.replace(/~/g, '+').replace(/_/g, '$');

const int = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Zet een code terug om naar een workout (met nieuwe id's). Geeft null bij een kapotte code. */
export function decodeWorkout(code: string, now = Date.now()): Workout | null {
  try {
    const json = decompressFromEncodedURIComponent(toLz(code.trim()));
    if (!json) return null;
    const c = JSON.parse(json) as Partial<Compact>;
    if (c.v !== 1 || !Array.isArray(c.e)) return null;
    const exercises: WorkoutExercise[] = [];
    for (const row of c.e.slice(0, LIMITS.exercises)) {
      if (!Array.isArray(row)) continue;
      const lib = getExercise(typeof row[0] === 'string' ? row[0] : undefined);
      // Oude link met een oefening die uit de bibliotheek is gehaald: wordt een eigen oefening met die naam.
      const removed = typeof row[0] === 'string' ? REMOVED_EXERCISES[row[0]] : undefined;
      const name = text(row[1], LIMITS.name) || lib?.name || removed || '';
      if (!name) continue;
      const ex: WorkoutExercise = {
        id: newId(),
        name,
        workSec: int(row[2], 1, LIMITS.workSec, lib?.defaultWorkSec ?? 30),
      };
      if (lib) ex.libraryId = lib.id;
      if (row[3] !== undefined && row[3] !== null) ex.restSec = int(row[3], 0, LIMITS.restSec, 0);
      exercises.push(ex);
    }
    if (exercises.length === 0) return null;
    return {
      id: newId(),
      name: text(c.n, LIMITS.name) || 'Gedeelde workout',
      exercises,
      rounds: int(c.r, 1, LIMITS.rounds, 1),
      restSec: int(c.s, 0, LIMITS.restSec, 15),
      roundRestSec: int(c.q, 0, LIMITS.restSec, 60),
      createdAt: now,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

/** De volledige deellink voor een workout. */
export function shareUrl(w: Workout, base = `${location.origin}${import.meta.env.BASE_URL}`): string {
  return `${base}#/deel/${encodeWorkout(w)}`;
}

/** Haalt de code uit geplakte tekst: een hele link, een WhatsApp-bericht met link, of alleen de code. */
export function extractShareCode(input: string): string | null {
  let text = input.trim();
  // Sommige apps coderen tekens in links (bv. %24 voor $).
  try {
    text = decodeURIComponent(text);
  } catch {
    /* geen geldige codering: gewoon de tekst gebruiken */
  }
  const fromLink = /#\/deel\/([A-Za-z0-9+\-$_~]+)/.exec(text);
  if (fromLink) return fromLink[1]!;
  // Losse code: het langste "woord" met alleen codetekens.
  const words = text.split(/[\s"'“”‘’<>()[\]{},;:!?]+/).filter((w) => /^[A-Za-z0-9+\-$_~]{24,}$/.test(w));
  words.sort((a, b) => b.length - a.length);
  return words[0] ?? null;
}

/** Vingerafdruk van de inhoud (zonder id's en datums), om dubbele workouts te herkennen. */
export function workoutSignature(w: Pick<Workout, 'name' | 'rounds' | 'restSec' | 'roundRestSec' | 'exercises'>): string {
  return JSON.stringify([
    w.name.trim().toLowerCase(),
    w.rounds,
    w.restSec,
    w.roundRestSec,
    w.exercises.map((e) => [e.libraryId ?? '', e.name.trim().toLowerCase(), e.workSec, e.restSec ?? null]),
  ]);
}

/** Het vriendelijke bericht dat bij "Delen" wordt verstuurd. */
export function shareMessage(w: Workout, url: string, totalLabel: string): string {
  const n = w.exercises.length;
  return `Ik heb een workout voor je: ${w.name} (${n} ${n === 1 ? 'oefening' : 'oefeningen'}, ${totalLabel}). Open de link om hem in IntervalFit te zetten: ${url}`;
}
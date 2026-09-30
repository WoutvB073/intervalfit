import type { HistoryEntry } from './types';

/**
 * Rekenwerk op de geschiedenis: reeks (dagen op rij), weekoverzicht en totalen.
 * Alles in de lokale tijd van het toestel; een week begint op maandag.
 */

const DAY_MS = 86_400_000;

/** "2026-09-30" in lokale tijd. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Middernacht (lokaal) van dezelfde dag. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Aantal kalenderdagen van `a` naar `b` (zomer-/wintertijd-veilig). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** Maandag (middernacht) van de week waarin `d` valt. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // ma = 0 … zo = 6
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - dow);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Alle dagen met minstens één workout. */
export function trainedDays(entries: HistoryEntry[]): Set<string> {
  return new Set(entries.map((e) => dayKey(new Date(e.date))));
}

/**
 * Huidige reeks: aantal dagen op rij met een workout, eindigend vandaag
 * (of gisteren, als er vandaag nog niet getraind is — dan loopt de reeks nog).
 */
export function currentStreak(entries: HistoryEntry[], now = new Date()): number {
  const days = trainedDays(entries);
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Langste reeks ooit. */
export function longestStreak(entries: HistoryEntry[]): number {
  const keys = [...trainedDays(entries)].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const [y, m, d] = k.split('-').map(Number) as [number, number, number];
    const day = new Date(y, m - 1, d);
    run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Deze week (ma t/m zo): per dag of er getraind is. */
export function weekDays(entries: HistoryEntry[], now = new Date()): { key: string; label: string; trained: boolean; today: boolean; future: boolean }[] {
  const days = trainedDays(entries);
  const monday = startOfWeek(now);
  const todayKey = dayKey(now);
  const labels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  return labels.map((label, i) => {
    const d = addDays(monday, i);
    const key = dayKey(d);
    return { key, label, trained: days.has(key), today: key === todayKey, future: d.getTime() > now.getTime() && key !== todayKey };
  });
}

/** Workouts in dezelfde week als `now`. */
export function entriesThisWeek(entries: HistoryEntry[], now = new Date()): HistoryEntry[] {
  const from = startOfWeek(now).getTime();
  const to = addDays(startOfWeek(now), 7).getTime();
  return entries.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= from && t < to;
  });
}

export type Totals = { count: number; totalSec: number; workSec: number; kcal: number };

export function totals(entries: HistoryEntry[]): Totals {
  return entries.reduce<Totals>(
    (t, e) => ({ count: t.count + 1, totalSec: t.totalSec + e.totalSec, workSec: t.workSec + e.workSec, kcal: t.kcal + e.kcal }),
    { count: 0, totalSec: 0, workSec: 0, kcal: 0 },
  );
}

/** Oefening waar in totaal de meeste tijd in zit. */
export function favoriteExercise(entries: HistoryEntry[]): { key: string; name: string; workSec: number } | undefined {
  const map = new Map<string, { key: string; name: string; workSec: number }>();
  for (const e of entries) {
    for (const x of e.perExercise) {
      const cur = map.get(x.key) ?? { key: x.key, name: x.name, workSec: 0 };
      cur.workSec += x.workSec;
      map.set(x.key, cur);
    }
  }
  let best: { key: string; name: string; workSec: number } | undefined;
  for (const v of map.values()) if (!best || v.workSec > best.workSec) best = v;
  return best;
}

/**
 * Telt een workout mee? Vanaf 1 minuut altijd (ook gestopt). Korter alleen als hij is afgerond
 * en minstens de helft van de geplande tijd echt gedaan is (dus niet: alles doorgespoeld).
 */
export function countsForHistory(completed: boolean, activeSec: number, plannedSec = 0): boolean {
  return activeSec >= 60 || (completed && activeSec >= plannedSec / 2);
}

import { describe, expect, it } from 'vitest';
import type { HistoryEntry, Workout } from '../src/model/types';
import { currentStreak, longestStreak, weekDays, totals, countsForHistory } from '../src/model/stats';
import { estimateKcal } from '../src/model/calories';
import { composeSummary, durationText } from '../src/data/messages';
import { buildEntry } from '../src/storage/history';

const workout: Workout = {
  id: 'w1',
  name: 'Ochtendworkout',
  rounds: 3,
  restSec: 15,
  roundRestSec: 60,
  exercises: [
    { id: 'a', libraryId: 'squats', name: 'Squats', workSec: 40 },
    { id: 'b', libraryId: 'plank', name: 'Plank', workSec: 30 },
    { id: 'c', libraryId: 'jumping-jacks', name: 'Jumping jacks', workSec: 30 },
  ],
  createdAt: 0,
  updatedAt: 0,
};

/** Datum op `daysAgo` dagen vóór woensdag 30-09-2026, om `hour` uur. */
function at(daysAgo: number, hour = 10): Date {
  return new Date(2026, 8, 30 - daysAgo, hour, 0, 0);
}

let seq = 0;
function entry(date: Date, over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: `e${seq++}`,
    date: date.toISOString(),
    workoutId: 'w1',
    workoutName: 'Ochtendworkout',
    totalSec: 900,
    workSec: 600,
    kcal: 60,
    rounds: 3,
    exercisesDone: 3,
    completed: true,
    perExercise: [
      { key: 'squats', name: 'Squats', workSec: 240 },
      { key: 'plank', name: 'Plank', workSec: 180 },
      { key: 'jumping-jacks', name: 'Jumping jacks', workSec: 180 },
    ],
    ...over,
  };
}

/** Een nieuwe workout "nu" (op dag `daysAgo`) afronden met de gegeven geschiedenis. */
function finish(previous: HistoryEntry[], date: Date, opts: { activeSec?: number; completed?: boolean; name?: string } = {}) {
  const activeSec = opts.activeSec ?? 900;
  const work = activeSec * 0.66;
  return buildEntry(
    {
      workout,
      activeSec,
      completed: opts.completed ?? true,
      roundsDone: 2,
      date,
      workStats: [
        { key: 'squats', name: 'Squats', workSec: work * 0.4 },
        { key: 'plank', name: 'Plank', workSec: work * 0.3 },
        { key: 'jumping-jacks', name: 'Jumping jacks', workSec: work * 0.3 },
      ],
    },
    previous,
    { name: opts.name },
  );
}

describe('reeks en totalen', () => {
  it('telt dagen op rij, ook als er vandaag nog niet getraind is', () => {
    const h = [entry(at(3)), entry(at(2)), entry(at(1)), entry(at(1, 18))];
    expect(currentStreak(h, at(0))).toBe(3);
    expect(currentStreak([...h, entry(at(0))], at(0))).toBe(4);
    expect(currentStreak([entry(at(2))], at(0))).toBe(0);
    expect(currentStreak([], at(0))).toBe(0);
  });

  it('langste reeks ooit', () => {
    const h = [entry(at(20)), entry(at(19)), entry(at(18)), entry(at(10)), entry(at(1)), entry(at(0))];
    expect(longestStreak(h)).toBe(3);
  });

  it('week loopt van maandag t/m zondag', () => {
    // 30-09-2026 is een woensdag
    const w = weekDays([entry(at(2)), entry(at(0)), entry(at(3))], at(0));
    expect(w.map((d) => d.label)).toEqual(['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']);
    expect(w.map((d) => d.trained)).toEqual([true, false, true, false, false, false, false]);
    expect(w[2]!.today).toBe(true);
    expect(w[3]!.future).toBe(true);
  });

  it('totalen', () => {
    expect(totals([entry(at(1)), entry(at(0))])).toEqual({ count: 2, totalSec: 1800, workSec: 1200, kcal: 120 });
  });

  it('gestopt telt pas mee vanaf 1 minuut', () => {
    expect(countsForHistory(false, 59)).toBe(false);
    expect(countsForHistory(false, 60)).toBe(true);
    expect(countsForHistory(true, 20)).toBe(true);
    // afgerond maar alles doorgespoeld: telt niet mee; korte workout echt gedaan: wel
    expect(countsForHistory(true, 6, 420)).toBe(false);
    expect(countsForHistory(true, 40, 70)).toBe(true);
  });
});

describe('calorieën', () => {
  it('MET × kg × uren werk + 2,0 × kg × uren rust', () => {
    // squats MET 5.0: 5 × 70 × 0,1 u = 35; rust 2 × 70 × 0,05 u = 7
    expect(estimateKcal([{ key: 'squats', workSec: 360 }], 180, 70)).toBe(42);
    // eigen oefening: MET 5
    expect(estimateKcal([{ key: 'eigen:Touwtje', workSec: 360 }], 0, 70)).toBe(35);
    // standaard 70 kg
    expect(estimateKcal([{ key: 'squats', workSec: 360 }], 0)).toBe(35);
  });
});

describe('boodschappen', () => {
  it('eerste workout ooit', () => {
    const e = finish([], at(0));
    expect(e.headline).toBe('Je eerste workout!');
    expect(e.messages![0]!.kind).toBe('first');
    expect(e.messages!.length).toBeLessThanOrEqual(2);
  });

  it('5e en 10e workout zijn mijlpalen, met het getal op de medaille', () => {
    const four = [9, 7, 5, 3].map((d) => entry(at(d)));
    const e5 = finish(four, at(0));
    expect(e5.messages![0]!.kind).toBe('count');
    expect(e5.messages![0]!.badge).toBe(5);
    const nine = [20, 18, 16, 14, 12, 10, 8, 6, 4].map((d) => entry(at(d)));
    const e10 = finish(nine, at(0));
    expect(e10.messages![0]!.badge).toBe(10);
  });

  it('reeks van 3 dagen', () => {
    const e = finish([entry(at(2)), entry(at(1))], at(0));
    expect(e.messages![0]!.kind).toBe('streak');
    expect(e.messages![0]!.badge).toBe(3);
  });

  it('langste workout ooit', () => {
    const prev = [12, 9, 6, 3].map((d) => entry(at(d), { totalSec: 300 }));
    const e = finish(prev.slice(0, 3), at(0), { activeSec: 1800 });
    expect(e.messages!.some((m) => m.kind === 'record')).toBe(true);
    // Bij de 5e workout + record: mijlpaal eerst, record als tweede
    const e2 = finish(prev, at(0), { activeSec: 1800 });
    expect(e2.messages!.map((m) => m.kind)).toEqual(['count', 'record']);
  });

  it('gestopte workout krijgt een aangepaste, positieve boodschap', () => {
    const e = finish([entry(at(6)), entry(at(4))], at(0), { activeSec: 360, completed: false });
    expect(e.completed).toBe(false);
    expect(e.rounds).toBe(2);
    expect(e.roundsPlanned).toBe(3);
    expect(e.messages!.some((m) => m.kind === 'stopped')).toBe(true);
    expect(e.messages!.find((m) => m.kind === 'stopped')!.text).toMatch(/6 minuten/);
    expect(['Goed bezig!', 'Mooi gewerkt!', 'Lekker bewogen!', 'Elke minuut telt!']).toContain(e.headline);
  });

  it('welkom terug na een pauze', () => {
    const e = finish([40, 30, 12].map((d) => entry(at(d), { totalSec: 600, kcal: 200 })), at(0));
    expect(e.messages!.map((m) => m.kind)).toContain('comeback');
  });

  it('naam alleen als die is ingevuld; nooit lege plekken of accolades', () => {
    let h: HistoryEntry[] = [];
    for (let d = 60; d >= 0; d--) {
      const e = finish(h, at(d, 7 + (d % 16)), { name: d % 2 ? 'Ria' : undefined, activeSec: 600 + (d % 7) * 120, completed: d % 9 !== 0 });
      for (const m of e.messages!) {
        expect(m.text).not.toMatch(/[{}]|, !|, \.|^,|  /);
        if (d % 2 === 0) expect(m.text).not.toMatch(/Ria/);
      }
      expect(e.headline).not.toMatch(/[{}]|, !/);
      // de naam hooguit één keer op het scherm
      expect([e.headline, ...e.messages!.map((m) => m.text)].join(' ').split('Ria').length - 1).toBeLessThanOrEqual(1);
      h = [...h, e];
    }
  });

  it('maximaal twee boodschappen, altijd minstens één', () => {
    let h: HistoryEntry[] = [];
    for (let d = 30; d >= 0; d--) {
      const e = finish(h, at(d));
      expect(e.messages!.length).toBeGreaterThanOrEqual(1);
      expect(e.messages!.length).toBeLessThanOrEqual(2);
      h = [...h, e];
    }
  });

  it('afwisselend: elke dag dezelfde workout geeft binnen twee weken geen herhaalde teksten', () => {
    let h: HistoryEntry[] = [];
    // eerst een maand geschiedenis, daarna twee weken elke dag dezelfde workout
    for (let d = 60; d > 14; d -= 2) h.push(entry(at(d)));
    const texts: string[] = [];
    for (let d = 14; d >= 1; d--) {
      const e = finish(h, at(d));
      texts.push(...e.messages!.map((m) => m.text));
      h = [...h, e];
    }
    const dups = texts.filter((t, i) => texts.indexOf(t) !== i);
    expect(dups, texts.join('\n')).toEqual([]);
  });

  it('dezelfde workout-id geeft altijd dezelfde keuze', () => {
    const e = finish([entry(at(3))], at(0));
    const again = composeSummary({ entry: { ...e, messages: undefined, headline: undefined }, previous: [entry(at(3))] });
    expect(again.headline).toBe(e.headline);
    expect(again.messages.map((m) => m.key)).toEqual(e.messages!.map((m) => m.key));
  });

  it('tijdsduur in gewone taal', () => {
    expect(durationText(45)).toBe('45 seconden');
    expect(durationText(60)).toBe('1 minuut');
    expect(durationText(95)).toBe('1 minuut');
    expect(durationText(14 * 60 + 20)).toBe('14 minuten');
    expect(durationText(3600)).toBe('1 uur');
    expect(durationText(3900)).toBe('1 uur en 5 minuten');
  });
});

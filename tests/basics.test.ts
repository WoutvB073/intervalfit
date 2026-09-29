import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/router';
import { formatClock, formatShort, formatTotal } from '../src/model/format';
import { EXERCISES, CATEGORIES, getExercise } from '../src/data/exercises';

describe('router', () => {
  it('herkent alle schermen', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/workout/nieuw')).toEqual({ name: 'editor' });
    expect(parseHash('#/workout/abc')).toEqual({ name: 'editor', id: 'abc' });
    expect(parseHash('#/speel/abc')).toEqual({ name: 'player', id: 'abc' });
    expect(parseHash('#/klaar/h1')).toEqual({ name: 'summary', id: 'h1' });
    expect(parseHash('#/instellingen')).toEqual({ name: 'settings' });
    expect(parseHash('#/deel/N4Ig+-$x')).toEqual({ name: 'share', code: 'N4Ig+-$x' });
    expect(parseHash('#/iets')).toEqual({ name: 'notFound' });
  });
});

describe('tijdweergave', () => {
  it('formatteert korte tijden', () => {
    expect(formatShort(45)).toBe('45 s');
    expect(formatShort(60)).toBe('1 min');
    expect(formatShort(90)).toBe('1:30 min');
  });
  it('rondt de totale duur naar boven af', () => {
    expect(formatTotal(585)).toBe('10 min');
    expect(formatTotal(20)).toBe('1 min');
    expect(formatTotal(3900)).toBe('1 u 5 min');
  });
  it('toont een klok', () => {
    expect(formatClock(585)).toBe('9:45');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});

describe('oefeningenbibliotheek', () => {
  it('bevat alle 39 oefeningen met unieke id', () => {
    expect(EXERCISES).toHaveLength(39);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(39);
  });
  it('heeft per oefening een geldige categorie, instructie, MET en zoekwoorden', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const e of EXERCISES) {
      expect(cats.has(e.category), e.id).toBe(true);
      expect(e.instruction.length, e.id).toBeGreaterThan(20);
      expect(e.met, e.id).toBeGreaterThan(1);
      expect(e.aliases.length, e.id).toBeGreaterThan(0);
    }
  });
  it('vindt oefeningen op id', () => {
    expect(getExercise('push-ups')?.name).toBe('Opdrukken');
    expect(getExercise('bestaat-niet')).toBeUndefined();
  });
});

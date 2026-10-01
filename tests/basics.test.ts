import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/router';
import { formatClock, formatShort, formatTotal, formatTrained } from '../src/model/format';
import { EXERCISES, CATEGORIES, getExercise, EQUIPMENT, equipmentOf } from '../src/data/exercises';

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
  it('toont getrainde tijd gewoon afgerond', () => {
    expect(formatTrained(371)).toBe('6 min');
    expect(formatTrained(20)).toBe('1 min');
    expect(formatTrained(3900)).toBe('1 u 5 min');
  });
  it('toont een klok', () => {
    expect(formatClock(585)).toBe('9:45');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});

describe('oefeningenbibliotheek', () => {
  it('bevat alle 54 oefeningen met unieke id', () => {
    expect(EXERCISES).toHaveLength(54);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(54);
  });
  it('heeft per oefening een geldig materiaal; alleen stoel/dumbbells/stang staan erbij', () => {
    const ids = new Set(EQUIPMENT.map((m) => m.id));
    for (const e of EXERCISES) expect(ids.has(equipmentOf(e)), e.id).toBe(true);
    const byEquipment = (m: string) => EXERCISES.filter((e) => equipmentOf(e) === m).map((e) => e.id).sort();
    expect(byEquipment('dumbbells')).toEqual(['bicep-curls', 'bicep-curls-left', 'bicep-curls-right', 'goblet-squats', 'hammer-curls']);
    expect(byEquipment('stang')).toEqual(['chin-ups', 'hanging-knee-raises', 'pull-ups']);
    expect(byEquipment('stoel')).toEqual(['step-ups', 'tricep-dips']);
  });
  it('heeft per oefening een geldige categorie, instructie, MET en zoekwoorden', () => {
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const e of EXERCISES) {
      expect(cats.has(e.category), e.id).toBe(true);
      expect(e.instruction.length, e.id).toBeGreaterThan(20);
      expect(e.instruction.length, `te lange instructie: ${e.id}`).toBeLessThanOrEqual(60);
      expect(e.met, e.id).toBeGreaterThan(1);
      expect(e.aliases.length, e.id).toBeGreaterThan(0);
    }
  });
  it('vindt oefeningen op id', () => {
    expect(getExercise('push-ups')?.name).toBe('Opdrukken');
    expect(getExercise('bestaat-niet')).toBeUndefined();
  });
});

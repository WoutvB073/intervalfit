import { describe, expect, it } from 'vitest';
import { buildSoundCues, buildSpeechCues, defaultEstimator, spokenDuration, spokenName, BEEP_WINDOW } from '../src/engine/cues';
import { buildTimeline } from '../src/model/timeline';
import { createSampleWorkouts } from '../src/data/sampleWorkouts';
import { createDevWorkout } from '../src/data/devWorkout';
import type { Workout } from '../src/model/types';

const SOUND_LEN = { beep: 0.2, beepLong: 0.6, whistleStart: 0.6, whistleEnd: 0.5, finish: 1.3 } as const;

/** Absolute tijden van alle geluiden (vanaf het begin van de workout). */
function absolute(w: Workout, countdown: number, opts = { beeps: true, whistle: true }) {
  const phases = buildTimeline(w, countdown);
  const starts: number[] = [];
  let t = 0;
  for (const p of phases) {
    starts.push(t);
    t += p.durationSec;
  }
  const sounds = buildSoundCues(phases, opts).map((c) => ({ ...c, t: starts[c.phase]! + c.at }));
  const speech = buildSpeechCues(phases, w, defaultEstimator).map((c) => ({ ...c, t: starts[c.phase]! + c.at }));
  return { phases, starts, sounds, speech, total: t };
}

describe('geluiden', () => {
  it('piepjes op 3, 2 en 1 seconde voor het einde van elke fase', () => {
    const { phases, sounds, starts } = absolute(createDevWorkout(), 10);
    phases.forEach((p, i) => {
      const beeps = sounds.filter((s) => s.kind === 'beep' && s.phase === i).map((s) => s.t);
      const end = starts[i]! + p.durationSec;
      expect(beeps).toEqual([end - 3, end - 2, end - 1]);
    });
  });

  it('fluitje bij begin en einde van elke oefening, slotmelodie aan het eind', () => {
    const w = createDevWorkout();
    const { phases, sounds } = absolute(w, 10);
    const works = phases.filter((p) => p.type === 'work').length;
    expect(sounds.filter((s) => s.kind === 'whistleStart')).toHaveLength(works);
    expect(sounds.filter((s) => s.kind === 'whistleEnd')).toHaveLength(works);
    expect(sounds.filter((s) => s.kind === 'finish')).toHaveLength(1);
  });

  it('geen enkel geluid overlapt met een ander', () => {
    for (const w of [...createSampleWorkouts(), createDevWorkout()]) {
      const { sounds } = absolute(w, 10);
      const sorted = [...sounds].sort((a, b) => a.t - b.t);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!;
        expect(sorted[i]!.t, `${w.name}: ${prev.kind} → ${sorted[i]!.kind}`).toBeGreaterThanOrEqual(prev.t + SOUND_LEN[prev.kind] - 0.001);
      }
    }
  });

  it('zonder fluitje een lange piep; zonder piepjes en fluitje stilte', () => {
    const w = createDevWorkout();
    const noWhistle = absolute(w, 10, { beeps: true, whistle: false }).sounds;
    expect(noWhistle.some((s) => s.kind.startsWith('whistle'))).toBe(false);
    expect(noWhistle.filter((s) => s.kind === 'beepLong').length).toBeGreaterThan(0);
    const silent = absolute(w, 10, { beeps: false, whistle: false }).sounds;
    expect(silent.filter((s) => s.kind !== 'finish')).toEqual([]);
  });

  it('zonder rust tussen oefeningen maar één fluitje per wissel', () => {
    const w = { ...createDevWorkout(), restSec: 0, rounds: 1 };
    const { sounds } = absolute(w, 0);
    const at10 = sounds.filter((s) => Math.abs(s.t - 10) < 0.01 && s.kind !== 'beep');
    expect(at10.map((s) => s.kind)).toEqual(['whistleStart']);
  });
});

describe('spraak', () => {
  it('elke aankondiging is klaar vóór de piepjes en begint na het fluitje', () => {
    for (const w of [...createSampleWorkouts(), createDevWorkout()]) {
      const { phases, speech, starts } = absolute(w, 10);
      for (const cue of speech) {
        const p = phases[cue.phase]!;
        const end = starts[cue.phase]! + p.durationSec;
        const beepsStart = end - BEEP_WINDOW;
        const fits = cue.estSec + 0.8 <= p.durationSec - BEEP_WINDOW - 0.35;
        if (fits) {
          expect(cue.t + cue.estSec, `${w.name}: ${cue.text}`).toBeLessThanOrEqual(beepsStart - 0.3);
          expect(cue.t, cue.text).toBeGreaterThanOrEqual(starts[cue.phase]! + 0.5);
        }
      }
    }
  });

  it('kondigt in elke rust en in het aftellen de volgende oefening aan', () => {
    const w = createSampleWorkouts()[0]!;
    const { phases, speech } = absolute(w, 10);
    const pauses = phases.filter((p) => p.type !== 'work').length;
    expect(speech).toHaveLength(pauses);
    expect(speech[0]!.text).toMatch(/^Maak je klaar\. Eerste oefening: /);
    expect(speech.some((s) => s.text.startsWith('Ronde 2 van 2'))).toBe(true);
    expect(speech.at(-1)!.text).toMatch(/^Laatste oefening: /);
  });

  it('bij korte rust een korte zin, direct aan het begin', () => {
    const w = { ...createDevWorkout(), restSec: 5 };
    const { phases, speech } = absolute(w, 10);
    const restCue = speech.find((s) => phases[s.phase]!.type === 'rest')!;
    expect(restCue.text.length).toBeLessThan(35);
    expect(restCue.at).toBeLessThanOrEqual(1);
  });

  it('noemt bij links/rechts-oefeningen de kant', () => {
    const w = createDevWorkout();
    const { speech } = absolute(w, 10);
    expect(speech.some((s) => /links/.test(s.text))).toBe(true);
    expect(spokenName({ libraryId: 'side-plank-right', name: 'Zijplank rechts' })).toMatch(/rechts/);
    // Aangepaste naam: die wordt letterlijk uitgesproken.
    expect(spokenName({ libraryId: 'squats', name: 'Diepe squats' })).toBe('Diepe squats');
  });

  it('spreekt tijden natuurlijk uit', () => {
    expect(spokenDuration(45)).toBe('45 seconden');
    expect(spokenDuration(60)).toBe('1 minuut');
    expect(spokenDuration(90)).toBe('1 minuut en 30 seconden');
    expect(spokenDuration(120)).toBe('2 minuten');
  });
});

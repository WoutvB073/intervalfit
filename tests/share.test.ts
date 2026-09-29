import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { decodeWorkout, encodeWorkout, extractShareCode, shareUrl } from '../src/storage/share';
import { createSampleWorkouts } from '../src/data/sampleWorkouts';
import { totalDurationSec } from '../src/model/timeline';

describe('workout delen', () => {
  const [ochtend, buik] = createSampleWorkouts();

  it('komt na coderen en decoderen hetzelfde terug', () => {
    for (const w of [ochtend!, buik!]) {
      const back = decodeWorkout(encodeWorkout(w))!;
      expect(back.name).toBe(w.name);
      expect(back.rounds).toBe(w.rounds);
      expect(back.exercises.map((e) => [e.libraryId, e.name, e.workSec, e.restSec])).toEqual(
        w.exercises.map((e) => [e.libraryId, e.name, e.workSec, e.restSec]),
      );
      expect(totalDurationSec(back)).toBe(totalDurationSec(w));
      expect(back.id).not.toBe(w.id);
    }
  });

  it('bewaart eigen oefeningen en aangepaste namen, maar geen foto', () => {
    const w = { ...ochtend!, exercises: [
      { id: 'a', name: 'Traplopen', workSec: 60, photoId: 'foto1' },
      { id: 'b', libraryId: 'squats', name: 'Diepe squats', workSec: 45 },
    ] };
    const back = decodeWorkout(encodeWorkout(w))!;
    expect(back.exercises[0]).toMatchObject({ name: 'Traplopen', workSec: 60 });
    expect(back.exercises[0]!.libraryId).toBeUndefined();
    expect(back.exercises[0]!.photoId).toBeUndefined();
    expect(back.exercises[1]).toMatchObject({ libraryId: 'squats', name: 'Diepe squats' });
  });

  it('maakt korte links', () => {
    expect(shareUrl(buik!, 'https://x.github.io/intervalfit/').length).toBeLessThan(400);
  });

  it('geeft null bij kapotte of lege codes', () => {
    expect(decodeWorkout('')).toBeNull();
    expect(decodeWorkout('dit-is-onzin')).toBeNull();
    expect(decodeWorkout(compressToEncodedURIComponent('{"v":1,"e":[]}'))).toBeNull();
    expect(decodeWorkout(compressToEncodedURIComponent('{"v":2,"e":[["squats","",30]]}'))).toBeNull();
  });

  it('begrenst onzinnige waarden', () => {
    const code = compressToEncodedURIComponent(
      JSON.stringify({ v: 1, n: 'x'.repeat(200), r: 999, s: -5, q: 'a', e: [['onbekend', '', 99999], ['squats', '', 30, -1]] }),
    );
    const w = decodeWorkout(code)!;
    expect(w.name.length).toBe(60);
    expect(w.rounds).toBe(50);
    expect(w.restSec).toBe(0);
    expect(w.roundRestSec).toBe(60);
    // Onbekende bibliotheek-id zonder naam wordt overgeslagen
    expect(w.exercises).toHaveLength(1);
    expect(w.exercises[0]).toMatchObject({ libraryId: 'squats', restSec: 0 });
  });

  it('haalt de code uit een link of WhatsApp-bericht', () => {
    const url = shareUrl(ochtend!, 'https://x.github.io/intervalfit/');
    const code = url.split('#/deel/')[1]!;
    expect(extractShareCode(url)).toBe(code);
    expect(extractShareCode(`Doe mee met mijn workout! 💪 ${url} tot straks`)).toBe(code);
    expect(extractShareCode(`  ${code}  `)).toBe(code);
    expect(extractShareCode('hallo')).toBeNull();
  });
});

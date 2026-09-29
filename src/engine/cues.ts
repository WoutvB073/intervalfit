import type { Phase } from '../model/timeline';
import type { Workout } from '../model/types';
import { getExercise } from '../data/exercises';

/**
 * Welke geluiden en welke gesproken zinnen er wanneer klinken, uitgedrukt per fase
 * (fase-index + seconden vanaf het begin van die fase). Geen klok en geen audio hier:
 * pure planning, zodat het goed te testen is.
 *
 * Regels:
 * - piepjes op 3, 2 en 1 seconde voor het einde van elke fase (aftellen, werk en rust);
 * - fluitje bij het begin van een oefening (lang) en bij het einde (twee korte);
 *   staat het fluitje uit maar de piepjes aan, dan een lange piep;
 * - na de laatste oefening een slotmelodie;
 * - de aankondiging van de volgende oefening valt in de rust en is klaar vóór de piepjes;
 *   past dat niet, dan een kortere zin, en anders zo vroeg mogelijk in de rust.
 */

export type SoundKind = 'beep' | 'beepLong' | 'whistleStart' | 'whistleEnd' | 'finish';

export type SoundCue = { kind: SoundKind; phase: number; at: number };

export type SpeechCue = { phase: number; at: number; text: string; estSec: number };

export type CueOptions = { beeps: boolean; whistle: boolean };

/** Hoe lang voor het einde de laatste 3 piepjes beginnen. */
export const BEEP_WINDOW = 3;
/** Ruimte na het fluitje aan het begin van een rust, en voor de piepjes. */
const AFTER_WHISTLE = 0.8;
const BEFORE_BEEPS = 0.35;

export function buildSoundCues(phases: Phase[], opts: CueOptions): SoundCue[] {
  const cues: SoundCue[] = [];
  const transition = (kind: 'whistleStart' | 'whistleEnd', phase: number, at: number) => {
    if (opts.whistle) cues.push({ kind, phase, at });
    else if (opts.beeps) cues.push({ kind: 'beepLong', phase, at });
  };

  phases.forEach((p, i) => {
    // Begin van deze fase
    if (p.type === 'work') transition('whistleStart', i, 0);
    else if (i > 0 && phases[i - 1]!.type === 'work') transition('whistleEnd', i, 0);

    // Laatste 3 seconden
    if (opts.beeps) {
      for (let k = BEEP_WINDOW; k >= 1; k--) {
        const at = p.durationSec - k;
        if (at > 0.4) cues.push({ kind: 'beep', phase: i, at });
      }
    }
  });

  const last = phases.length - 1;
  if (last >= 0) {
    if (phases[last]!.type === 'work') transition('whistleEnd', last, phases[last]!.durationSec);
    cues.push({ kind: 'finish', phase: last, at: phases[last]!.durationSec + 0.6 });
  }
  return cues;
}

// ── Spraak ────────────────────────────────────────────────────────

/** Tekst die de stem uitspreekt voor een oefening (met eventuele uitspraakhulp). */
export function spokenName(e: { libraryId?: string; name: string }): string {
  const lib = getExercise(e.libraryId);
  // Alleen de uitspraakhulp gebruiken als de naam niet is aangepast.
  if (lib && lib.name === e.name && lib.spoken) return lib.spoken;
  return e.name;
}

/** "45 seconden", "1 minuut", "1 minuut en 30 seconden". */
export function spokenDuration(sec: number): string {
  if (sec < 60) return `${sec} seconden`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const min = m === 1 ? '1 minuut' : `${m} minuten`;
  return s ? `${min} en ${s} seconden` : min;
}

/** Schatting van de spreekduur (seconden) op basis van het aantal tekens. */
export type Estimator = (text: string) => number;
export const defaultEstimator: Estimator = (text) => 0.35 + text.length / 13.5;

function variants(phases: Phase[], i: number, rounds: number): string[] {
  const p = phases[i]!;
  const name = spokenName(p.exercise);
  const dur = spokenDuration(p.exercise.workSec);
  // Is de eerstvolgende oefening de allerlaatste van de workout?
  const next = phases.findIndex((q, k) => k > i && q.type === 'work');
  const isFinal = next >= 0 && !phases.some((q, k) => k > next && q.type === 'work');
  if (p.type === 'countdown') {
    return [`Maak je klaar. Eerste oefening: ${name}, ${dur}.`, `Eerst: ${name}.`, name];
  }
  if (p.type === 'roundRest') {
    return [`Ronde ${p.round + 1} van ${rounds}. Eerste oefening: ${name}.`, `Ronde ${p.round + 1}. ${name}.`, name];
  }
  // Gewone rust: is de volgende oefening de allerlaatste?
  if (isFinal) return [`Laatste oefening: ${name}, ${dur}.`, `Laatste: ${name}.`, name];
  return [`Volgende: ${name}, ${dur}.`, `Volgende: ${name}.`, name];
}

/**
 * Plant de aankondigingen in rust- en aftelfases.
 * Het liefst zo dat de zin eindigt net vóór de piepjes; past de lange zin niet, dan de korte;
 * past ook die niet, dan zo vroeg mogelijk (direct na het fluitje).
 */
export function buildSpeechCues(phases: Phase[], workout: Pick<Workout, 'rounds'>, estimate: Estimator = defaultEstimator): SpeechCue[] {
  const cues: SpeechCue[] = [];
  phases.forEach((p, i) => {
    if (p.type === 'work') return;
    const start = p.type === 'countdown' ? 0.5 : AFTER_WHISTLE;
    const latestEnd = p.durationSec - BEEP_WINDOW - BEFORE_BEEPS;
    const texts = variants(phases, i, workout.rounds);
    for (const text of texts) {
      const est = estimate(text);
      if (start + est <= latestEnd) {
        cues.push({ phase: i, at: latestEnd - est, text, estSec: est });
        return;
      }
    }
    // Korte rust: de kortste zin direct aan het begin.
    const text = texts[texts.length - 1]!;
    cues.push({ phase: i, at: Math.min(start, Math.max(0.2, p.durationSec - 0.5)), text, estSec: estimate(text) });
  });
  return cues;
}

export const FINISH_TEXT = 'Goed gedaan! Je workout is klaar.';

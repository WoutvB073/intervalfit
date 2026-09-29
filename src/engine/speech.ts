import { STORAGE_PREFIX } from '../config';
import type { Estimator } from './cues';

/**
 * Gesproken aankondigingen met de Nederlandse stem van het toestel (Web Speech API).
 * - iPhone: de eerste zin moet binnen een tik worden gestart → `unlock()` in de tik-afhandeling.
 * - De spreeksnelheid van de gekozen stem wordt gemeten en onthouden, zodat de planning
 *   (klaar vóór de piepjes) steeds beter klopt.
 */

const RATE_KEY = `${STORAGE_PREFIX}.speechRate`;
const DEFAULT_CPS = 13.5; // tekens per seconde

type Rates = Record<string, number>;

function readRates(): Rates {
  try {
    return JSON.parse(localStorage.getItem(RATE_KEY) ?? '{}') as Rates;
  } catch {
    return {};
  }
}

class Speech {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  private voice: SpeechSynthesisVoice | null = null;
  private preferredURI: string | undefined;
  private rates: Rates = readRates();
  private current: SpeechSynthesisUtterance | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    if (!this.supported) return;
    this.pickVoice();
    speechSynthesis.addEventListener?.('voiceschanged', () => {
      this.pickVoice();
      this.listeners.forEach((l) => l());
    });
  }

  onVoicesChanged(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Alle Nederlandstalige stemmen (nl-NL eerst). */
  dutchVoices(): SpeechSynthesisVoice[] {
    if (!this.supported) return [];
    return speechSynthesis
      .getVoices()
      .filter((v) => /^nl([-_]|$)/i.test(v.lang))
      .sort((a, b) => score(b) - score(a));
  }

  setPreferred(uri: string | undefined): void {
    this.preferredURI = uri;
    this.pickVoice();
  }

  private pickVoice() {
    const voices = this.dutchVoices();
    this.voice = voices.find((v) => v.voiceURI === this.preferredURI) ?? voices[0] ?? null;
  }

  /** Is er een Nederlandse stem? (Zonder stem geen spraak, wel piepjes.) */
  get available(): boolean {
    return this.supported && (this.voice !== null || speechSynthesis.getVoices().length === 0);
  }

  get voiceName(): string | undefined {
    return this.voice?.name;
  }

  /** In de tik-afhandeling aanroepen: een stille lege zin ontgrendelt spraak op iOS. */
  unlock(): void {
    if (!this.supported) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'nl-NL';
      speechSynthesis.speak(u);
    } catch {
      /* niet erg */
    }
  }

  speak(text: string, volume = 1): void {
    if (!this.supported) return;
    try {
      speechSynthesis.cancel(); // iOS kan anders blijven "hangen"
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.voice?.lang ?? 'nl-NL';
      if (this.voice) u.voice = this.voice;
      u.rate = 1;
      u.pitch = 1;
      u.volume = volume;
      let started = 0;
      u.onstart = () => {
        started = performance.now();
      };
      u.onend = () => {
        if (started && this.current === u) {
          const sec = (performance.now() - started) / 1000;
          if (sec > 0.3) this.learn(text, sec);
        }
        if (this.current === u) this.current = null;
      };
      this.current = u; // referentie vasthouden (anders kan Chrome onend "vergeten")
      speechSynthesis.speak(u);
    } catch {
      /* spraak is een extraatje; nooit de workout laten mislukken */
    }
  }

  cancel(): void {
    if (!this.supported) return;
    this.current = null;
    try {
      speechSynthesis.cancel();
    } catch {
      /* niet erg */
    }
  }

  get speaking(): boolean {
    return this.supported && speechSynthesis.speaking;
  }

  private key(): string {
    return this.voice?.voiceURI ?? 'default';
  }

  private learn(text: string, sec: number) {
    const cps = text.length / Math.max(0.3, sec - 0.2);
    if (cps < 4 || cps > 40) return;
    const old = this.rates[this.key()] ?? DEFAULT_CPS;
    this.rates[this.key()] = old * 0.6 + cps * 0.4;
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify(this.rates));
    } catch {
      /* niet erg */
    }
  }

  /** Schatter van de spreekduur voor de planning van aankondigingen. */
  estimator(): Estimator {
    const cps = this.rates[this.key()] ?? DEFAULT_CPS;
    return (text) => 0.35 + text.length / cps;
  }
}

/** Voorkeur: nl-NL boven nl-BE, "verbeterde/premium" stemmen boven compacte. */
function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (/nl[-_]NL/i.test(v.lang)) s += 10;
  if (/premium|enhanced|verbeterd|natural|neural/i.test(v.name)) s += 5;
  if (/google/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
  return s;
}

export const speech = new Speech();

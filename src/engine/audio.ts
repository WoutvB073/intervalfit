import type { SoundKind } from './cues';
import { isIOS } from './platform';

/**
 * Geluid via de Web Audio API.
 * - Alle geluiden worden één keer vooraf "gerenderd" naar buffers (geen vertraging bij afspelen).
 * - Geluiden worden tot ± 1,5 s vooruit ingepland op de audioklok: sample-nauwkeurig.
 * - Bij pauze/overslaan/vorige worden ingeplande geluiden direct geannuleerd.
 * - iPhone: audio mag pas na een tik; `unlock()` moet dus in de tik-afhandeling worden aangeroepen.
 */

type Ctx = AudioContext;
type AudioSessionNav = Navigator & { audioSession?: { type: string } };

const SAMPLE_RATE = 44100;

function makeCtx(): Ctx | null {
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try {
    return new C({ latencyHint: 'interactive' });
  } catch {
    return new C();
  }
}

// ── Klanken ──────────────────────────────────────────────────────

type Render = (ctx: OfflineAudioContext, out: AudioNode) => void;

function env(g: GainNode, t0: number, peak: number, attack: number, hold: number, release: number) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.setValueAtTime(peak, t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
}

function tone(ctx: BaseAudioContext, out: AudioNode, freq: number, t0: number, dur: number, peak: number, type: OscillatorType = 'sine') {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  env(g, t0, peak, 0.006, Math.max(0, dur - 0.06), 0.05);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** Scheidsrechtersfluitje: hoge toon met snelle triller en een beetje "adem". */
function whistle(ctx: BaseAudioContext, out: AudioNode, t0: number, dur: number) {
  const o = ctx.createOscillator();
  o.frequency.value = 2650;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 32;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain).connect(o.frequency);
  const g = ctx.createGain();
  env(g, t0, 0.32, 0.015, dur - 0.07, 0.055);
  o.connect(g).connect(out);

  // Adem: gefilterde ruis
  const len = Math.ceil(dur * ctx.sampleRate);
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2650;
  bp.Q.value = 4;
  const ng = ctx.createGain();
  env(ng, t0, 0.12, 0.01, dur - 0.06, 0.05);
  n.connect(bp).connect(ng).connect(out);

  for (const s of [o, lfo]) {
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }
  n.start(t0);
}

const SOUNDS: Record<SoundKind, { dur: number; render: Render }> = {
  beep: {
    dur: 0.2,
    render: (ctx, out) => {
      tone(ctx, out, 880, 0, 0.14, 0.55);
      tone(ctx, out, 1760, 0, 0.12, 0.1);
    },
  },
  beepLong: {
    dur: 0.6,
    render: (ctx, out) => {
      tone(ctx, out, 1175, 0, 0.52, 0.55);
      tone(ctx, out, 2350, 0, 0.5, 0.08);
    },
  },
  whistleStart: { dur: 0.6, render: (ctx, out) => whistle(ctx, out, 0, 0.55) },
  whistleEnd: {
    dur: 0.5,
    render: (ctx, out) => {
      whistle(ctx, out, 0, 0.17);
      whistle(ctx, out, 0.25, 0.2);
    },
  },
  finish: {
    dur: 1.3,
    render: (ctx, out) => {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((f, i) => tone(ctx, out, f, i * 0.14, 0.16, 0.4, 'triangle'));
      for (const f of [523.25, 659.25, 783.99, 1046.5]) tone(ctx, out, f, 0.44, 0.8, 0.22, 'triangle');
    },
  },
};

async function renderSound(kind: SoundKind): Promise<AudioBuffer | null> {
  const Off =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Off) return null;
  const { dur, render } = SOUNDS[kind];
  const ctx = new Off(1, Math.ceil(dur * SAMPLE_RATE), SAMPLE_RATE);
  const master = ctx.createGain();
  master.connect(ctx.destination);
  render(ctx, master);
  return ctx.startRendering();
}

// ── Stil geluid in een lus (voor "altijd laten klinken" zonder audioSession-API) ──

function silentWavUrl(): string {
  const rate = 8000;
  const samples = rate; // 1 seconde
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// ── De motor ─────────────────────────────────────────────────────

type Scheduled = { src: AudioBufferSourceNode; key: string };

class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private buffers: Partial<Record<SoundKind, AudioBuffer>> = {};
  private rendering: Promise<void> | null = null;
  private scheduled: Scheduled[] = [];
  private keys = new Set<string>();
  private silentEl: HTMLAudioElement | null = null;
  private volume = 0.8;

  /** In de tik-afhandeling aanroepen (iPhone). Mag vaker. */
  unlock(opts: { alwaysAudible: boolean; volume: number }): void {
    this.volume = opts.volume;
    this.setAlwaysAudible(opts.alwaysAudible);
    if (!this.ctx) {
      this.ctx = makeCtx();
      if (!this.ctx) return;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    const ctx = this.ctx;
    void ctx.resume?.().catch(() => undefined);
    // Een piepklein stil geluidje afspelen binnen de tik "ontgrendelt" audio op iOS.
    try {
      const b = ctx.createBuffer(1, 1, ctx.sampleRate);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    } catch {
      /* niet erg */
    }
    if (!this.rendering) {
      this.rendering = Promise.all(
        (Object.keys(SOUNDS) as SoundKind[]).map(async (k) => {
          const b = await renderSound(k).catch(() => null);
          if (b) this.buffers[k] = b;
        }),
      ).then(() => undefined);
    }
  }

  /** iPhone: geluid ook als de telefoon op stil staat (muziek van andere apps pauzeert dan). */
  setAlwaysAudible(on: boolean): void {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) {
      try {
        nav.audioSession.type = on ? 'playback' : 'ambient';
      } catch {
        /* niet ondersteund */
      }
      return;
    }
    if (!isIOS) return;
    // Oudere iOS: een stil <audio>-lusje zet het toestel in "afspeel"-modus.
    if (on) {
      if (!this.silentEl) {
        this.silentEl = new Audio(silentWavUrl());
        this.silentEl.loop = true;
        this.silentEl.setAttribute('playsinline', '');
      }
      void this.silentEl.play().catch(() => undefined);
    } else {
      this.silentEl?.pause();
    }
  }

  /** Wacht tot alle geluiden klaar zijn (na unlock). */
  whenReady(): Promise<void> {
    return this.rendering ?? Promise.resolve();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get state(): string {
    return this.ctx?.state ?? 'none';
  }

  /** Probeer audio te hervatten (na scherm-op-slot of een telefoontje). */
  async resume(): Promise<boolean> {
    if (!this.ctx) return false;
    try {
      await this.ctx.resume();
    } catch {
      /* moet misschien met een tik */
    }
    return this.ctx.state === 'running';
  }

  /** Plant een geluid op wandtijd `wallMs` (Date.now-schaal). Elke `key` maar één keer. */
  schedule(key: string, kind: SoundKind, wallMs: number): boolean {
    if (this.keys.has(key)) return false;
    const ctx = this.ctx;
    const buf = this.buffers[kind];
    if (!ctx || !this.master || !buf || ctx.state !== 'running') return false;
    this.keys.add(key);
    const when = ctx.currentTime + (wallMs - Date.now()) / 1000;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start(Math.max(ctx.currentTime, when));
    const item = { src, key };
    this.scheduled.push(item);
    src.onended = () => {
      this.scheduled = this.scheduled.filter((s) => s !== item);
    };
    return true;
  }

  /** Meteen afspelen (bv. "test geluid"). */
  playNow(kind: SoundKind): void {
    this.schedule(`nu:${kind}:${Date.now()}`, kind, Date.now());
  }

  /** Alle ingeplande (en klinkende) geluiden stoppen en vergeten. */
  cancelAll(): void {
    for (const s of this.scheduled) {
      try {
        s.src.onended = null;
        s.src.stop();
      } catch {
        /* al gestopt */
      }
    }
    this.scheduled = [];
    this.keys.clear();
  }

  /** Aantal nog ingeplande geluiden (voor tests en foutopsporing). */
  get pending(): number {
    return this.scheduled.length;
  }
}

export const audio = new AudioEngine();

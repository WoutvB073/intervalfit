import type { Phase } from '../model/timeline';

/**
 * De tijdmotor van de speler. Rekent uitsluitend met tijdstempels (Date.now), niet met het
 * aantal setInterval-tikken. Daardoor klopt de tijd ook na scherm-op-slot, een andere app,
 * een telefoontje of een trage telefoon: bij de volgende `update()` wordt gewoon uitgerekend
 * waar de workout nu is.
 */
export type SessionStatus = 'ready' | 'running' | 'paused' | 'finished';

export type PhaseChange = {
  from: number;
  to: number;
  /** De overgang lag al een tijdje in het verleden (bv. na wegschakelen): geen geluid meer voor spelen. */
  late: boolean;
};

export type WorkStat = { key: string; name: string; workSec: number };

const LATE_MS = 400;

export class Session {
  readonly phases: Phase[];
  status: SessionStatus = 'ready';
  index = 0;
  /** Wandtijd (ms) waarop de huidige fase begon, gecorrigeerd voor pauzes. */
  private phaseStart = 0;
  private pausedAt = 0;
  /** Opgetelde actieve tijd (zonder pauzes) in eerder afgeronde fases. */
  private activeBefore = 0;
  private work = new Map<string, WorkStat>();
  private now: () => number;

  constructor(phases: Phase[], now: () => number = Date.now) {
    this.phases = phases;
    this.now = now;
  }

  get phase(): Phase | undefined {
    return this.phases[this.index];
  }

  start(): void {
    if (this.status !== 'ready' || this.phases.length === 0) return;
    this.status = 'running';
    this.phaseStart = this.now();
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.update();
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.pausedAt = this.now();
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.phaseStart += this.now() - this.pausedAt;
    this.status = 'running';
  }

  /** Verstreken seconden in de huidige fase. */
  elapsed(): number {
    if (this.status === 'ready') return 0;
    if (this.status === 'finished') return this.phase?.durationSec ?? 0;
    const ref = this.status === 'paused' ? this.pausedAt : this.now();
    return Math.max(0, (ref - this.phaseStart) / 1000);
  }

  remaining(): number {
    const p = this.phase;
    if (!p) return 0;
    return Math.max(0, p.durationSec - this.elapsed());
  }

  /** Actieve trainingstijd tot nu toe (zonder aftellen en pauzes), in seconden. */
  activeSec(): number {
    const cur = this.phase && this.phase.type !== 'countdown' && this.status !== 'finished' ? Math.min(this.elapsed(), this.phase.durationSec) : 0;
    return this.activeBefore + cur;
  }

  /** Wandtijd (ms) waarop fase `i` begint (alleen geldig voor de huidige en latere fases). */
  phaseStartAt(i: number): number {
    let t = this.status === 'paused' ? this.phaseStart + (this.now() - this.pausedAt) : this.phaseStart;
    for (let k = this.index; k < i; k++) t += (this.phases[k]?.durationSec ?? 0) * 1000;
    return t;
  }

  /**
   * Schuift door naar de juiste fase op basis van de klok. Geeft de overgangen terug.
   * Na lang wegschakelen kunnen dat er meerdere zijn (allemaal `late`, behalve eventueel de laatste).
   */
  update(): PhaseChange[] {
    const changes: PhaseChange[] = [];
    if (this.status !== 'running') return changes;
    const now = this.now();
    for (;;) {
      const p = this.phase;
      if (!p) break;
      const end = this.phaseStart + p.durationSec * 1000;
      if (now < end) break;
      this.leavePhase(p.durationSec);
      const from = this.index;
      this.index++;
      this.phaseStart = end;
      const late = now - end > LATE_MS;
      if (this.index >= this.phases.length) {
        this.index = this.phases.length - 1;
        this.status = 'finished';
        changes.push({ from, to: -1, late });
        break;
      }
      changes.push({ from, to: this.index, late });
    }
    return changes;
  }

  /** Naar de volgende fase (rust overslaan of oefening eerder afronden). */
  skip(): PhaseChange | null {
    if (this.status !== 'running' && this.status !== 'paused') return null;
    this.update();
    // update() kan de status wijzigen (TypeScript ziet dat niet).
    if ((this.status as SessionStatus) === 'finished') return null;
    const from = this.index;
    this.leavePhase(this.elapsed());
    if (this.index >= this.phases.length - 1) {
      this.status = 'finished';
      return { from, to: -1, late: false };
    }
    this.jumpTo(this.index + 1);
    return { from, to: this.index, late: false };
  }

  /**
   * Terug: tijdens een oefening die al langer dan 3 s loopt → die oefening opnieuw.
   * Anders → de vorige oefening (rustmomenten worden overgeslagen).
   */
  prev(): PhaseChange | null {
    if (this.status !== 'running' && this.status !== 'paused') return null;
    this.update();
    // update() kan de status wijzigen (TypeScript ziet dat niet).
    if ((this.status as SessionStatus) === 'finished') return null;
    const from = this.index;
    const p = this.phase!;
    this.leavePhase(this.elapsed());
    let target = this.index;
    if (!(p.type === 'work' && this.elapsed() > 3)) {
      for (let k = this.index - 1; k >= 0; k--) {
        if (this.phases[k]!.type === 'work') {
          target = k;
          break;
        }
      }
    }
    this.jumpTo(target);
    return { from, to: target, late: false };
  }

  /** Stoppen: de huidige fase telt mee tot nu toe. */
  stop(): void {
    if (this.status === 'running' || this.status === 'paused') {
      this.leavePhase(this.elapsed());
      this.status = 'finished';
    }
  }

  /** Per oefening de gedane werktijd (voor het overzicht en de geschiedenis). */
  workStats(): WorkStat[] {
    const map = new Map(this.work);
    const p = this.phase;
    if (p?.type === 'work' && (this.status === 'running' || this.status === 'paused')) {
      addWork(map, p, Math.min(this.elapsed(), p.durationSec));
    }
    return [...map.values()];
  }

  totalWorkSec(): number {
    return this.workStats().reduce((s, w) => s + w.workSec, 0);
  }

  private jumpTo(i: number) {
    this.index = i;
    const now = this.now();
    this.phaseStart = now;
    if (this.status === 'paused') this.pausedAt = now;
  }

  private leavePhase(sec: number) {
    const p = this.phase;
    if (!p) return;
    const done = Math.max(0, Math.min(sec, p.durationSec));
    if (p.type !== 'countdown') this.activeBefore += done;
    if (p.type === 'work') addWork(this.work, p, done);
  }
}

function addWork(map: Map<string, WorkStat>, p: Phase, sec: number) {
  if (sec <= 0) return;
  const key = p.exercise.libraryId ?? `eigen:${p.exercise.name}`;
  const cur = map.get(key) ?? { key, name: p.exercise.name, workSec: 0 };
  cur.workSec += sec;
  map.set(key, cur);
}

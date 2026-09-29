import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Settings, Workout } from '../../model/types';
import { buildTimeline, type Phase } from '../../model/timeline';
import { Session, type SessionStatus } from '../../engine/session';
import { buildSoundCues, buildSpeechCues, FINISH_TEXT, BEEP_WINDOW } from '../../engine/cues';
import { audio } from '../../engine/audio';
import { speech } from '../../engine/speech';
import { keepAwake } from '../../engine/keepAwake';
import { HAPTIC, vibrate } from '../../engine/haptics';

/** Hoe ver vooruit geluiden op de audioklok worden ingepland. */
const LOOKAHEAD_MS = 1500;
/** Te laat voor een geluid (bv. na wegschakelen): overslaan. */
const LATE_MS = 150;

export type PlayerSnapshot = {
  status: SessionStatus;
  index: number;
  /** Resterende hele seconden (voor de grote timer). */
  secLeft: number;
};

/** Logboek van geluid en spraak, alleen voor tests/foutopsporing in de ontwikkelaarsmodus. */
export type CueLogEntry = { t: number; type: 'sound' | 'speak' | 'cancel'; what: string; at?: number };
declare global {
  interface Window {
    __cueLog?: CueLogEntry[];
    __player?: { session: Session };
  }
}
const log = (e: Omit<CueLogEntry, 't'>) => window.__cueLog?.push({ t: Date.now(), ...e });

export function usePlayer(workout: Workout, settings: Settings, debug: boolean) {
  const phases: Phase[] = useMemo(
    () => buildTimeline(workout, settings.countdown.enabled ? settings.countdown.seconds : 0),
    [workout, settings.countdown.enabled, settings.countdown.seconds],
  );
  const sessionRef = useRef<Session | null>(null);
  if (!sessionRef.current) sessionRef.current = new Session(phases);
  const session = sessionRef.current;

  const sound = settings.sound;
  const soundCues = useMemo(() => buildSoundCues(phases, { beeps: sound.beeps, whistle: sound.whistle }), [phases, sound.beeps, sound.whistle]);
  const speechCues = useMemo(
    () => (sound.voice && speech.supported ? buildSpeechCues(phases, workout, speech.estimator()) : []),
    [phases, workout, sound.voice],
  );

  const [snap, setSnap] = useState<PlayerSnapshot>({ status: 'ready', index: 0, secLeft: Math.ceil(phases[0]?.durationSec ?? 0) });
  const [needsTap, setNeedsTap] = useState(false);
  const spoken = useRef(new Set<string>());
  const frameListeners = useRef(new Set<() => void>());
  const finishTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (debug && typeof window !== 'undefined') {
    window.__cueLog ??= [];
    window.__player = { session };
  }

  const snapshot = useCallback((): PlayerSnapshot => {
    return { status: session.status, index: session.index, secLeft: Math.ceil(session.remaining() - 0.001) };
  }, [session]);

  const refresh = useCallback(() => {
    const next = snapshot();
    setSnap((prev) => (prev.status === next.status && prev.index === next.index && prev.secLeft === next.secLeft ? prev : next));
  }, [snapshot]);

  /** Alles wat ingepland of bezig is stoppen (bij pauze, overslaan, vorige, wegschakelen). */
  const cancelPlanned = useCallback(
    (reason: string) => {
      audio.cancelAll();
      if (speech.speaking) spoken.current.delete(String(session.index));
      speech.cancel();
      log({ type: 'cancel', what: reason });
    },
    [session],
  );

  const onFinished = useCallback(
    (late: boolean) => {
      keepAwake.stop();
      if (!late) {
        vibrate(HAPTIC.finish);
        if (sound.voice) {
          finishTimer.current = setTimeout(() => {
            speech.speak(FINISH_TEXT, sound.volume);
            log({ type: 'speak', what: FINISH_TEXT });
          }, 2100); // na de slotmelodie
        }
      }
    },
    [sound.voice, sound.volume],
  );

  const tick = useCallback(() => {
    const now = Date.now();
    const changes = session.update();
    for (const c of changes) {
      if (c.to === -1) {
        onFinished(c.late);
      } else if (!c.late && sound.vibrate) {
        const p = session.phases[c.to]!;
        vibrate(p.type === 'work' ? HAPTIC.work : HAPTIC.rest);
      }
    }

    // Alleen inplannen als de app zichtbaar is (op de achtergrond zou geluid te laat klinken).
    if (session.status === 'running' && document.visibilityState === 'visible') {
      // Geluiden vooruit inplannen op de audioklok.
      for (const cue of soundCues) {
        if (cue.phase < session.index) continue;
        const wall = session.phaseStartAt(cue.phase) + cue.at * 1000;
        const dt = wall - now;
        if (dt > LOOKAHEAD_MS || dt < -LATE_MS) continue;
        const key = `${cue.phase}:${cue.kind}:${cue.at}`;
        if (audio.ready && audio.schedule(key, cue.kind, wall)) log({ type: 'sound', what: cue.kind, at: wall });
      }
      // Aankondiging in de huidige rust/aftelfase.
      const phase = session.phase!;
      for (const cue of speechCues) {
        if (cue.phase !== session.index) continue;
        const key = String(cue.phase);
        if (spoken.current.has(key)) continue;
        const wall = session.phaseStartAt(cue.phase) + cue.at * 1000;
        if (now < wall) continue;
        spoken.current.add(key);
        const phaseEnd = session.phaseStartAt(cue.phase) + phase.durationSec * 1000;
        const fitsBeforeBeeps = now + cue.estSec * 1000 <= phaseEnd - BEEP_WINDOW * 1000 + 250;
        if (now - wall < 1500 && (fitsBeforeBeeps || cue.at <= 1)) {
          speech.speak(cue.text, sound.volume);
          log({ type: 'speak', what: cue.text, at: wall });
        }
      }
    }

    refresh();
    frameListeners.current.forEach((f) => f());
  }, [session, soundCues, speechCues, sound.vibrate, sound.volume, onFinished, refresh]);

  // De lus: elke animatieframe, plus een vangnet-interval (rAF kan gepauzeerd zijn).
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(tick, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, [tick]);

  // Wegschakelen / scherm op slot / telefoontje: geplande geluiden weg; bij terugkomen alles opnieuw.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        cancelPlanned('verborgen');
        return;
      }
      void audio.resume().then((ok) => {
        if (!ok && (sound.beeps || sound.whistle) && session.status === 'running') setNeedsTap(true);
      });
      tick();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onVis);
    };
  }, [cancelPlanned, tick, session, sound.beeps, sound.whistle]);

  // Geluid onderbroken (bv. door een telefoontje) terwijl de app zichtbaar is: om een tik vragen.
  useEffect(() => {
    const iv = setInterval(() => {
      if (session.status !== 'running' || document.visibilityState !== 'visible') return;
      if (audio.state !== 'running' && audio.state !== 'none' && (sound.beeps || sound.whistle)) {
        void audio.resume().then((ok) => !ok && setNeedsTap(true));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [session, sound.beeps, sound.whistle]);

  // Opruimen bij verlaten.
  useEffect(
    () => () => {
      clearTimeout(finishTimer.current);
      audio.cancelAll();
      speech.cancel();
      keepAwake.stop();
    },
    [],
  );

  const controls = useMemo(
    () => ({
      start() {
        session.start();
        tick();
      },
      pause() {
        session.pause();
        cancelPlanned('pauze');
        refresh();
      },
      resume() {
        session.resume();
        tick();
      },
      skip() {
        cancelPlanned('overslaan');
        spoken.current.clear();
        const c = session.skip();
        if (c?.to === -1) {
          onFinished(false);
          if (audio.ready && sound.whistle) audio.playNow('finish');
        }
        tick();
      },
      prev() {
        cancelPlanned('vorige');
        spoken.current.clear();
        session.prev();
        tick();
      },
      stop() {
        cancelPlanned('stoppen');
        session.stop();
        keepAwake.stop();
        refresh();
      },
      /** Na een onderbreking: tik om geluid weer aan te zetten. */
      reactivate() {
        void audio.resume().then((ok) => setNeedsTap(!ok));
        keepAwake.start();
        tick();
      },
    }),
    [session, tick, cancelPlanned, refresh, onFinished, sound.whistle],
  );

  /** Voor de voortgangsring: aanroepen per frame. */
  const onFrame = useCallback((fn: () => void) => {
    frameListeners.current.add(fn);
    return () => {
      frameListeners.current.delete(fn);
    };
  }, []);

  return { phases, session, snap, controls, needsTap, setNeedsTap, onFrame };
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Workout } from '../../model/types';
import type { Phase } from '../../model/timeline';
import { useStore } from '../../storage/store';
import { appStateStore, getWorkout, settingsStore } from '../../storage/data';
import { isIOS } from '../../engine/platform';
import { createDevWorkout, DEV_WORKOUT_ID } from '../../data/devWorkout';
import { getExercise } from '../../data/exercises';
import { formatClock, formatShort } from '../../model/format';
import { goBack } from '../../router';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/Sheet';
import { useOverlay } from '../../components/overlay';
import { ExerciseVisual } from '../../components/ExerciseThumb';
import { mediaPrepared, prepareWorkoutMedia } from '../../engine/media';
import { Placeholder } from '../Placeholder';
import { usePlayer } from './usePlayer';

/** Welke kant (links/rechts) hoort bij deze oefening? */
function sideOf(e: { libraryId?: string; name: string }): 'links' | 'rechts' | null {
  if (e.libraryId?.endsWith('-left')) return 'links';
  if (e.libraryId?.endsWith('-right')) return 'rechts';
  const m = /\b(links|rechts)\b/i.exec(e.name);
  return m ? (m[1]!.toLowerCase() as 'links' | 'rechts') : null;
}

export function Player({ id, devMode }: { id: string; devMode: boolean }) {
  const workout = useMemo(() => (id === DEV_WORKOUT_ID && devMode ? createDevWorkout() : getWorkout(id)), [id, devMode]);
  if (!workout || workout.exercises.length === 0) {
    return <Placeholder title="Workout" text="Deze workout bestaat niet (meer)." />;
  }
  return <PlayerView workout={workout} devMode={devMode} />;
}

function PlayerView({ workout, devMode }: { workout: Workout; devMode: boolean }) {
  const settings = useStore(settingsStore);
  const { phases, session, snap, controls, needsTap, setNeedsTap, onFrame, awaySec, clearAway } = usePlayer(workout, settings, devMode);
  const [showTips, setShowTips] = useState(() => !appStateStore.get().playerTipsSeen);
  const [confirmStop, setConfirmStop] = useState(false);
  const [wasRunning, setWasRunning] = useState(false);
  const [startTap, setStartTap] = useState(() => !mediaPrepared());

  // Automatisch starten als er op Start is getikt (geluid ontgrendeld); anders eerst een tik vragen.
  useEffect(() => {
    if (!startTap && !showTips && snap.status === 'ready') controls.start();
  }, [startTap, showTips, snap.status, controls]);

  // Melding na terugkomen verdwijnt vanzelf na 8 seconden.
  useEffect(() => {
    if (awaySec === null) return;
    const t = setTimeout(clearAway, 8000);
    return () => clearTimeout(t);
  }, [awaySec, clearAway]);

  const running = snap.status === 'running';
  const paused = snap.status === 'paused';
  const finished = snap.status === 'finished';

  const askStop = () => {
    setWasRunning(running);
    if (running) controls.pause();
    setConfirmStop(true);
  };

  // Android-terugknop / veeg-terug tijdens de workout: eerst vragen.
  useOverlay(!finished && !confirmStop, askStop);

  // Statusbalkkleur (Android) mee laten kleuren met de fase.
  const phase = phases[snap.index];
  useEffect(() => {
    if (!phase) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    const color = getComputedStyle(document.documentElement).getPropertyValue(finished ? '--work' : `--${phaseVar(phase.type)}`).trim();
    if (meta && color) meta.setAttribute('content', color);
    return () => {
      if (meta && prev) meta.setAttribute('content', prev);
    };
  }, [phase, finished]);

  if (finished) {
    return <FinishedView workout={workout} activeSec={session.activeSec()} workSec={session.totalWorkSec()} />;
  }
  if (!phase) return null;

  const total = phases.length;
  const exCount = workout.exercises.length;
  const next = phase.exercise;
  const side = sideOf(next);
  const lib = getExercise(next.libraryId);
  const isWork = phase.type === 'work';

  const label =
    phase.type === 'countdown' ? 'Maak je klaar' : phase.type === 'work' ? next.name : phase.type === 'roundRest' ? 'Rondepauze' : 'Rust';

  return (
    <div className={`player player--${phaseVar(phase.type)}${paused ? ' is-paused' : ''}`}>
      <header className="player__top">
        <button type="button" className="player__icon-btn" aria-label="Workout stoppen" onClick={askStop}>
          <Icon name="close" size={26} />
        </button>
        <div className="player__meta">
          <span>
            Ronde {phase.round + 1}/{workout.rounds}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Oefening {phase.exerciseIndex + 1}/{exCount}
          </span>
        </div>
        <span className="player__icon-spacer" />
      </header>
      <OverallProgress phases={phases} session={session} onFrame={onFrame} />

      <div className="player__stage">
        <div className="player__heading">
          <h1 className={`player__label${isWork ? ' player__label--name' : ''}`}>{label}</h1>
          {!isWork && (
            <p className="player__next">
              {phase.type === 'countdown' ? 'Eerste oefening' : 'Volgende'}: <strong>{next.name}</strong>
              <span className="player__next-time"> · {formatShort(next.workSec)}</span>
            </p>
          )}
          {side && (
            <span className={`player__side player__side--${side}`}>
              <Icon name="back" size={18} className={side === 'rechts' ? 'flip' : undefined} />
              {side.toUpperCase()}
            </span>
          )}
        </div>

        <div className="player__visual">
          <ExerciseVisual exercise={next} animate />
        </div>

        <div className="player__timer-wrap">
          <Ring phase={phase} session={session} onFrame={onFrame} />
          <div className="player__timer" aria-live="off">
            <span className="player__digits">{snap.secLeft >= 60 ? formatClock(snap.secLeft) : snap.secLeft}</span>
          </div>
        </div>

        {!isWork && lib && <p className="player__instruction">{lib.instruction}</p>}
      </div>

      <footer className="player__controls">
        <button type="button" className="player__ctrl" aria-label="Vorige" onClick={controls.prev} disabled={snap.index === 0}>
          <Icon name="skipBack" size={30} />
        </button>
        <button
          type="button"
          className="player__ctrl player__ctrl--main"
          aria-label={paused ? 'Verder' : 'Pauze'}
          onClick={paused ? controls.resume : controls.pause}
        >
          <Icon name={paused ? 'play' : 'pause'} size={40} />
        </button>
        <button type="button" className="player__ctrl" aria-label="Overslaan" onClick={controls.skip}>
          <Icon name="skipForward" size={30} />
        </button>
      </footer>

      {paused && !confirmStop && (
        <div className="player__pause" onClick={controls.resume}>
          <p className="player__pause-title">Gepauzeerd</p>
          <Button variant="primary" size="lg" icon="play" className="player__pause-btn" onClick={controls.resume}>
            Verder
          </Button>
          <Button
            variant="ghost"
            className="player__pause-stop"
            onClick={(e) => {
              e.stopPropagation();
              askStop();
            }}
          >
            Stoppen
          </Button>
        </div>
      )}

      {awaySec !== null && running && (
        <div className="player__notice" role="status">
          <p>De workout is doorgelopen terwijl je weg was ({formatActive(awaySec)}).</p>
          <Button
            variant="primary"
            icon="pause"
            onClick={() => {
              controls.pause();
              clearAway();
            }}
          >
            Pauzeren
          </Button>
          <Button variant="ghost" onClick={clearAway}>
            Doorgaan
          </Button>

        </div>
      )}

      {showTips && (
        <div className="player__tips" role="dialog" aria-modal="true" aria-labelledby="tips-title">
          <div className="player__tips-card">
            <h2 id="tips-title">Goed om te weten</h2>
            <ul className="player__tips-list">
              <li>
                <span className="player__tips-icon">
                  <Icon name="phone" size={24} />
                </span>
                <span>
                  Vergrendel je telefoon niet tijdens een workout, anders hoor je de geluiden niet. Het scherm blijft
                  vanzelf aan.
                </span>
              </li>
              {isIOS && (
                <li>
                  <span className="player__tips-icon">
                    <Icon name="sound" size={24} />
                  </span>
                  <span>
                    Hoor je geen piepjes? Zet de stil-knop aan de zijkant van je iPhone uit, of zet in Instellingen{' '}
                    <strong>Geluid altijd laten klinken</strong> aan.
                  </span>
                </li>
              )}
              <li>
                <span className="player__tips-icon">
                  <Icon name="pause" size={24} />
                </span>
                <span>Even stoppen? Tik op de pauzeknop. Met ✕ stop je de workout.</span>
              </li>
            </ul>
            <Button
              variant="primary"
              size="lg"
              icon="play"
              block
              onClick={() => {
                prepareWorkoutMedia();
                appStateStore.set((s) => ({ ...s, playerTipsSeen: true }));
                setStartTap(false);
                setShowTips(false);
              }}
            >
              Begrepen, start!
            </Button>
          </div>
        </div>
      )}

      {!showTips && (startTap || needsTap) && (
        <button
          type="button"
          className="player__tap"
          onClick={() => {
            prepareWorkoutMedia();
            if (startTap) setStartTap(false);
            else {
              controls.reactivate();
              setNeedsTap(false);
            }
          }}
        >
          <span className="player__tap-icon">
            <Icon name={startTap ? 'play' : 'sound'} size={44} />
          </span>
          <span className="player__tap-title">{startTap ? 'Tik om te starten' : 'Tik om het geluid weer aan te zetten'}</span>
          {!startTap && <span className="player__tap-hint">Het geluid werd onderbroken, bijvoorbeeld door een telefoontje.</span>}
        </button>
      )}

      <ConfirmDialog
        open={confirmStop}
        title="Workout stoppen?"
        message={`Je hebt ${formatActive(session.activeSec())} getraind.`}
        cancelLabel="Doorgaan"
        confirmLabel="Stoppen"
        danger
        onCancel={() => {
          setConfirmStop(false);
          if (wasRunning) controls.resume();
        }}
        onConfirm={() => {
          setConfirmStop(false);
          controls.stop();
        }}
      />

      {devMode && <span className="player__debug">{total} fases</span>}
    </div>
  );
}

function phaseVar(type: Phase['type']): string {
  return type === 'roundRest' ? 'round-rest' : type;
}

function formatActive(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} seconden`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} min ${r} s` : `${m} ${m === 1 ? 'minuut' : 'minuten'}`;
}

/** Cirkelvormige voortgangsring rond de timer (per frame bijgewerkt, zonder React-renders). */
function Ring({ phase, session, onFrame }: { phase: Phase; session: ReturnType<typeof usePlayer>['session']; onFrame: (f: () => void) => () => void }) {
  const ref = useRef<SVGCircleElement>(null);
  const R = 46;
  const C = 2 * Math.PI * R;
  useEffect(
    () =>
      onFrame(() => {
        const frac = phase.durationSec > 0 ? Math.min(1, session.elapsed() / phase.durationSec) : 1;
        ref.current?.setAttribute('stroke-dashoffset', String(C * frac));
      }),
    [onFrame, phase, session, C],
  );
  return (
    <svg className="player__ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={R} className="player__ring-track" />
      <circle
        ref={ref}
        cx="50"
        cy="50"
        r={R}
        className="player__ring-fill"
        strokeDasharray={C}
        strokeDashoffset={0}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

/** Dunne balk bovenin: voortgang van de hele workout. */
function OverallProgress({ phases, session, onFrame }: { phases: Phase[]; session: ReturnType<typeof usePlayer>['session']; onFrame: (f: () => void) => () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const totals = useMemo(() => {
    const starts: number[] = [];
    let t = 0;
    for (const p of phases) {
      starts.push(t);
      t += p.durationSec;
    }
    return { starts, total: t };
  }, [phases]);
  useEffect(
    () =>
      onFrame(() => {
        const i = session.index;
        const done = (totals.starts[i] ?? 0) + Math.min(session.elapsed(), phases[i]?.durationSec ?? 0);
        if (ref.current) ref.current.style.transform = `scaleX(${totals.total ? done / totals.total : 0})`;
      }),
    [onFrame, session, totals, phases],
  );
  return (
    <div className="player__progress" aria-hidden="true">
      <div ref={ref} className="player__progress-fill" />
    </div>
  );
}

/** Tijdelijk eindscherm (het feestelijke overzicht komt in stap 6). */
function FinishedView({ workout, activeSec, workSec }: { workout: Workout; activeSec: number; workSec: number }) {
  return (
    <div className="player player--done">
      <div className="player__done">
        <div className="player__done-icon">🎉</div>
        <h1 className="player__label">Klaar!</h1>
        <p className="player__done-text">
          {workout.name}: {formatActive(activeSec)} getraind, waarvan {formatActive(workSec)} werk.
        </p>
        <Button variant="secondary" size="lg" icon="home" onClick={() => goBack()}>
          Naar Home
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '../storage/store';
import { appStateStore, deleteWorkout, duplicateWorkout, historyStore, workoutsStore } from '../storage/data';
import type { HistoryEntry, Workout } from '../model/types';
import { currentStreak, entriesThisWeek } from '../model/stats';
import { WeekDots } from '../components/WeekDots';
import { DevHistorySheet } from './progress/DevHistorySheet';
import { totalDurationSec } from '../model/timeline';
import { formatDay, formatTotal, plural } from '../model/format';
import { navigate } from '../router';
import { Button, IconButton } from '../components/Button';
import { Icon } from '../components/Icon';
import { ConfirmDialog, Sheet, SheetAction } from '../components/Sheet';
import { ExerciseThumb } from '../components/ExerciseThumb';
import { showToast } from '../components/Toast';
import { applyUpdate, useUpdateState } from '../engine/update';
import { prepareWorkoutMedia } from '../engine/media';
import { setDevMode } from '../engine/devMode';
import { DEV_WORKOUT_ID } from '../data/devWorkout';
import { useEffect, useRef } from 'react';
import { ShareSheet } from './share/ShareSheet';
import { ImportSheet } from './share/ImportSheet';
import { takeHighlight } from './share/addWorkout';
import { APP_NAME } from '../config';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export function Home({ devMode = false }: { devMode?: boolean }) {
  const workouts = useStore(workoutsStore);
  const app = useStore(appStateStore);
  const update = useUpdateState();

  const [menuFor, setMenuFor] = useState<Workout | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Workout | null>(null);
  const [shareFor, setShareFor] = useState<Workout | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [devHistoryOpen, setDevHistoryOpen] = useState(false);
  const history = useStore(historyStore);
  // Net toegevoegde workout kort laten oplichten.
  const [highlight, setHighlight] = useState<string | null>(() => takeHighlight());
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 3500);
    return () => clearTimeout(t);
  }, [highlight]);
  // Verborgen: 7× snel op het logo tikken zet de ontwikkelaarsmodus aan/uit (niet per ongeluk te doen).
  const logoTaps = useRef<number[]>([]);
  const onLogoTap = () => {
    const now = Date.now();
    logoTaps.current = [...logoTaps.current.filter((t) => now - t < 3000), now];
    if (logoTaps.current.length >= 7) {
      logoTaps.current = [];
      setDevMode(!devMode);
    }
  };

  return (
    <div className="screen screen--home">
      <header className="home-header">
        <div className="home-header__brand">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="home-header__logo" onClick={onLogoTap} />
          <div>
            <p className="home-header__greeting">{greeting()}!</p>
            <h1 className="home-header__title">{APP_NAME}</h1>
          </div>
        </div>
        <IconButton icon="settings" label="Instellingen" onClick={() => navigate('/instellingen')} />
      </header>

      <main className="home-main">
        {update.needRefresh && (
          <div className="banner banner--accent">
            <Icon name="sparkle" />
            <p>Er is een nieuwe versie van de app.</p>
            <Button variant="primary" onClick={applyUpdate}>
              Bijwerken
            </Button>
          </div>
        )}

        {!app.welcomeDismissed && (
          <section className="card card--welcome">
            <h2>Welkom! 👋</h2>
            <p>
              We hebben alvast twee voorbeeldworkouts voor je klaargezet. Tik op <strong>Start</strong> om er één te
              proberen, of maak je eigen workout met <strong>Nieuwe workout</strong>.
            </p>
            <Button
              variant="secondary"
              onClick={() => appStateStore.set((s) => ({ ...s, welcomeDismissed: true }))}
            >
              Begrepen
            </Button>
          </section>
        )}

        {devMode && (
          <section className="card card--dev">
            <h2>Ontwikkelaarsmodus</h2>
            <div className="card--dev__actions">
              <Button
                variant="primary"
                icon="play"
                onClick={() => {
                  prepareWorkoutMedia();
                  navigate(`/speel/${DEV_WORKOUT_ID}`);
                }}
              >
                Test-workout (3× 10 s, 2 rondes)
              </Button>
              <Button variant="secondary" onClick={() => navigate('/galerij')}>
                Galerij
              </Button>
              <Button variant="secondary" icon="chart" onClick={() => setDevHistoryOpen(true)}>
                Nep-geschiedenis
              </Button>
              <Button variant="ghost" onClick={() => setDevMode(false)}>
                Uitzetten
              </Button>
            </div>
          </section>
        )}

        {history.length > 0 && <StreakCard history={history} />}

        <div className="section-head">
          <h2>Mijn workouts</h2>
          <span className="section-head__count">{workouts.length}</span>
        </div>

        {workouts.length === 0 ? (
          <div className="empty">
            <div className="empty__art" aria-hidden="true">
              <Icon name="clock" size={40} />
            </div>
            <h3>Nog geen workouts</h3>
            <p>Maak je eerste workout en kies zelf de oefeningen en tijden.</p>
          </div>
        ) : (
          <>
          <ul className="workout-list">
            {workouts.map((w, i) => (
              <WorkoutCard key={w.id} workout={w} index={i} isNew={w.id === highlight} onMore={() => setMenuFor(w)} />
            ))}
          </ul>
          </>
        )}

        <button type="button" className="import-btn" onClick={() => setImportOpen(true)}>
          <span className="import-btn__icon">
            <Icon name="download" size={24} />
          </span>
          <span>
            <strong>Workout importeren</strong>
            <small>Heb je een workout gekregen? Plak hier de link.</small>
          </span>
        </button>
      </main>

      <div className="bottom-bar">
        <Button variant="primary" size="lg" icon="plus" block onClick={() => navigate('/workout/nieuw')}>
          Nieuwe workout
        </Button>
      </div>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        <div className="sheet-actions">
          <SheetAction
            icon="copy"
            label="Dupliceren"
            hint="Maak een kopie om aan te passen"
            onClick={() => {
              if (menuFor) duplicateWorkout(menuFor.id);
              setMenuFor(null);
              showToast('Kopie gemaakt');
            }}
          />
          <SheetAction
            icon="share"
            label="Delen"
            hint="Stuur deze workout naar iemand anders"
            onClick={() => {
              setShareFor(menuFor);
              setMenuFor(null);
            }}
          />
          <SheetAction
            icon="trash"
            label="Verwijderen"
            danger
            onClick={() => {
              setConfirmDelete(menuFor);
              setMenuFor(null);
            }}
          />
        </div>
      </Sheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Workout verwijderen?"
        message={
          <>
            <strong>{confirmDelete?.name}</strong> wordt definitief verwijderd. Dit kun je niet ongedaan maken.
          </>
        }
        confirmLabel="Verwijderen"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteWorkout(confirmDelete.id);
          setConfirmDelete(null);
          showToast('Workout verwijderd');
        }}
      />

      <ShareSheet workout={shareFor} onClose={() => setShareFor(null)} />
      {devMode && <DevHistorySheet open={devHistoryOpen} onClose={() => setDevHistoryOpen(false)} />}
      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onAdded={(w) => {
          setImportOpen(false);
          setHighlight(w.id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`${w.name} staat nu bovenaan je lijst`);
        }}
      />
    </div>
  );
}

/** Reeks-blokje: dagen op rij en deze week; tik voor Mijn voortgang. */
function StreakCard({ history }: { history: HistoryEntry[] }) {
  const streak = currentStreak(history);
  const week = entriesThisWeek(history).length;
  const last = history[history.length - 1]!;
  return (
    <button type="button" className="streak-card" onClick={() => navigate('/voortgang')}>
      <span className="streak-card__head">
        <span className={`streak-badge${streak === 0 ? ' is-off' : ''}`}>
          <Icon name="flame" size={22} />
          <b>{streak}</b>
        </span>
        <span className="streak-card__text">
          <strong>{streak === 0 ? 'Mijn voortgang' : streak === 1 ? '1 dag op rij' : `${streak} dagen op rij`}</strong>
          <small>
            {streak === 0
              ? `Laatste workout: ${formatDay(new Date(last.date)).toLowerCase()}`
              : `${plural(history.length, 'workout', 'workouts')} · deze week ${week}×`}
          </small>
        </span>
        <Icon name="chevron" size={20} className="streak-card__chevron" />
      </span>
      <WeekDots entries={history} compact />
    </button>
  );
}

function WorkoutCard({ workout, index, isNew, onMore }: { workout: Workout; index: number; isNew?: boolean; onMore: () => void }) {
  const total = totalDurationSec(workout);
  const count = workout.exercises.length;
  const maxThumbs = 6;
  const extra = count - maxThumbs;
  return (
    <li className={`workout-card${isNew ? ' is-new' : ''}`} style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
      <div className="workout-card__head">
        <h3 className="workout-card__name">{workout.name}</h3>
        <IconButton icon="more" label={`Meer opties voor ${workout.name}`} onClick={onMore} className="icon-btn--quiet" />
      </div>
      <p className="workout-card__meta">
        <span>
          <Icon name="list" size={18} /> {plural(count, 'oefening', 'oefeningen')}
        </span>
        <span>
          <Icon name="repeat" size={18} /> {plural(workout.rounds, 'ronde', 'rondes')}
        </span>
        <span>
          <Icon name="clock" size={18} /> {formatTotal(total)}
        </span>
      </p>
      {count > 0 && (
        <div className="workout-card__thumbs">
          {workout.exercises.slice(0, maxThumbs).map((e) => (
            <ExerciseThumb key={e.id} exercise={e} size={40} />
          ))}
          {extra > 0 && <span className="thumb thumb--more">+{extra}</span>}
        </div>
      )}
      <div className="workout-card__actions">
        <Button
          variant="primary"
          size="lg"
          icon="play"
          className="workout-card__start"
          disabled={count === 0}
          onClick={() => {
            // In dezelfde tik: geluid, spraak en scherm-aan ontgrendelen (nodig op iPhone).
            prepareWorkoutMedia();
            navigate(`/speel/${workout.id}`);
          }}
        >
          Start
        </Button>
        <Button variant="secondary" size="lg" icon="edit" onClick={() => navigate(`/workout/${workout.id}`)}>
          Bewerken
        </Button>
      </div>
    </li>
  );
}

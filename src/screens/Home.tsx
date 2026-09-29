import { useState } from 'react';
import { useStore } from '../storage/store';
import { appStateStore, deleteWorkout, duplicateWorkout, workoutsStore } from '../storage/data';
import type { Workout } from '../model/types';
import { totalDurationSec } from '../model/timeline';
import { formatTotal, plural } from '../model/format';
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
import { useRef } from 'react';
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
  // Verborgen: 5× snel op het logo tikken zet de ontwikkelaarsmodus aan/uit.
  const logoTaps = useRef<number[]>([]);
  const onLogoTap = () => {
    const now = Date.now();
    logoTaps.current = [...logoTaps.current.filter((t) => now - t < 2500), now];
    if (logoTaps.current.length >= 5) {
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
              <Button variant="ghost" onClick={() => setDevMode(false)}>
                Uitzetten
              </Button>
            </div>
          </section>
        )}

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
          <ul className="workout-list">
            {workouts.map((w, i) => (
              <WorkoutCard key={w.id} workout={w} index={i} onMore={() => setMenuFor(w)} />
            ))}
          </ul>
        )}
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
              setMenuFor(null);
              showToast('Delen komt in een volgende stap');
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
    </div>
  );
}

function WorkoutCard({ workout, index, onMore }: { workout: Workout; index: number; onMore: () => void }) {
  const total = totalDurationSec(workout);
  const count = workout.exercises.length;
  const maxThumbs = 6;
  const extra = count - maxThumbs;
  return (
    <li className="workout-card" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
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

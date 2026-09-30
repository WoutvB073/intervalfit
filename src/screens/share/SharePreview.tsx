import { useMemo } from 'react';
import { decodeWorkout } from '../../storage/share';
import { navigate, goBack } from '../../router';
import { Button, IconButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { WorkoutPreviewCard } from './WorkoutPreviewCard';
import { useAddWorkout } from './addWorkout';

/** Een gedeelde link, geopend in de app zelf: voorbeeld en "Toevoegen". */
export function SharePreview({ code }: { code: string }) {
  const workout = useMemo(() => decodeWorkout(code), [code]);
  const { add, dialog } = useAddWorkout((w) => {
    navigate('/', { replace: true });
    showToast(`${w.name} staat nu bovenaan je lijst`);
  });

  return (
    <div className="screen share-preview">
      <header className="top-bar">
        <IconButton icon="back" label="Terug" onClick={() => goBack()} />
        <h1 className="top-bar__title">Gedeelde workout</h1>
        <span className="top-bar__spacer" />
      </header>
      <main className="share-preview__main">
        {workout ? (
          <>
            <div className="card">
              <WorkoutPreviewCard workout={workout} eyebrow={<><Icon name="sparkle" size={18} /> Je hebt een workout gekregen</>} />
            </div>
            <Button variant="primary" size="lg" icon="plus" block onClick={() => add(workout)}>
              Toevoegen aan mijn workouts
            </Button>
            <Button variant="ghost" block onClick={() => navigate('/', { replace: true })}>
              Niet toevoegen
            </Button>
          </>
        ) : (
          <div className="card">
            <h2 className="wpreview__name">Deze link werkt niet</h2>
            <p className="settings-text">De link is waarschijnlijk niet helemaal meegekomen. Vraag de afzender om hem opnieuw te sturen.</p>
          </div>
        )}
      </main>
      {dialog}
    </div>
  );
}

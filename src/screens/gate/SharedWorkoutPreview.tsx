import { useMemo, useState } from 'react';
import { decodeWorkout } from '../../storage/share';
import { copyText, currentLink } from '../../engine/clipboard';
import { env } from '../../engine/platform';
import { openInChrome } from '../../engine/chrome';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { WorkoutPreviewCard } from '../share/WorkoutPreviewCard';
import { useAddWorkout } from '../share/addWorkout';
import { APP_NAME } from '../../config';

/**
 * Een gedeelde workout, geopend in de browser (niet in de app):
 * - Android (en andere): de browser deelt het geheugen met de geïnstalleerde app →
 *   "Toevoegen aan mijn workouts" zet hem direct in de app.
 * - iPhone: de app op het beginscherm heeft een eigen geheugen → kopiëren en in de app plakken.
 * - Android in een andere browser dan Chrome (Samsung Internet, Firefox, ingebouwde browsers…): die deelt het
 *   geheugen niet met de app (die via Chrome is geïnstalleerd) → openen in Chrome, of kopiëren en plakken.
 */
export function SharedWorkoutPreview({ code }: { code: string }) {
  const workout = useMemo(() => decodeWorkout(code), [code]);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const { add, dialog } = useAddWorkout(() => setAdded(true));
  const ios = env.os === 'ios';
  const otherAndroid = env.os === 'android' && env.browser !== 'chrome';

  if (!workout) {
    return (
      <section className="gate__card gate__card--warn">
        <h2 className="gate__card-title">Deze workoutlink werkt niet</h2>
        <p className="gate__intro">De link is waarschijnlijk niet helemaal meegekomen. Vraag de afzender om hem opnieuw te sturen.</p>
      </section>
    );
  }

  const onCopy = async () => {
    const ok = await copyText(currentLink());
    setCopied(ok);
    showToast(ok ? 'Gekopieerd! Open nu IntervalFit op je beginscherm.' : 'Kopiëren lukte niet. Probeer het nog eens.');
  };

  return (
    <section className="gate__card gate-share" aria-label="Gedeelde workout">
      <WorkoutPreviewCard workout={workout} eyebrow={<><Icon name="sparkle" size={18} /> Je hebt een workout gekregen</>} />

      {ios ? (
        <div className="gate-share__how">
          <h3>Zo zet je hem in de app</h3>
          <ol className="gate-share__steps">
            <li>
              Tik hieronder op <strong>Kopieer voor de app</strong>.
            </li>
            <li>
              Open <strong>{APP_NAME}</strong> via het icoon op je beginscherm.
            </li>
            <li>
              Tik op <strong>Workout importeren</strong> en dan op <strong>Plakken</strong>.
            </li>
          </ol>
          <Button variant={copied ? 'secondary' : 'primary'} size="lg" icon={copied ? 'check' : 'copy'} block onClick={onCopy}>
            {copied ? 'Gekopieerd' : 'Kopieer voor de app'}
          </Button>
          <p className="gate-share__note">Heb je de app nog niet? Installeer hem eerst met de stappen hieronder.</p>
        </div>
      ) : otherAndroid ? (
        <div className="gate-share__how">
          <h3>Zo zet je hem in de app</h3>
          <Button variant="primary" size="lg" icon="compass" block onClick={() => openInChrome(code)}>
            Openen in Chrome
          </Button>
          <p className="gate-share__note">
            In Chrome tik je op <strong>Toevoegen aan mijn workouts</strong>. Lukt dat niet? Kopieer de workout en kies in{' '}
            {APP_NAME} <strong>Workout importeren</strong> → <strong>Plakken</strong>.
          </p>
          <Button variant="secondary" size="lg" icon={copied ? 'check' : 'copy'} block onClick={onCopy}>
            {copied ? 'Gekopieerd' : 'Kopieer voor de app'}
          </Button>
        </div>
      ) : added ? (
        <div className="gate-share__done">
          <Icon name="check" size={26} />
          <p>
            Toegevoegd! Open <strong>{APP_NAME}</strong> via het icoon op je startscherm; de workout staat bovenaan. Nog geen app?
            Installeer hem hieronder.
          </p>
        </div>
      ) : (
        <div className="gate-share__how">
          <Button variant="primary" size="lg" icon="plus" block onClick={() => add(workout)}>
            Toevoegen aan mijn workouts
          </Button>
          <p className="gate-share__note">De workout komt dan in {APP_NAME} op deze telefoon. Nog geen app? Installeer hem hieronder.</p>
        </div>
      )}
      {dialog}
    </section>
  );
}

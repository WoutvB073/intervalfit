import { useMemo, useState } from 'react';
import { decodeWorkout } from '../../storage/share';
import { totalDurationSec } from '../../model/timeline';
import { formatShort, formatTotal, plural } from '../../model/format';
import { copyText, currentLink } from '../../engine/clipboard';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { ExerciseThumb } from '../../components/ExerciseThumb';
import { showToast } from '../../components/Toast';
import { APP_NAME } from '../../config';

const MAX_VISIBLE = 8;

/** Voorbeeld van een gedeelde workout, getoond boven de installatiestappen. */
export function SharedWorkoutPreview({ code }: { code: string }) {
  const workout = useMemo(() => decodeWorkout(code), [code]);
  const [copied, setCopied] = useState(false);

  if (!workout) {
    return (
      <section className="gate__card gate__card--warn">
        <h2 className="gate__card-title">Deze workoutlink werkt niet</h2>
        <p className="gate__intro">
          De link is waarschijnlijk niet helemaal meegekomen. Vraag de afzender om hem opnieuw te sturen.
        </p>
      </section>
    );
  }

  const onCopy = async () => {
    const ok = await copyText(currentLink());
    setCopied(ok);
    showToast(ok ? 'Gekopieerd! Installeer nu de app hieronder.' : 'Kopiëren lukte niet. Probeer het nog eens.');
  };

  const extra = workout.exercises.length - MAX_VISIBLE;
  return (
    <section className="gate__card gate-share" aria-labelledby="share-title">
      <p className="gate-share__eyebrow">
        <Icon name="sparkle" size={18} /> Je hebt een workout gekregen
      </p>
      <h2 id="share-title" className="gate-share__name">
        {workout.name}
      </h2>
      <p className="gate-share__meta">
        {plural(workout.exercises.length, 'oefening', 'oefeningen')} · {plural(workout.rounds, 'ronde', 'rondes')} ·{' '}
        {formatTotal(totalDurationSec(workout))}
      </p>
      <ul className="gate-share__list">
        {workout.exercises.slice(0, MAX_VISIBLE).map((e) => (
          <li key={e.id}>
            <ExerciseThumb exercise={e} size={32} />
            <span className="gate-share__ex">{e.name}</span>
            <span className="gate-share__time">{formatShort(e.workSec)}</span>
          </li>
        ))}
        {extra > 0 && <li className="gate-share__more">en nog {extra} …</li>}
      </ul>
      <Button variant={copied ? 'secondary' : 'primary'} size="lg" icon={copied ? 'check' : 'copy'} block onClick={onCopy}>
        {copied ? 'Gekopieerd' : 'Kopieer voor de app'}
      </Button>
      <p className="gate-share__how">
        Installeer daarna {APP_NAME} met de stappen hieronder. Open de app, tik op <strong>Importeren</strong> en kies{' '}
        <strong>Plakken</strong>.
      </p>
    </section>
  );
}

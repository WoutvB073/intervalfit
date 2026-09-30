import type { Workout } from '../../model/types';
import { totalDurationSec } from '../../model/timeline';
import { formatShort, formatTotal, plural } from '../../model/format';
import { ExerciseThumb } from '../../components/ExerciseThumb';

const MAX_VISIBLE = 8;

/** Compact overzicht van een (gedeelde) workout: naam, duur en de oefeningen. */
export function WorkoutPreviewCard({ workout, eyebrow }: { workout: Workout; eyebrow?: React.ReactNode }) {
  const extra = workout.exercises.length - MAX_VISIBLE;
  return (
    <div className="wpreview">
      {eyebrow && <p className="wpreview__eyebrow">{eyebrow}</p>}
      <h2 className="wpreview__name">{workout.name}</h2>
      <p className="wpreview__meta">
        {plural(workout.exercises.length, 'oefening', 'oefeningen')} · {plural(workout.rounds, 'ronde', 'rondes')} ·{' '}
        {formatTotal(totalDurationSec(workout))}
      </p>
      <ul className="wpreview__list">
        {workout.exercises.slice(0, MAX_VISIBLE).map((e) => (
          <li key={e.id}>
            <ExerciseThumb exercise={e} size={36} />
            <span className="wpreview__ex">{e.name}</span>
            <span className="wpreview__time">{formatShort(e.workSec)}</span>
          </li>
        ))}
        {extra > 0 && <li className="wpreview__more">en nog {extra} …</li>}
      </ul>
    </div>
  );
}

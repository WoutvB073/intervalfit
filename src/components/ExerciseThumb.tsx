import { getExercise } from '../data/exercises';
import { hasAnimation } from '../figure/anim3d';
import { Figure } from '../figure/Figure';
import { usePhotoUrl } from '../storage/photos';
import type { WorkoutExercise } from '../model/types';

type Visual = Pick<WorkoutExercise, 'libraryId' | 'name' | 'photoId'>;

/**
 * Afbeelding van een oefening: eigen foto, anders het figuurtje, anders een letter-tegel.
 * `animate` = figuurtje laten bewegen (alleen waar dat nuttig is; lijsten staan stil).
 */
export function ExerciseVisual({ exercise, animate = false, className = '' }: { exercise: Visual; animate?: boolean; className?: string }) {
  const photo = usePhotoUrl(exercise.photoId);
  if (exercise.photoId && photo) {
    return <img src={photo} alt={exercise.name} className={`ex-visual ex-visual--photo ${className}`} />;
  }
  if (hasAnimation(exercise.libraryId)) {
    return (
      <div className={`ex-visual ex-visual--figure ${className}`}>
        <Figure exerciseId={exercise.libraryId} playing={animate} title={exercise.name} />
      </div>
    );
  }
  const lib = getExercise(exercise.libraryId);
  const letter = exercise.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className={`ex-visual ex-visual--letter thumb--${lib?.category ?? 'eigen'} ${className}`} aria-label={exercise.name}>
      <span>{letter}</span>
    </div>
  );
}

/** Klein vierkant plaatje (lijsten, kaarten). */
export function ExerciseThumb({ exercise, size = 40 }: { exercise: Visual; size?: number }) {
  return (
    <span className="thumb" style={{ width: size, height: size, fontSize: size * 0.42 }} title={exercise.name}>
      <ExerciseVisual exercise={exercise} />
    </span>
  );
}

import { useState } from 'react';
import type { Workout } from '../../model/types';
import { newId } from '../../model/id';
import { saveWorkout, workoutsStore } from '../../storage/data';
import { workoutSignature } from '../../storage/share';
import { ConfirmDialog } from '../../components/Sheet';

const HIGHLIGHT_KEY = 'intervalfit.highlight';

/** Workout toevoegen (bovenaan de lijst) en kort laten oplichten op Home. */
export function addImportedWorkout(w: Workout): Workout {
  const now = Date.now();
  const fresh: Workout = { ...w, id: newId(), exercises: w.exercises.map((e) => ({ ...e, id: newId() })), createdAt: now, updatedAt: now };
  saveWorkout(fresh); // nieuwe workouts komen bovenaan
  try {
    sessionStorage.setItem(HIGHLIGHT_KEY, fresh.id);
  } catch {
    /* niet erg */
  }
  return fresh;
}

/** Id van de workout die net is toegevoegd (eenmalig uit te lezen). */
export function takeHighlight(): string | null {
  try {
    const id = sessionStorage.getItem(HIGHLIGHT_KEY);
    sessionStorage.removeItem(HIGHLIGHT_KEY);
    return id;
  } catch {
    return null;
  }
}

export function findDuplicate(w: Workout): Workout | undefined {
  const sig = workoutSignature(w);
  return workoutsStore.get().find((x) => workoutSignature(x) === sig);
}

/**
 * Toevoegen met controle op dubbelen: staat dezelfde workout er al, dan eerst vragen
 * "Nog een keer toevoegen?". Geeft een functie en het dialoogvenster terug.
 */
export function useAddWorkout(onAdded: (w: Workout) => void) {
  const [pending, setPending] = useState<Workout | null>(null);
  const add = (w: Workout) => {
    if (findDuplicate(w)) setPending(w);
    else onAdded(addImportedWorkout(w));
  };
  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title="Nog een keer toevoegen?"
      message={
        <>
          <strong>{pending?.name}</strong> staat al in je lijst.
        </>
      }
      cancelLabel="Nee"
      confirmLabel="Ja, toevoegen"
      onCancel={() => setPending(null)}
      onConfirm={() => {
        const w = pending!;
        setPending(null);
        onAdded(addImportedWorkout(w));
      }}
    />
  );
  return { add, dialog };
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import type { Workout, WorkoutExercise } from '../../model/types';
import { newId } from '../../model/id';
import { restAfter, totalDurationSec } from '../../model/timeline';
import { formatClock, formatShort } from '../../model/format';
import { getWorkout, saveWorkout } from '../../storage/data';
import { goBack } from '../../router';
import { Button, IconButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Stepper, timeOptions } from '../../components/Stepper';
import { ExerciseThumb } from '../../components/ExerciseThumb';
import { showToast } from '../../components/Toast';
import { leaveOverlays, useOverlay } from '../../components/overlay';
import { canVibrate } from '../../engine/platform';
import { LibrarySheet, type NewExercise } from './LibrarySheet';
import { ExerciseSheet } from './ExerciseSheet';

function emptyWorkout(): Workout {
  const now = Date.now();
  return { id: newId(), name: '', exercises: [], restSec: 15, rounds: 2, roundRestSec: 60, createdAt: now, updatedAt: now };
}

/** Werkt de workout bij en maakt hem aan (id = undefined) of bewerkt een bestaande. */
export function Editor({ id }: { id?: string }) {
  const original = useMemo(() => (id ? getWorkout(id) : undefined), [id]);
  const [initial] = useState<Workout>(() => original ?? emptyWorkout());
  const [draft, setDraft] = useState<Workout>(initial);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const isNew = !original;

  // Terugknop van Android/veeg-terug met niet-opgeslagen wijzigingen: eerst vragen.
  useOverlay(dirty && !leaving, () => setLeaveOpen(true));

  // Pagina sluiten/verversen in de browser met wijzigingen: waarschuwen.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = (patch: Partial<Workout>) => setDraft((d) => ({ ...d, ...patch }));
  const setExercises = (fn: (list: WorkoutExercise[]) => WorkoutExercise[]) =>
    setDraft((d) => ({ ...d, exercises: fn(d.exercises) }));

  const total = totalDurationSec(draft);

  const validate = (): boolean => {
    if (!draft.name.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      nameRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      showToast('Geef je workout nog een naam.');
      return false;
    }
    if (draft.exercises.length === 0) {
      showToast('Voeg minstens één oefening toe.');
      return false;
    }
    return true;
  };

  const leave = (message?: string) => {
    setLeaving(true);
    setLeaveOpen(false);
    leaveOverlays(() => {
      goBack();
      if (message) showToast(message);
    });
  };

  const save = () => {
    if (!validate()) {
      setLeaveOpen(false);
      return;
    }
    saveWorkout({ ...draft, name: draft.name.trim() });
    leave(isNew ? 'Workout aangemaakt' : 'Wijzigingen opgeslagen');
  };

  const onBack = () => (dirty ? setLeaveOpen(true) : goBack());

  const addExercises = (items: NewExercise[]) => {
    setLibraryOpen(false);
    if (!items.length) return;
    setExercises((list) => [...list, ...items.map((i) => ({ id: newId(), ...i }))]);
    showToast(items.length === 1 ? `${items[0]!.name} toegevoegd` : `${items.length} oefeningen toegevoegd`);
  };

  const sensors = useSensors(
    // Alleen via de sleepgreep, en pas na even vasthouden: zo start slepen nooit per ongeluk tijdens scrollen.
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setExercises((list) => {
      const from = list.findIndex((x) => x.id === active.id);
      const to = list.findIndex((x) => x.id === over.id);
      return arrayMove(list, from, to);
    });
  };

  const editing = editIndex !== null ? draft.exercises[editIndex] ?? null : null;
  const count = draft.exercises.length;

  return (
    <div className="screen editor">
      <header className="top-bar">
        <IconButton icon="back" label="Terug" onClick={onBack} />
        <h1 className="top-bar__title">{isNew ? 'Nieuwe workout' : 'Workout bewerken'}</h1>
        <span className="top-bar__spacer" />
      </header>

      <main className="editor__main">
        <label className={`field field--name${nameError ? ' has-error' : ''}`}>
          <span className="field__label">Naam van de workout</span>
          <input
            ref={nameRef}
            className="field__input field__input--big"
            value={draft.name}
            maxLength={60}
            placeholder="Bijv. Ochtendtraining"
            enterKeyHint="done"
            onChange={(e) => {
              update({ name: e.target.value });
              if (e.target.value.trim()) setNameError(false);
            }}
          />
          {nameError && <span className="field__error">Geef je workout een naam, dan vind je hem later makkelijk terug.</span>}
        </label>

        <section className="card editor__settings" aria-label="Instellingen van de workout">
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">Rondes</span>
              <span className="setting-row__hint">Hoe vaak je het hele rondje doet</span>
            </div>
            <Stepper
              label="Rondes"
              value={draft.rounds}
              min={1}
              max={20}
              step={1}
              format={(v) => String(v)}
              onChange={(v) => update({ rounds: v })}
            />
          </div>
          <div className="setting-row">
            <div className="setting-row__text">
              <span className="setting-row__label">Rust tussen oefeningen</span>
              <span className="setting-row__hint">Per oefening aan te passen</span>
            </div>
            <Stepper
              label="Rust tussen oefeningen"
              value={draft.restSec}
              min={0}
              max={300}
              step={5}
              options={timeOptions(0, 300)}
              format={(v) => (v === 0 ? 'Geen' : formatShort(v))}
              onChange={(v) => update({ restSec: v })}
            />
          </div>
          <div className={`setting-row${draft.rounds < 2 ? ' is-muted' : ''}`}>
            <div className="setting-row__text">
              <span className="setting-row__label">Rust tussen rondes</span>
              <span className="setting-row__hint">{draft.rounds < 2 ? 'Alleen bij meer dan 1 ronde' : 'In plaats van de gewone rust'}</span>
            </div>
            <Stepper
              label="Rust tussen rondes"
              value={draft.roundRestSec}
              min={0}
              max={600}
              step={15}
              options={timeOptions(0, 600)}
              format={(v) => (v === 0 ? 'Geen' : formatShort(v))}
              onChange={(v) => update({ roundRestSec: v })}
              disabled={draft.rounds < 2}
            />
          </div>
        </section>

        <div className="section-head">
          <h2>Oefeningen</h2>
          <span className="section-head__count">{count}</span>
        </div>

        {count === 0 ? (
          <div className="editor__empty">
            <p>Nog geen oefeningen. Voeg je eerste oefening toe.</p>
          </div>
        ) : (
          <>
            {count > 1 && <p className="editor__tip">Tip: houd <Icon name="grip" size={16} className="inline-icon" /> even vast en sleep om de volgorde te veranderen.</p>}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={() => canVibrate && navigator.vibrate?.(12)}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={draft.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <ol className="ex-list">
                  {draft.exercises.map((e, i) => (
                    <ExerciseRow
                      key={e.id}
                      exercise={e}
                      detail={rowDetail(draft, i)}
                      onOpen={() => setEditIndex(i)}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </>
        )}

        <button type="button" className="add-ex" onClick={() => setLibraryOpen(true)}>
          <Icon name="plus" size={26} />
          <span>Oefening toevoegen</span>
        </button>
      </main>

      <div className="save-bar">
        <div className="save-bar__total">
          <span>Totale duur</span>
          <strong>{count ? `${formatClock(total)} min` : '–'}</strong>
        </div>
        <Button variant="primary" size="lg" icon="check" onClick={save}>
          Opslaan
        </Button>
      </div>

      <LibrarySheet open={libraryOpen} onClose={() => setLibraryOpen(false)} onAdd={addExercises} />

      <ExerciseSheet
        exercise={editing}
        index={editIndex ?? 0}
        count={count}
        defaultRest={draft.restSec}
        isLast={editIndex === count - 1}
        onClose={() => setEditIndex(null)}
        onChange={(ex) => setExercises((list) => list.map((x) => (x.id === ex.id ? ex : x)))}
        onMove={(dir) => {
          if (editIndex === null) return;
          const to = editIndex + dir;
          if (to < 0 || to >= count) return;
          setExercises((list) => arrayMove(list, editIndex, to));
          setEditIndex(to);
        }}
        onRemove={() => {
          if (editIndex === null) return;
          const name = draft.exercises[editIndex]?.name;
          setExercises((list) => list.filter((_, i) => i !== editIndex));
          setEditIndex(null);
          showToast(`${name} verwijderd`);
        }}
      />

      <LeaveDialog
        open={leaveOpen}
        onSave={save}
        onDiscard={() => leave()}
        onStay={() => setLeaveOpen(false)}
      />
    </div>
  );
}

function rowDetail(w: Workout, i: number): string {
  const e = w.exercises[i]!;
  const work = formatShort(e.workSec);
  if (i < w.exercises.length - 1) {
    const rest = restAfter(w, i);
    const own = e.restSec !== undefined;
    return `${work} · ${rest === 0 ? 'geen rust' : `${formatShort(rest)} rust`}${own ? ' (eigen)' : ''}`;
  }
  if (w.rounds > 1) return `${work} · daarna ${w.roundRestSec ? `${formatShort(w.roundRestSec)} rondepauze` : 'volgende ronde'}`;
  return `${work} · einde`;
}

function ExerciseRow({ exercise, detail, onOpen }: { exercise: WorkoutExercise; detail: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  });
  return (
    <li
      ref={setNodeRef}
      className={`ex-row${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="ex-row__grip"
        aria-label={`Versleep ${exercise.name}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={22} />
      </button>
      <button type="button" className="ex-row__main" onClick={onOpen}>
        <ExerciseThumb exercise={exercise} size={52} />
        <span className="ex-row__text">
          <span className="ex-row__name">{exercise.name}</span>
          <span className="ex-row__detail">{detail}</span>
        </span>
        <Icon name="chevron" size={20} className="ex-row__chevron" />
      </button>
    </li>
  );
}

/** "Wijzigingen bewaren?" met drie duidelijke keuzes. */
function LeaveDialog({ open, onSave, onDiscard, onStay }: { open: boolean; onSave: () => void; onDiscard: () => void; onStay: () => void }) {
  useOverlay(open, onStay);
  if (!open) return null;
  return createPortal(
    <div className="overlay overlay--center is-visible" onClick={onStay}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="leave-title" className="dialog__title">
          Wijzigingen bewaren?
        </h2>
        <p className="dialog__message">Je hebt deze workout aangepast. Wil je de wijzigingen bewaren?</p>
        <div className="dialog__stack">
          <Button variant="primary" size="lg" block onClick={onSave}>
            Bewaren
          </Button>
          <Button variant="secondary" size="lg" block onClick={onDiscard}>
            Niet bewaren
          </Button>
          <Button variant="ghost" block onClick={onStay}>
            Verder bewerken
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


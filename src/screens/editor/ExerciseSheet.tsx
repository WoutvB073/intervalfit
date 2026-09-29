import { useState } from 'react';
import type { WorkoutExercise } from '../../model/types';
import { getExercise } from '../../data/exercises';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Stepper, timeOptions } from '../../components/Stepper';
import { ExerciseVisual } from '../../components/ExerciseThumb';
import { showToast } from '../../components/Toast';
import { formatShort } from '../../model/format';
import { savePhoto } from '../../storage/photos';

const PRESETS = [20, 30, 45, 60];

type Props = {
  exercise: WorkoutExercise | null;
  index: number;
  count: number;
  /** Standaardrust van de workout (voor de uitleg bij "standaard"). */
  defaultRest: number;
  /** Is dit de laatste oefening van de ronde? Dan volgt de rondepauze, geen eigen rust. */
  isLast: boolean;
  onChange: (e: WorkoutExercise) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
};

/** Alles van één oefening aanpassen: naam, werktijd, eigen rust, foto, volgorde, verwijderen. */
export function ExerciseSheet({ exercise, index, count, defaultRest, isLast, onChange, onMove, onRemove, onClose }: Props) {
  const [busy, setBusy] = useState(false);

  const ex = exercise;
  const lib = getExercise(ex?.libraryId);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // zelfde foto later opnieuw kunnen kiezen
    if (!file || !ex) return;
    setBusy(true);
    try {
      const photoId = await savePhoto(file);
      onChange({ ...ex, photoId });
      showToast('Foto toegevoegd');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Foto toevoegen lukte niet.');
    } finally {
      setBusy(false);
    }
  };

  const customRest = ex?.restSec !== undefined;

  return (
    <Sheet open={!!ex} onClose={onClose} title="Oefening aanpassen" tall>
      {ex && (
        <div className="ex-sheet">
          <div className="ex-sheet__hero">
            <div className="ex-sheet__visual">
              <ExerciseVisual exercise={ex} animate />
              {busy && <div className="ex-sheet__busy">Foto verwerken…</div>}
            </div>
            {lib && <p className="ex-sheet__instruction">{lib.instruction}</p>}
          </div>

          <label className="field">
            <span className="field__label">Naam</span>
            <input
              className="field__input"
              value={ex.name}
              maxLength={60}
              enterKeyHint="done"
              onChange={(e) => onChange({ ...ex, name: e.target.value })}
              onBlur={() => {
                if (!ex.name.trim()) onChange({ ...ex, name: lib?.name ?? 'Oefening' });
              }}
            />
          </label>

          <div className="field">
            <span className="field__label">Werktijd</span>
            <Stepper
              label="Werktijd"
              value={ex.workSec}
              min={5}
              max={600}
              step={5}
              options={timeOptions(5, 600)}
              format={formatShort}
              onChange={(v) => onChange({ ...ex, workSec: v })}
            />
            <div className="presets" role="group" aria-label="Snelkeuze werktijd">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset${ex.workSec === p ? ' is-active' : ''}`}
                  onClick={() => onChange({ ...ex, workSec: p })}
                >
                  {p} s
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Rust na deze oefening</span>
            {isLast ? (
              <p className="field__hint">Na de laatste oefening volgt de rust tussen rondes (of het einde van de workout).</p>
            ) : (
              <>
                <div className="segmented" role="radiogroup" aria-label="Rust na deze oefening">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!customRest}
                    className={!customRest ? 'is-active' : ''}
                    onClick={() => {
                      const { restSec: _drop, ...rest } = ex;
                      onChange(rest);
                    }}
                  >
                    Standaard ({formatShort(defaultRest)})
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={customRest}
                    className={customRest ? 'is-active' : ''}
                    onClick={() => onChange({ ...ex, restSec: ex.restSec ?? defaultRest })}
                  >
                    Eigen tijd
                  </button>
                </div>
                {customRest && (
                  <Stepper
                    label="Eigen rusttijd"
                    value={ex.restSec!}
                    min={0}
                    max={300}
                    step={5}
                    options={timeOptions(0, 300)}
                    format={(v) => (v === 0 ? 'Geen rust' : formatShort(v))}
                    onChange={(v) => onChange({ ...ex, restSec: v })}
                  />
                )}
              </>
            )}
          </div>

          <div className="field">
            <span className="field__label">Eigen foto (optioneel)</span>
            {/* Echte <label>-knoppen rond het bestandsveld: werkt het betrouwbaarst op iPhone en Android. */}
            <div className="photo-actions">
              <label className={`btn btn--secondary btn--md${busy ? ' is-disabled' : ''}`}>
                <Icon name="camera" size={22} />
                <span>Foto maken</span>
                <input type="file" accept="image/*" capture="environment" className="visually-hidden" disabled={busy} onChange={onFile} />
              </label>
              <label className={`btn btn--secondary btn--md${busy ? ' is-disabled' : ''}`}>
                <Icon name="image" size={22} />
                <span>Kies foto</span>
                <input type="file" accept="image/*" className="visually-hidden" disabled={busy} onChange={onFile} />
              </label>
            </div>
            {ex.photoId && (
              <Button
                variant="ghost"
                icon="trash"
                onClick={() => {
                  const { photoId: _drop, ...rest } = ex;
                  onChange(rest);
                }}
              >
                Foto weghalen{lib ? ' (figuurtje terugzetten)' : ''}
              </Button>
            )}
          </div>

          <div className="field">
            <span className="field__label">Volgorde</span>
            <div className="photo-actions">
              <Button variant="secondary" icon="arrowUp" disabled={index === 0} onClick={() => onMove(-1)}>
                Omhoog
              </Button>
              <Button variant="secondary" icon="arrowDown" disabled={index === count - 1} onClick={() => onMove(1)}>
                Omlaag
              </Button>
            </div>
          </div>

          <div className="ex-sheet__footer">
            <Button variant="ghost" icon="trash" className="btn--danger-text" onClick={onRemove}>
              Verwijderen
            </Button>
            <Button variant="primary" size="lg" icon="check" onClick={onClose}>
              Klaar
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}


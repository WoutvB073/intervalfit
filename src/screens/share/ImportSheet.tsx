import { useMemo, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { decodeWorkout, extractShareCode } from '../../storage/share';
import { WorkoutPreviewCard } from './WorkoutPreviewCard';
import { useAddWorkout } from './addWorkout';
import type { Workout } from '../../model/types';

/**
 * Importeren door te plakken: werkt met een hele link, een WhatsApp-bericht met link of een losse code.
 * Dit is ook de route op iPhone, waar de app op het beginscherm een eigen geheugen heeft.
 */
export function ImportSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (w: Workout) => void }) {
  const [text, setText] = useState('');
  const code = useMemo(() => extractShareCode(text), [text]);
  const workout = useMemo(() => (code ? decodeWorkout(code) : null), [code]);
  const { add, dialog } = useAddWorkout((w) => {
    setText('');
    onAdded(w);
  });

  const close = () => {
    setText('');
    onClose();
  };

  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t.trim()) {
        showToast('Er staat niets op het klembord. Kopieer eerst het bericht of de link.');
        return;
      }
      setText(t);
    } catch {
      showToast('Plakken lukte niet. Houd het vak hieronder ingedrukt en kies Plakken.');
    }
  };

  return (
    <>
      <Sheet open={open} onClose={close} title="Workout importeren" tall>
        <div className="import-sheet">
          <p className="import-sheet__intro">
            Heb je een workout gekregen, bijvoorbeeld via WhatsApp? Kopieer het bericht of de link en tik op <strong>Plakken</strong>.
          </p>
          <Button variant="primary" size="lg" icon="paste" block onClick={paste}>
            Plakken
          </Button>
          <label className="field">
            <span className="field__label">Bericht, link of code</span>
            <textarea
              className="field__input import-sheet__text"
              rows={3}
              value={text}
              placeholder="Of houd dit vak ingedrukt en kies Plakken"
              onChange={(e) => setText(e.target.value)}
            />
          </label>

          {text.trim() && !workout && (
            <p className="notice notice--warn">
              Hierin staat geen (volledige) workout. Kopieer het hele bericht of de link nog een keer en probeer het opnieuw.
            </p>
          )}

          {workout && (
            <div className="import-sheet__found">
              <p className="wpreview__eyebrow">
                <Icon name="check" size={18} /> Workout gevonden
              </p>
              <Button variant="primary" size="lg" icon="plus" block onClick={() => add(workout)}>
                Toevoegen aan mijn workouts
              </Button>
              <WorkoutPreviewCard workout={workout} />
            </div>
          )}

          <details className="import-sheet__help">
            <summary>Hoe kopieer ik een link in WhatsApp?</summary>
            <p>
              Houd het bericht met de link ingedrukt en kies <strong>Kopieer</strong>. Open daarna IntervalFit, tik op{' '}
              <strong>Workout importeren</strong> en dan op <strong>Plakken</strong>.
            </p>
          </details>
        </div>
      </Sheet>
      {dialog}
    </>
  );
}

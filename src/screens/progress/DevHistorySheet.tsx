import { useState } from 'react';
import { Sheet, SheetAction } from '../../components/Sheet';
import { showToast } from '../../components/Toast';
import { navigate } from '../../router';
import { FAKE_FINISHES, SCENARIOS, fakeFinish, hasRealHistoryBackup, loadScenario, restoreRealHistory } from '../../data/devHistory';

/** Ontwikkelaarsmodus: nep-geschiedenis laden en een workout nep-afronden (voor mijlpalen testen). */
export function DevHistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, rerender] = useState(0);
  return (
    <Sheet open={open} onClose={onClose} title="Nep-geschiedenis" tall>
      <p className="dev-sheet__intro">
        Vervangt je geschiedenis (de echte wordt bij de eerste keer bewaard). Kies daarna hieronder een nep-workout, of doe
        de test-workout.
      </p>
      <h3 className="dev-sheet__head">1. Geschiedenis klaarzetten</h3>
      <div className="sheet-actions">
        {SCENARIOS.map((s) => (
          <SheetAction
            key={s.id}
            icon="calendar"
            label={s.label}
            hint={s.hint}
            onClick={() => {
              loadScenario(s);
              rerender((n) => n + 1);
              showToast(`Geschiedenis: ${s.label.toLowerCase()}`);
            }}
          />
        ))}
      </div>
      <h3 className="dev-sheet__head">2. Nu een workout afronden (nep)</h3>
      <div className="sheet-actions">
        {FAKE_FINISHES.map((f) => (
          <SheetAction
            key={f.id}
            icon="play"
            label={f.label}
            hint={f.hint}
            onClick={() => {
              const entry = fakeFinish(f);
              onClose();
              if (entry) navigate(`/klaar/${entry.id}`);
              else showToast('Workout gestopt. Workouts korter dan 1 minuut tellen niet mee.');
            }}
          />
        ))}
      </div>
      {hasRealHistoryBackup() && (
        <>
          <h3 className="dev-sheet__head">Terugzetten</h3>
          <div className="sheet-actions">
            <SheetAction
              icon="refresh"
              label="Echte geschiedenis terugzetten"
              hint="Zet de geschiedenis terug van vóór de eerste nep-geschiedenis"
              onClick={() => {
                restoreRealHistory();
                rerender((n) => n + 1);
                showToast('Echte geschiedenis teruggezet');
              }}
            />
          </div>
        </>
      )}
    </Sheet>
  );
}

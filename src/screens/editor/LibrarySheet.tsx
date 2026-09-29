import { useMemo, useState } from 'react';
import { CATEGORIES, EXERCISES } from '../../data/exercises';
import type { Category, LibraryExercise } from '../../model/types';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Stepper, timeOptions } from '../../components/Stepper';
import { Figure } from '../../figure/Figure';
import { getAnimation } from '../../figure/animations';
import { formatShort } from '../../model/format';

/** Vergelijkbaar maken voor zoeken: kleine letters, zonder accenten, streepjes en spaties. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

function matches(e: LibraryExercise, q: string): boolean {
  if (!q) return true;
  const hay = [e.name, ...e.aliases, CATEGORIES.find((c) => c.id === e.category)?.label ?? ''].map(norm);
  return hay.some((h) => h.includes(q));
}

export type NewExercise = { libraryId?: string; name: string; workSec: number };

/**
 * Oefeningen kiezen: zoeken, categorieën, meerdere tegelijk aanvinken, of een eigen oefening.
 */
export function LibrarySheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (items: NewExercise[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState<{ name: string; workSec: number } | null>(null);

  const q = norm(query);
  const list = useMemo(
    () => EXERCISES.filter((e) => (cat === 'all' || e.category === cat) && matches(e, q)),
    [cat, q],
  );

  const reset = () => {
    setQuery('');
    setCat('all');
    setSelected([]);
    setCustom(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addSelected = () => {
    const items = selected.map((id) => {
      const e = EXERCISES.find((x) => x.id === id)!;
      return { libraryId: e.id, name: e.name, workSec: e.defaultWorkSec };
    });
    reset();
    onAdd(items);
  };

  const addCustom = () => {
    if (!custom || !custom.name.trim()) return;
    const item = { name: custom.name.trim().slice(0, 60), workSec: custom.workSec };
    reset();
    onAdd([item]);
  };

  return (
    <Sheet open={open} onClose={close} title={custom ? 'Eigen oefening' : 'Oefening toevoegen'} tall>
      {custom ? (
        <div className="lib-custom">
          <label className="field">
            <span className="field__label">Naam van de oefening</span>
            <input
              className="field__input"
              value={custom.name}
              maxLength={60}
              autoFocus
              enterKeyHint="done"
              placeholder="Bijv. Traplopen"
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            />
          </label>
          <div className="field">
            <span className="field__label">Werktijd</span>
            <Stepper
              label="Werktijd"
              value={custom.workSec}
              min={5}
              max={600}
              step={5}
              options={timeOptions(5, 600)}
              format={formatShort}
              onChange={(v) => setCustom({ ...custom, workSec: v })}
            />
          </div>
          <div className="lib-custom__actions">
            <Button variant="secondary" size="lg" onClick={() => setCustom(null)}>
              Terug
            </Button>
            <Button variant="primary" size="lg" icon="plus" disabled={!custom.name.trim()} onClick={addCustom}>
              Toevoegen
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="lib-search">
            <Icon name="search" size={22} />
            <input
              type="search"
              value={query}
              placeholder="Zoek, bijv. squats of opdrukken"
              aria-label="Zoek een oefening"
              enterKeyHint="search"
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="lib-search__clear" aria-label="Zoekveld leegmaken" onClick={() => setQuery('')}>
                <Icon name="close" size={20} />
              </button>
            )}
          </div>

          <div className="chips lib-chips">
            <button type="button" className={`chip${cat === 'all' ? ' is-active' : ''}`} onClick={() => setCat('all')}>
              Alles
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${cat === c.id ? ' is-active' : ''}`}
                onClick={() => setCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button type="button" className="lib-custom-btn" onClick={() => setCustom({ name: query.trim(), workSec: 30 })}>
            <span className="lib-custom-btn__icon">
              <Icon name="pencil" size={22} />
            </span>
            <span>
              <strong>Eigen oefening maken</strong>
              <small>Staat jouw oefening er niet bij? Geef hem zelf een naam.</small>
            </span>
          </button>

          {list.length === 0 ? (
            <p className="lib-empty">Geen oefening gevonden voor “{query}”. Maak hem als eigen oefening.</p>
          ) : (
            <ul className="lib-grid">
              {list.map((e) => {
                const on = selected.includes(e.id);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`lib-tile${on ? ' is-selected' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(e.id)}
                    >
                      <span className="lib-tile__art">
                        {getAnimation(e.id) ? (
                          <Figure exerciseId={e.id} playing={on} title={e.name} />
                        ) : (
                          <span className="lib-tile__letter">{e.name.charAt(0)}</span>
                        )}
                      </span>
                      <span className="lib-tile__name">{e.name}</span>
                      <span className="lib-tile__time">{formatShort(e.defaultWorkSec)}</span>
                      <span className="lib-tile__check" aria-hidden="true">
                        <Icon name="check" size={18} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className={`lib-footer${selected.length ? ' is-visible' : ''}`}>
            <Button variant="primary" size="lg" icon="plus" block onClick={addSelected} disabled={!selected.length}>
              {selected.length === 1 ? '1 oefening toevoegen' : `${selected.length} oefeningen toevoegen`}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

import { useState } from 'react';
import { CATEGORIES, EXERCISES } from '../data/exercises';
import { getAnimation } from '../figure/animations';
import { Figure } from '../figure/Figure';
import { cycleLength } from '../figure/rig';
import { IconButton } from '../components/Button';
import { goBack, navigate } from '../router';
import type { Category } from '../model/types';

/**
 * Galerij met alle oefeningen en hun animaties (voor ontwikkeling en controle).
 * Bereikbaar via `?dev=1#/galerij`; `#/galerij/houdingen` toont per oefening de losse houdingen.
 */
export function Gallery({ poses }: { poses: boolean }) {
  const [cat, setCat] = useState<Category | 'all'>('all');
  const list = EXERCISES.filter((e) => cat === 'all' || e.category === cat);

  return (
    <div className="screen gallery">
      <header className="top-bar">
        <IconButton icon="back" label="Terug" onClick={() => goBack()} />
        <h1 className="top-bar__title">Galerij ({list.length})</h1>
        <span className="top-bar__spacer" />
      </header>

      <div className="chips" role="tablist">
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
        <button
          type="button"
          className={`chip${poses ? ' is-active' : ''}`}
          onClick={() => navigate(poses ? '/galerij' : '/galerij/houdingen', { replace: true })}
        >
          Houdingen
        </button>
      </div>

      {poses ? (
        <div className="gallery-poses">
          {list.map((e) => {
            const anim = getAnimation(e.id);
            if (!anim) return null;
            // Sleutelhoudingen + tussenmomenten (om de beweging te controleren).
            const total = cycleLength(anim);
            const steps = 8;
            return (
              <section key={e.id} className="gallery-poses__row">
                <h2>
                  {e.name} <small>({e.id})</small>
                </h2>
                <div className="gallery-poses__frames">
                  {Array.from({ length: steps }, (_, i) => (
                    <div key={i} className="gallery-poses__frame">
                      <Figure anim={anim} at={(i / steps) * total} />
                      <span>{((i / steps) * total).toFixed(2)} s</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="gallery-grid">
          {list.map((e) => (
            <li key={e.id} className="gallery-card">
              <div className="gallery-card__art">
                <Figure exerciseId={e.id} title={e.name} />
              </div>
              <p className="gallery-card__name">{e.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

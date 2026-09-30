import { useState } from 'react';
import type { HistoryEntry } from '../../model/types';
import { useStore } from '../../storage/store';
import { historyStore } from '../../storage/data';
import { currentStreak, entriesThisWeek, favoriteExercise, longestStreak, totals } from '../../model/stats';
import { durationText } from '../../data/messages';
import { formatDay, formatTrained, plural } from '../../model/format';
import { goBack, navigate } from '../../router';
import { IconButton, Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { WeekDots } from '../../components/WeekDots';

const PAGE = 20;

/** Mijn voortgang: reeks, deze week, totalen en de afgelopen workouts. */
export function Progress() {
  const history = useStore(historyStore);
  const [shown, setShown] = useState(PAGE);
  const streak = currentStreak(history);
  const best = longestStreak(history);
  const week = entriesThisWeek(history);
  const weekSec = week.reduce((s, e) => s + e.totalSec, 0);
  const all = totals(history);
  const fav = favoriteExercise(history);
  const recent = [...history].reverse();

  return (
    <div className="screen progress">
      <header className="top-bar">
        <IconButton icon="back" label="Terug" onClick={() => goBack()} />
        <h1 className="top-bar__title">Mijn voortgang</h1>
        <span className="top-bar__spacer" />
      </header>

      {history.length === 0 ? (
        <div className="empty">
          <div className="empty__art" aria-hidden="true">
            <Icon name="chart" size={40} />
          </div>
          <h3>Nog geen workouts gedaan</h3>
          <p>Na je eerste workout zie je hier je reeks, je totalen en al je workouts.</p>
        </div>
      ) : (
        <main className="progress__main">
          <section className="card progress-streak">
            <div className="progress-streak__top">
              <span className={`streak-badge streak-badge--big${streak === 0 ? ' is-off' : ''}`}>
                <Icon name="flame" size={30} />
                <b>{streak}</b>
              </span>
              <div>
                <strong>{streak === 0 ? 'Tijd voor een nieuwe reeks' : streak === 1 ? '1 dag op rij' : `${streak} dagen op rij`}</strong>
                <small>{best > 1 ? `Langste reeks: ${best} dagen` : 'Train op een nieuwe dag om je reeks te laten groeien'}</small>
              </div>
            </div>
            <WeekDots entries={history} />
            <p className="progress-streak__week">
              Deze week: <strong>{plural(week.length, 'workout', 'workouts')}</strong>
              {week.length > 0 && <> · {durationText(weekSec)}</>}
            </p>
          </section>

          <section className="progress-totals" aria-label="Totalen">
            <div className="summary-tile summary-tile--wide">
              <span className="summary-tile__label">
                <Icon name="clock" size={16} /> Getraind
              </span>
              <span className="summary-tile__value">{formatTrained(all.totalSec)}</span>
            </div>
            <div className="summary-tile">
              <span className="summary-tile__label">
                <Icon name="star" size={16} /> Workouts
              </span>
              <span className="summary-tile__value">{all.count}</span>
            </div>
            <div className="summary-tile">
              <span className="summary-tile__label">
                <Icon name="flame" size={16} /> Verbrand
              </span>
              <span className="summary-tile__value">
                ≈ {all.kcal.toLocaleString('nl-NL')}
                <span className="summary-tile__unit"> kcal</span>
              </span>
            </div>
          </section>

          {fav && fav.workSec >= 60 && (
            <section className="card progress-fav">
              <Icon name="trophy" size={24} />
              <p>
                Meest gedane oefening: <strong>{fav.name}</strong>
                <small>{durationText(fav.workSec)} in totaal</small>
              </p>
            </section>
          )}

          <div className="section-head">
            <h2>Afgelopen workouts</h2>
            <span className="section-head__count">{history.length}</span>
          </div>
          <ul className="history-list">
            {recent.slice(0, shown).map((e) => (
              <HistoryRow key={e.id} entry={e} />
            ))}
          </ul>
          {recent.length > shown && (
            <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
              Meer tonen
            </Button>
          )}
        </main>
      )}
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const d = new Date(entry.date);
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return (
    <li>
      <button type="button" className="history-row" onClick={() => navigate(`/klaar/${entry.id}`)}>
        <span className={`history-row__icon${entry.completed ? '' : ' is-partial'}`}>
          <Icon name={entry.completed ? 'check' : 'heart'} size={20} strokeWidth={entry.completed ? 3 : 2} />
        </span>
        <span className="history-row__main">
          <strong>{entry.workoutName}</strong>
          <small>
            {formatDay(d)}, {time} · {formatTrained(entry.totalSec)} · ≈ {entry.kcal} kcal
            {!entry.completed && ' · eerder gestopt'}
          </small>
        </span>
        <Icon name="chevron" size={20} className="history-row__chevron" />
      </button>
    </li>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { HistoryEntry, Message, MessageKind } from '../../model/types';
import { useStore } from '../../storage/store';
import { getWorkout, historyStore } from '../../storage/data';
import { clearFresh, isFresh } from '../../storage/history';
import { currentStreak } from '../../model/stats';
import { formatClock } from '../../model/format';
import { DEV_WORKOUT_ID } from '../../data/devWorkout';
import { goBack, navigate } from '../../router';
import { Button, IconButton } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { WeekDots } from '../../components/WeekDots';
import { prepareWorkoutMedia } from '../../engine/media';
import { celebrate, prefersReducedMotion } from '../../engine/celebrate';
import { Placeholder } from '../Placeholder';

const KIND_ICON: Record<MessageKind, IconName> = {
  first: 'star',
  count: 'star',
  streak: 'flame',
  record: 'trophy',
  hours: 'clock',
  comeback: 'heart',
  exercise: 'bolt',
  week: 'calendar',
  time: 'sun',
  stopped: 'heart',
  compliment: 'check',
};

/**
 * Overzicht na afloop. Net afgerond: confetti, optellende getallen, *Klaar* en *Nog een keer*.
 * Later geopend vanuit Mijn voortgang: hetzelfde overzicht, rustig, met een terugknop.
 */
export function Summary({ id, devMode }: { id: string; devMode: boolean }) {
  const history = useStore(historyStore);
  const entry = history.find((e) => e.id === id);
  const [fresh] = useState(() => isFresh(id));
  useEffect(() => clearFresh(), []);
  if (!entry) return <Placeholder title="Overzicht" text="Deze workout staat niet (meer) in je geschiedenis." />;
  return <SummaryView entry={entry} history={history} fresh={fresh} devMode={devMode} />;
}

function SummaryView({ entry, history, fresh, devMode }: { entry: HistoryEntry; history: HistoryEntry[]; fresh: boolean; devMode: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const animate = fresh && !prefersReducedMotion();
  const messages = entry.messages ?? [];
  const main = messages[0];
  const date = new Date(entry.date);
  const workout = entry.workoutId === DEV_WORKOUT_ID ? (devMode ? { id: DEV_WORKOUT_ID } : undefined) : getWorkout(entry.workoutId);

  useEffect(() => {
    if (!fresh || !canvas.current) return;
    return celebrate(canvas.current);
  }, [fresh]);

  const again = workout
    ? () => {
        // In dezelfde tik: geluid, spraak en scherm-aan ontgrendelen (nodig op iPhone).
        prepareWorkoutMedia();
        navigate(`/speel/${workout.id}`, { replace: fresh });
      }
    : undefined;

  const streak = currentStreak(history);

  return (
    <div className={`screen summary${fresh ? ' is-fresh' : ''}`}>
      {fresh && <canvas ref={canvas} className="summary__confetti" aria-hidden="true" />}

      {!fresh && (
        <header className="top-bar summary__top">
          <IconButton icon="back" label="Terug" onClick={() => goBack('/voortgang')} />
          <h1 className="top-bar__title">{formatDay(date)}</h1>
          <span className="top-bar__spacer" />
        </header>
      )}

      <section className="summary__hero">
        <Medal message={main} completed={entry.completed} />
        {fresh ? <h1 className="summary__headline">{entry.headline ?? 'Goed gedaan!'}</h1> : <h2 className="summary__headline">{entry.headline ?? 'Goed gedaan!'}</h2>}
        <p className="summary__sub">
          <strong>{entry.workoutName}</strong>
          {!entry.completed && <span className="summary__chip">Eerder gestopt</span>}
        </p>
      </section>

      <main className="summary__main">
        {messages.length > 0 && (
          <ul className="summary__msgs">
            {messages.map((m, i) => (
              <li key={m.key} className={`summary-msg${i === 0 ? ' summary-msg--main' : ''}`} style={{ animationDelay: `${300 + i * 180}ms` }}>
                <span className={`summary-msg__icon summary-msg__icon--${m.kind}`}>
                  <Icon name={KIND_ICON[m.kind]} size={i === 0 ? 24 : 20} />
                </span>
                <p>{m.text}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="summary__tiles">
          <Tile wide label="Getraind" icon="clock" value={entry.totalSec} format={formatClock} unit="min" animate={animate} />
          <Tile label="Werktijd" icon="bolt" value={entry.workSec} format={formatClock} unit="min" animate={animate} />
          <Tile label="Verbrand" icon="flame" value={entry.kcal} format={(v) => `≈ ${Math.round(v)}`} unit="kcal" animate={animate} />
          <Tile label="Rondes" icon="repeat" value={entry.rounds} of={entry.completed ? undefined : entry.roundsPlanned} animate={animate} />
          <Tile
            label="Oefeningen"
            icon="list"
            value={entry.exercisesDone}
            of={entry.completed ? undefined : entry.exercisesPlanned}
            animate={animate}
          />
        </div>

        {fresh && (
          <section className="summary__streak card" aria-label="Je reeks">
            <div className="summary__streak-head">
              <span className="streak-badge">
                <Icon name="flame" size={22} />
                <b>{streak}</b>
              </span>
              <div>
                <strong>{streak === 1 ? 'Je reeks is begonnen' : `${streak} dagen op rij`}</strong>
                <small>{streak === 1 ? 'Eén dag getraind' : 'Elke dag minstens één workout'}</small>
              </div>
            </div>
            <WeekDots entries={history} />
          </section>
        )}
        {!fresh && (
          <p className="summary__when">
            {formatDay(date)} om {date.getHours()}:{String(date.getMinutes()).padStart(2, '0')}
          </p>
        )}
      </main>

      <div className="bottom-bar summary__actions">
        {fresh && (
          <Button variant="primary" size="lg" icon="check" block onClick={() => goBack()}>
            Klaar
          </Button>
        )}
        {again && (
          <Button variant={fresh ? 'secondary' : 'primary'} size="lg" icon="repeat" block onClick={again}>
            Nog een keer
          </Button>
        )}
      </div>
    </div>
  );
}

/** Medaille bovenaan: pictogram (en getal) van de meest bijzondere boodschap. */
function Medal({ message, completed }: { message?: Message; completed: boolean }) {
  const kind = message?.kind ?? (completed ? 'compliment' : 'stopped');
  const badge = message?.badge;
  const unit = kind === 'hours' ? 'uur' : kind === 'streak' ? (badge === 1 ? 'dag' : 'dagen') : undefined;
  return (
    <div className={`medal medal--${kind}`} aria-hidden="true">
      <span className="medal__rays" />
      <span className="medal__disc">
        {badge ? (
          <>
            {kind === 'streak' && <Icon name="flame" size={26} className="medal__small-icon" />}
            <span className="medal__num">{badge}</span>
            {unit && <span className="medal__unit">{unit}</span>}
          </>
        ) : (
          <Icon name={KIND_ICON[kind]} size={54} strokeWidth={kind === 'compliment' ? 3 : 2.2} />
        )}
      </span>
    </div>
  );
}

function Tile({
  label,
  icon,
  value,
  format = (v) => String(Math.round(v)),
  unit,
  of,
  wide,
  animate,
}: {
  label: string;
  icon: IconName;
  value: number;
  format?: (v: number) => string;
  unit?: string;
  of?: number;
  wide?: boolean;
  animate: boolean;
}) {
  const shown = useCountUp(value, animate);
  return (
    <div className={`summary-tile${wide ? ' summary-tile--wide' : ''}`}>
      <span className="summary-tile__label">
        <Icon name={icon} size={16} /> {label}
      </span>
      <span className="summary-tile__value">
        {format(shown)}
        {of !== undefined && <span className="summary-tile__of"> van {of}</span>}
        {unit && <span className="summary-tile__unit"> {unit}</span>}
      </span>
    </div>
  );
}

/** Telt in ± 1 seconde op van 0 naar de eindwaarde (met afremmen aan het eind). */
function useCountUp(target: number, animate: boolean): number {
  const [v, setV] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) {
      setV(target);
      return;
    }
    const start = performance.now() + 250;
    const dur = 1100;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);
  return v;
}

const DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** "Vandaag", "Gisteren" of "maandag 28 september". */
export function formatDay(d: Date, now = new Date()): string {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((b - a) / 86_400_000);
  if (diff === 0) return 'Vandaag';
  if (diff === 1) return 'Gisteren';
  const s = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? s : `${s} ${d.getFullYear()}`;
}

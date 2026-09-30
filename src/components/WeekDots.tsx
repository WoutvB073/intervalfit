import type { HistoryEntry } from '../model/types';
import { weekDays } from '../model/stats';
import { Icon } from './Icon';

/** De dagen van deze week (ma t/m zo), met een vinkje op de dagen waarop getraind is. */
export function WeekDots({ entries, now = new Date(), compact }: { entries: HistoryEntry[]; now?: Date; compact?: boolean }) {
  const days = weekDays(entries, now);
  const count = days.filter((d) => d.trained).length;
  return (
    <ol className={`week-dots${compact ? ' week-dots--compact' : ''}`} aria-label={`Deze week op ${count} ${count === 1 ? 'dag' : 'dagen'} getraind`}>
      {days.map((d) => (
        <li
          key={d.key}
          className={`week-dot${d.trained ? ' is-done' : ''}${d.today ? ' is-today' : ''}${d.future ? ' is-future' : ''}`}
          aria-hidden="true"
        >
          <span className="week-dot__dot">{d.trained && <Icon name="check" size={compact ? 13 : 15} strokeWidth={3} />}</span>
          <span className="week-dot__label">{d.label}</span>
        </li>
      ))}
    </ol>
  );
}

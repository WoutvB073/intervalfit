import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** Weergave van de waarde, bv. "45 s". */
  format: (v: number) => string;
  /** Keuzes voor het draaiwiel (tik op de waarde). Standaard: min…max in stappen van `step`. */
  options?: number[];
  label: string;
  disabled?: boolean;
};

/**
 * Grote − / + knoppen met de waarde ertussen.
 * - Ingedrukt houden gaat steeds sneller.
 * - Tik op de waarde: het draaiwiel van iPhone/Android zelf (een onzichtbare <select>).
 */
export function Stepper({ value, onChange, min, max, step, format, options, label, disabled }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const bump = (dir: 1 | -1) => {
    const next = clamp(valueRef.current + dir * step);
    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
    } else {
      stop(); // grens bereikt
    }
  };

  function stop() {
    clearTimeout(timer.current);
  }
  useEffect(() => stop, []);

  const start = (dir: 1 | -1) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    bump(dir);
    let delay = 420;
    const repeat = () => {
      bump(dir);
      delay = Math.max(60, delay * 0.8);
      timer.current = setTimeout(repeat, delay);
    };
    timer.current = setTimeout(repeat, delay);
  };

  const opts = options ?? Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
  if (!opts.includes(value)) opts.push(value);
  opts.sort((a, b) => a - b);

  return (
    <div className={`stepper${disabled ? ' is-disabled' : ''}`} role="group" aria-label={label}>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`${label} verlagen`}
        disabled={disabled || value <= min}
        onPointerDown={start(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && bump(-1)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Icon name="minus" size={24} />
      </button>
      <label className="stepper__value">
        <span aria-hidden="true">{format(value)}</span>
        <select
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {format(o)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="stepper__btn"
        aria-label={`${label} verhogen`}
        disabled={disabled || value >= max}
        onPointerDown={start(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && bump(1)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Icon name="plus" size={24} />
      </button>
    </div>
  );
}

/** Keuzes voor tijden: fijn bij korte tijden, grover bij lange. */
export function timeOptions(min: number, max: number): number[] {
  const out: number[] = [];
  for (let v = min; v <= max; ) {
    out.push(v);
    v += v < 60 ? 5 : v < 180 ? 15 : 30;
  }
  return out;
}

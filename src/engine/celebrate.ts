import confetti from 'canvas-confetti';

/** Houdt de gebruiker van minder beweging? Dan geen confetti en geen optel-animaties. */
export function prefersReducedMotion(): boolean {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Kleuren van het huidige thema (fasekleuren + hoofdkleur), zodat de confetti bij het thema past. */
function themeColors(): string[] {
  const css = getComputedStyle(document.documentElement);
  const colors = ['--work', '--rest', '--countdown', '--round-rest', '--primary', '--confetti-extra']
    .map((v) => css.getPropertyValue(v).trim())
    .filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  return colors.length ? colors : ['#12a867', '#2e86de', '#f2674f', '#7a5ce0'];
}

/**
 * Feestelijke confetti in een eigen canvas: één knal vanuit het midden, daarna twee zijwaartse
 * kanonnetjes. Bewust niet te veel deeltjes, zodat het ook op trage telefoons soepel blijft.
 * Geeft een opruimfunctie terug.
 */
export function celebrate(canvas: HTMLCanvasElement): () => void {
  if (prefersReducedMotion()) return () => {};
  const fire = confetti.create(canvas, { resize: true, useWorker: false, disableForReducedMotion: true });
  const colors = themeColors();
  const base = { colors, ticks: 240, scalar: 1.05, gravity: 1.05 } satisfies confetti.Options;
  const timers: ReturnType<typeof setTimeout>[] = [];

  void fire({ ...base, particleCount: 80, spread: 75, startVelocity: 48, origin: { x: 0.5, y: 0.3 } });
  timers.push(
    setTimeout(() => {
      void fire({ ...base, particleCount: 45, angle: 60, spread: 55, startVelocity: 60, origin: { x: 0, y: 0.75 } });
      void fire({ ...base, particleCount: 45, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.75 } });
    }, 450),
    setTimeout(() => {
      void fire({ ...base, particleCount: 35, spread: 110, startVelocity: 35, origin: { x: 0.5, y: 0.2 }, shapes: ['circle'] });
    }, 1100),
  );
  return () => {
    timers.forEach(clearTimeout);
    fire.reset();
  };
}

/** Eén gedeelde animatielus voor alle figuurtjes (zuiniger dan een lus per figuur). */
type Sub = (sec: number) => void;
const subs = new Set<Sub>();
let raf = 0;

function loop(ts: number) {
  const sec = ts / 1000;
  subs.forEach((fn) => fn(sec));
  raf = subs.size > 0 ? requestAnimationFrame(loop) : 0;
}

export function subscribeFrame(fn: Sub): () => void {
  subs.add(fn);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    subs.delete(fn);
  };
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

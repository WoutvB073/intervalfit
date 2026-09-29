import { canVibrate } from './platform';

/** Trillen bij wissels (alleen waar het toestel dat kan; op iPhone gebeurt er niets). */
export const HAPTIC = {
  work: [220],
  rest: [90, 70, 90],
  finish: [200, 100, 200, 100, 400],
} as const;

export function vibrate(pattern: readonly number[]): void {
  if (!canVibrate) return;
  try {
    navigator.vibrate([...pattern]);
  } catch {
    /* niet ondersteund */
  }
}

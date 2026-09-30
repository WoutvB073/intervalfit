import { getExercise } from '../data/exercises';

/** Gewicht als er in Instellingen niets is ingevuld. */
export const DEFAULT_WEIGHT_KG = 70;
/** MET-waarde tijdens rust (rustig staan, licht bewegen). */
const REST_MET = 2.0;
/** MET-waarde voor eigen oefeningen (gemiddelde krachtoefening). */
const CUSTOM_MET = 5.0;

/**
 * Geschatte verbruikte kilocalorieën:
 * Σ(MET × kg × uren werk) per oefening + 2,0 × kg × uren rust. Alleen echt getrainde tijd.
 */
export function estimateKcal(perExercise: { key: string; workSec: number }[], restSec: number, weightKg = DEFAULT_WEIGHT_KG): number {
  let kcal = 0;
  for (const e of perExercise) {
    const met = getExercise(e.key)?.met ?? CUSTOM_MET;
    kcal += (met * weightKg * e.workSec) / 3600;
  }
  kcal += (REST_MET * weightKg * Math.max(0, restSec)) / 3600;
  return Math.round(kcal);
}

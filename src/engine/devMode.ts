import { STORAGE_PREFIX } from '../config';

/**
 * Verborgen ontwikkelaarsmodus: open de app met `?dev=1` om hem in een gewone browser
 * (ook op de computer) te gebruiken in plaats van het installatiescherm. `?dev=0` zet hem weer uit.
 * De keuze wordt onthouden in deze browser.
 */
const KEY = `${STORAGE_PREFIX}.dev`;

export function initDevMode(): boolean {
  try {
    const param = new URLSearchParams(location.search).get('dev');
    if (param === '1') localStorage.setItem(KEY, '1');
    if (param === '0') localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

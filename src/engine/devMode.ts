import { STORAGE_PREFIX } from '../config';

/**
 * Verborgen ontwikkelaarsmodus: open de app met `?dev=1` om hem in een gewone browser
 * (ook op de computer) te gebruiken in plaats van het installatiescherm. `?dev=0` zet hem weer uit.
 * De keuze wordt onthouden in deze browser.
 */
const KEY = `${STORAGE_PREFIX}.dev`;

/** Aan/uit vanuit de app zelf (5× op het logo tikken) en daarna opnieuw laden. */
export function setDevMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* niet erg */
  }
  location.reload();
}

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

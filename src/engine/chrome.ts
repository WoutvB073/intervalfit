/**
 * Android: een pagina openen in Chrome vanuit een andere browser (Samsung Internet, Firefox, Edge, Opera,
 * ingebouwde browsers). Via een `intent://`-link; staat Chrome er niet op, dan komt de gebruiker terug op
 * deze pagina met `?geenchrome=1`.
 *
 * Waarom Chrome? Installeren via Samsung Internet geeft op Android 14+ de melding "Gevaarlijke app geblokkeerd"
 * (Samsung verpakt de app voor een oude Android-versie) en Samsung Internet maakt de app soms geforceerd donker.
 * Chrome installeert zonder melding en respecteert het gekozen thema.
 */

/** Gedeelde workout als query (`?deel=…`): in een intent-link mag geen tweede `#` staan. */
export const SHARE_PARAM = 'deel';
export const NO_CHROME_PARAM = 'geenchrome';

export function chromeIntentUrl(loc: Pick<Location, 'host' | 'pathname' | 'href'> = location, shareCode?: string): string {
  const query = shareCode ? `?${SHARE_PARAM}=${encodeURIComponent(shareCode)}` : '';
  const fallback = new URL(loc.href);
  fallback.searchParams.set(NO_CHROME_PARAM, '1');
  return (
    `intent://${loc.host}${loc.pathname}${query}` +
    `#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback.toString())};end`
  );
}

export function openInChrome(shareCode?: string): void {
  location.href = chromeIntentUrl(location, shareCode);
}

/** Kwam de gebruiker terug omdat Chrome niet geopend kon worden? */
export function chromeMissing(): boolean {
  try {
    return new URLSearchParams(location.search).get(NO_CHROME_PARAM) === '1';
  } catch {
    return false;
  }
}

/**
 * Bij het opstarten: `?deel=CODE` (uit een intent-link) omzetten naar de gewone route `#/deel/CODE`.
 */
export function applyShareParam(): void {
  try {
    const url = new URL(location.href);
    const code = url.searchParams.get(SHARE_PARAM);
    if (!code) return;
    url.searchParams.delete(SHARE_PARAM);
    url.hash = `/deel/${code}`;
    history.replaceState(null, '', url.toString());
  } catch {
    /* niet erg */
  }
}

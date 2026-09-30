import { useSyncExternalStore } from 'react';

/**
 * Mini hash-router. Routes:
 *   #/                    Home
 *   #/workout/nieuw       Nieuwe workout
 *   #/workout/:id         Workout bewerken
 *   #/speel/:id           Workout afspelen
 *   #/klaar/:historyId    Overzicht na afloop
 *   #/instellingen        Instellingen
 *   #/voortgang           Mijn voortgang (geschiedenis)
 *   #/handleiding         Handleiding voor gebruikers
 *   #/deel/:code          Gedeelde workout bekijken
 */
export type Route =
  | { name: 'home' }
  | { name: 'editor'; id?: string }
  | { name: 'player'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'settings' }
  | { name: 'progress' }
  | { name: 'manual' }
  | { name: 'share'; code: string }
  | { name: 'gallery'; poses: boolean }
  | { name: 'notFound' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const [a, b] = parts;
  if (!a) return { name: 'home' };
  if (a === 'workout' && b === 'nieuw') return { name: 'editor' };
  if (a === 'workout' && b) return { name: 'editor', id: decodeURIComponent(b) };
  if (a === 'speel' && b) return { name: 'player', id: decodeURIComponent(b) };
  if (a === 'klaar' && b) return { name: 'summary', id: decodeURIComponent(b) };
  if (a === 'instellingen') return { name: 'settings' };
  if (a === 'voortgang') return { name: 'progress' };
  if (a === 'handleiding') return { name: 'manual' };
  if (a === 'galerij') return { name: 'gallery', poses: b === 'houdingen' };
  // De code bevat geen '/' (lz-string URI-veilig), maar neem voor de zekerheid alles mee.
  if (a === 'deel' && b) return { name: 'share', code: parts.slice(1).join('/') };
  return { name: 'notFound' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  return parseHash(hash);
}

/** Aantal stappen dat binnen de app is genavigeerd, zodat "terug" nooit de app verlaat. */
function depth(): number {
  return (history.state as { depth?: number } | null)?.depth ?? 0;
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  const url = `#${path}`;
  // Staat er nog een paneel open, dan vervangt het nieuwe scherm die paneel-stap.
  const onOverlay = (history.state as { overlay?: boolean } | null)?.overlay === true;
  if (opts.replace || onOverlay) {
    history.replaceState({ depth: depth() }, '', url);
  } else {
    history.pushState({ depth: depth() + 1 }, '', url);
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Terug binnen de app; als er niets is om naar terug te gaan: naar Home. */
export function goBack(fallback = '/'): void {
  if (depth() > 0) history.back();
  else navigate(fallback, { replace: true });
}

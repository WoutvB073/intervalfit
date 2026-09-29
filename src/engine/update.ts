import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker: maakt de app offline beschikbaar.
 * Een nieuwe versie wordt op de achtergrond opgehaald; de app past hem pas toe als
 * de gebruiker op "Bijwerken" tikt (die melding staat alleen op Home, nooit tijdens een workout).
 */
let needRefresh = false;
let offlineReady = false;
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onOfflineReady() {
      offlineReady = true;
      emit();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Bij terugkomen in de app (en elk uur) kijken of er een nieuwe versie is.
      const check = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void registration.update();
      };
      document.addEventListener('visibilitychange', check);
      setInterval(check, 60 * 60 * 1000);
    },
  });
}

export function applyUpdate(): void {
  void updateSW?.(true);
}

type UpdateState = { needRefresh: boolean; offlineReady: boolean };
let snapshot: UpdateState = { needRefresh, offlineReady };
const getSnapshot = () => {
  if (snapshot.needRefresh !== needRefresh || snapshot.offlineReady !== offlineReady) {
    snapshot = { needRefresh, offlineReady };
  }
  return snapshot;
};

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    getSnapshot,
  );
}

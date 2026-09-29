import { useSyncExternalStore } from 'react';

/** Android/Chrome: het uitgestelde installatieverzoek, zodat we een eigen "Installeren"-knop kunnen tonen. */
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

type InstallState = { canPrompt: boolean; installed: boolean };
let snapshot: InstallState = { canPrompt: false, installed: false };
const getSnapshot = () => {
  if (snapshot.canPrompt !== !!deferred || snapshot.installed !== installed) {
    snapshot = { canPrompt: !!deferred, installed };
  }
  return snapshot;
};

export function useInstallPrompt(): InstallState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    getSnapshot,
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

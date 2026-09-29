import { useSyncExternalStore } from 'react';
import { STORAGE_PREFIX } from '../config';

/** Veilig lezen uit localStorage (kan falen in privé-modus of bij kapotte data). */
export function readJSON<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}.${key}`);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

/** Veilig schrijven; geeft false terug als de opslag vol of niet beschikbaar is. */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}.${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export type Store<T> = {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
};

/**
 * Een kleine, blijvende store: waarde in het geheugen, automatisch bewaard in localStorage.
 * `load` zet opgeslagen (mogelijk oudere/onvolledige) data om naar de huidige vorm.
 */
export function createStore<T>(key: string, fallback: () => T, load: (raw: unknown) => T = (r) => r as T): Store<T> {
  let value: T | undefined;
  const listeners = new Set<() => void>();

  const ensure = (): T => {
    if (value === undefined) {
      const raw = readJSON<unknown>(key);
      try {
        value = raw === undefined ? fallback() : load(raw);
      } catch {
        value = fallback();
      }
    }
    return value;
  };

  return {
    get: ensure,
    set(next) {
      const prev = ensure();
      value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeJSON(key, value);
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

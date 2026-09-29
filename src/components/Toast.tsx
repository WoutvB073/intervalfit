import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

type ToastItem = { id: number; text: string };
let current: ToastItem | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Korte melding onderin het scherm. */
export function showToast(text: string, ms = 2800): void {
  current = { id: ++seq, text };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, ms);
}

export function ToastHost() {
  const toast = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
  return createPortal(
    <div className="toast-host" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast">
          {toast.text}
        </div>
      )}
    </div>,
    document.body,
  );
}

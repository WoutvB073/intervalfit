import { useEffect, useRef } from 'react';

/**
 * Panelen en dialogen krijgen een eigen stap in de browsergeschiedenis, zodat de
 * Android-terugknop (of veeg-terug) eerst het paneel sluit in plaats van het scherm te verlaten.
 */
type Entry = { close: () => void };
const stack: Entry[] = [];let checkScheduled = false;
let ignoreNextPop = false;

export function isOverlayEntry(): boolean {
  return (history.state as { overlay?: boolean } | null)?.overlay === true;
}

function currentDepth(): number {
  return (history.state as { depth?: number } | null)?.depth ?? 0;
}

function ensureEntry() {
  if (!isOverlayEntry()) history.pushState({ depth: currentDepth() + 1, overlay: true }, '', location.href);
}

function scheduleCheck() {
  if (checkScheduled) return;
  checkScheduled = true;
  setTimeout(() => {
    checkScheduled = false;
    if (stack.length === 0 && isOverlayEntry()) {
      ignoreNextPop = true;
      history.back();
    }
  }, 0);
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    const top = stack[stack.length - 1];
    if (top) {
      top.close();
      // Er staan nog meer panelen open: die hebben weer een eigen stap nodig.
      if (stack.length > 1) ensureEntry();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') stack[stack.length - 1]?.close();
  });
}

/** Registreert een open paneel/dialoog; sluit bij "terug" of Escape. */
export function useOverlay(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const entry: Entry = { close: () => closeRef.current() };
    stack.push(entry);
    ensureEntry();
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      scheduleCheck();
    };
  }, [open]);
}

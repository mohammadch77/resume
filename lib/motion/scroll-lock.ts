type Listener = (locked: boolean) => void;

let locked = false;
let listener: Listener | null = null;

/**
 * Page scroll is locked while a dialog is open. This module has no imports on purpose: the dialog's owner (in the first
 * bundle) calls it, and the lazily loaded motion engine subscribes to it, so neither pulls in the other.
 */
export function setScrollLocked(next: boolean): void {
  locked = next;
  listener?.(next);
}

/** The engine's subscription; it is told the current state at once (the dialog may have opened before the engine loaded). */
export function onScrollLock(next: Listener): () => void {
  listener = next;
  next(locked);
  return () => {
    if (listener === next) listener = null;
  };
}

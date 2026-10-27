type Listener = (locked: boolean) => void;

let locks = 0;
let listener: Listener | null = null;

/**
 * Page scroll is locked while a dialog is open. Counted (two dialogs can overlap for a moment: a case study closing as the
 * contact dialog opens). This module has no imports on purpose: the dialogs' owners (in the first bundle) call it, and the lazily
 * loaded motion engine subscribes to it, so neither pulls in the other.
 */
export function lockScroll(): () => void {
  locks += 1;
  listener?.(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    listener?.(locks > 0);
  };
}

/** The engine's subscription; it is told the current state at once (a dialog may have opened before the engine loaded). */
export function onScrollLock(next: Listener): () => void {
  listener = next;
  next(locks > 0);
  return () => {
    if (listener === next) listener = null;
  };
}

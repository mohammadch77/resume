type Listener = (locked: boolean) => void;

let locks = 0;
let listener: Listener | null = null;
let savedOverflow: string | null = null;

/**
 * Page scroll is locked while a dialog is open. Counted (two dialogs can overlap for a moment: a case study closing as the
 * contact dialog opens). This module has no imports on purpose: the dialogs' owners (in the first bundle) call it, and the lazily
 * loaded motion engine subscribes to it, so neither pulls in the other.
 */
export function lockScroll(): () => void {
  locks += 1;
  if (locks === 1 && typeof document !== "undefined") {
    // the page behind an overlay must not scroll with the wheel, the keyboard or a touch either (not only Lenis)
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }
  listener?.(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0 && savedOverflow !== null) {
      document.documentElement.style.overflow = savedOverflow;
      savedOverflow = null;
    }
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

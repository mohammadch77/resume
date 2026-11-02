const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside `el` (Tab and Shift+Tab wrap), closes on Escape, moves focus in (`initial`, or the first focusable) and gives
 * it back to what had it when the overlay opened. Plain DOM, no framework: the menu uses it and loads it only on its first click.
 * Returns the teardown.
 */
export function trapFocus(el: HTMLElement, onClose: () => void, initial?: HTMLElement | null): () => void {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusables = () => [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  (initial ?? focusables()[0])?.focus();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const list = focusables();
    if (list.length === 0) return;
    const [first, last] = [list[0], list[list.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKey);
  return () => {
    document.removeEventListener("keydown", onKey);
    opener?.focus({ preventScroll: true }); // the opener may be in a header far from where the visitor is reading
  };
}

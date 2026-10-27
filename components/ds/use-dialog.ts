"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])';

// Page scroll is locked while at least one dialog is open. Counted, so a dialog opened while another one is closing
// cannot unlock the page under the first (each used to restore the overflow it had found).
let locks = 0;
let savedOverflow = "";
function lockBody(): () => void {
  if (locks++ === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  return () => {
    if (--locks === 0) document.body.style.overflow = savedOverflow;
  };
}

type Options = {
  open: boolean;
  /** Rendered inside a preview artboard instead of over the page: no scroll lock, no initial focus, no focus return. */
  contained?: boolean;
  onClose?: () => void;
  /** Selector of what gets focus first (default: the first button, i.e. the close button). */
  initialFocus?: string;
};

/** What every dialog does: traps Tab inside, closes on Escape, locks page scroll, focuses something first and gives focus back to what opened it. */
export function useDialog(ref: RefObject<HTMLElement | null>, { open, contained = false, onClose, initialFocus = "button" }: Options): void {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (!contained) node?.querySelector<HTMLElement>(initialFocus)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node?.addEventListener("keydown", onKey);
    const unlock = contained ? undefined : lockBody();
    return () => {
      node?.removeEventListener("keydown", onKey);
      unlock?.();
      if (!contained) previous?.focus?.();
    };
  }, [ref, open, contained, onClose, initialFocus]);
}

"use client";

import { useEffect, useRef, type RefObject } from "react";
import { lockScroll } from "@/lib/motion/scroll-lock";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * What every overlay of the page does: lock the page scroll (counted), move focus in, keep Tab inside, close on Escape and give
 * focus back to what opened it. `initial` is a selector for the element that gets focus first (default: the first focusable one).
 */
export function useDialog(open: boolean, onClose: () => void, panel: RefObject<HTMLElement | null>, initial?: string) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = panel.current;
    const focusables = () => (el ? [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null) : []);
    (initial ? el?.querySelector<HTMLElement>(initial) : focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
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
      unlock();
      opener?.focus();
    };
  }, [open, panel, initial]);
}

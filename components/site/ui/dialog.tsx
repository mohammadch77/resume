"use client";

import { useId, useRef, type ReactNode } from "react";
import { Eyebrow } from "./eyebrow";
import { CloseIcon } from "./icons";
import { useDialog } from "./use-dialog";

/**
 * A dialog that drops in from the top (transform + opacity only). It is rendered only while open, so mounting it is opening it.
 * A click on the scrim, the close button and Escape close it. The contact form dialog and the case study are both built on this.
 */
export function PageDialog({ title, eyebrow, onClose, initialFocus, wide = false, children }: { title: string; eyebrow?: string; onClose: () => void; initialFocus?: string; wide?: boolean; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(true, onClose, panel, initialFocus);
  return (
    <div className="lm-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={`lm-dialog${wide ? " lm-dialog--wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="lm-dialog__close" onClick={onClose} aria-label="بستن">
          <CloseIcon size="1em" strokeWidth={2} aria-hidden="true" />
        </button>
        <header className="lm-dialog__head">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 id={titleId} className="lm-dialog__title">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </div>
  );
}

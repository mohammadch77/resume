"use client";

import { useId, useRef } from "react";
import { Button } from "./button";
import { useDialog } from "./use-dialog";

export type DialogProps = {
  open?: boolean;
  onClose?: () => void;
  title: string;
  /** Selector of the element that gets focus first (default: the close button). Use "input" for a form. */
  initialFocus?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Extension of the export (see design/decisions.md): a small dialog that drops in from the top, for a form or a short message.
 * Same scrim, frame and behaviour as <Modal> (focus trap, Escape, scrim click, scroll lock, focus returns to the trigger);
 * the motion is the Modal's rise turned into a drop (transform + opacity only, 240 ms, --ease-out). Closing is instant.
 */
export function Dialog({ open = true, onClose, title, initialFocus, className = "", children }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = `${useId().replace(/:/g, "")}-t`;
  useDialog(ref, { open, onClose, initialFocus });
  if (!open) return null;
  return (
    <div
      className="gw-scrim gw-scrim--top"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div ref={ref} className={["gw-modal", "gw-modal--drop", className].filter(Boolean).join(" ")} data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="gw-modal__head">
          <h2 className="gw-modal__title" id={titleId}>
            {title}
          </h2>
          <Button variant="quiet" className="gw-modal__close" iconOnly="x" label="بستن" onClick={onClose} />
        </header>
        <div className="gw-dialog__body">{children}</div>
      </div>
    </div>
  );
}

"use client";

import { useId, useRef } from "react";
import { Button } from "./button";
import { Chip } from "./chip";
import { CoverArt } from "./cover-art";
import { CropFrame } from "./crop-frame";
import { useDialog } from "./use-dialog";

export type ModalProps = {
  open?: boolean;
  onClose?: () => void;
  title: string;
  tags?: string[];
  art?: 1 | 2 | 3 | 4;
  image?: string;
  alt?: string;
  sample?: boolean;
  challenge: React.ReactNode;
  solution: React.ReactNode;
  outcome: React.ReactNode;
  /** Override column headings (default چالش / راه‌حل / نتیجه). */
  labels?: { challenge?: string; solution?: string; outcome?: string };
  /** Same label as the site-wide primary CTA. */
  primaryLabel?: string;
  primaryHref?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Position the scrim inside the nearest positioned parent instead of the viewport (for previews/artboards). */
  contained?: boolean;
  className?: string;
  /** Extension of the export (additive): the cover as a node (the site's <ResponsivePicture>); CoverArt stays the fallback. */
  cover?: React.ReactNode;
  /** Extension of the export (additive): extra case-study content (results, gallery, live link) between the columns and the actions. */
  extra?: React.ReactNode;
};

/**
 * Case-study dialog: tags, title, crop-marked cover, challenge / solution / outcome in three columns, primary and
 * secondary actions. Traps focus, closes on Escape and on a scrim click, locks page scroll while open and gives focus
 * back to what opened it. `data-lenis-prevent` on the scrolling element keeps a smooth-scroll engine (Lenis) from taking
 * the wheel over the dialog; without such an engine it is an inert attribute.
 */
export function Modal({ open = true, onClose, title, tags = [], art = 1, image, alt, sample = false, challenge, solution, outcome, labels, primaryLabel = "درخواست مشاوره رایگان", primaryHref, onPrimary, secondaryLabel = "بستن", onSecondary, contained = false, className = "", cover, extra }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const L = { challenge: "چالش", solution: "راه‌حل", outcome: "نتیجه", ...labels };
  const titleId = `${useId().replace(/:/g, "")}-t`;

  useDialog(ref, { open, contained, onClose });

  if (!open) return null;
  return (
    <div
      className={`gw-scrim${contained ? " gw-scrim--contained" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div ref={ref} className={["gw-modal", className].filter(Boolean).join(" ")} data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="gw-modal__head">
          <div className="gw-modal__titles">
            {tags.length > 0 && (
              <div className="gw-chip-row">
                {tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            )}
            <h2 className="gw-modal__title" id={titleId}>
              {title}
            </h2>
          </div>
          <Button variant="quiet" className="gw-modal__close" iconOnly="x" label="بستن" onClick={onClose} />
        </header>
        <div className="gw-modal__cover">
          <CropFrame>{cover ? <div className="gw-cover">{cover}</div> : <CoverArt art={art} image={image} alt={alt} sample={sample} />}</CropFrame>
        </div>
        <div className="gw-modal__cols">
          <section className="gw-modal__col">
            <h3>{L.challenge}</h3>
            <p>{challenge}</p>
          </section>
          <section className="gw-modal__col">
            <h3>{L.solution}</h3>
            <p>{solution}</p>
          </section>
          <section className="gw-modal__col">
            <h3>{L.outcome}</h3>
            <p>{outcome}</p>
          </section>
        </div>
        {extra}
        <footer className="gw-modal__actions">
          <Button href={primaryHref} onClick={onPrimary}>
            {primaryLabel}
          </Button>
          <Button variant="secondary" onClick={onSecondary ?? onClose}>
            {secondaryLabel}
          </Button>
        </footer>
      </div>
    </div>
  );
}

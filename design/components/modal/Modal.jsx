import React from "react";
import { Button } from "../button/Button.jsx";
import { Chip } from "../chip/Chip.jsx";
import { CropFrame } from "../project-card/CropFrame.jsx";
import { CoverArt } from "../project-card/CoverArt.jsx";

export function Modal({ open = true, onClose, title, tags = [], art = 1, image, alt, sample = false, challenge, solution, outcome, labels, primaryLabel = "درخواست مشاوره رایگان", primaryHref, onPrimary, secondaryLabel = "بستن", onSecondary, contained = false, className = "" }) {
  const ref = React.useRef(null);
  const L = { challenge: "چالش", solution: "راه‌حل", outcome: "نتیجه", ...labels };
  const titleId = React.useId().replace(/:/g, "") + "-t";
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const node = ref.current;
    if (!contained) node && node.querySelector("button")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { onClose && onClose(); return; }
      if (e.key !== "Tab" || !node) return;
      const f = node.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node && node.addEventListener("keydown", onKey);
    const ov = document.body.style.overflow;
    if (!contained) document.body.style.overflow = "hidden";
    return () => { node && node.removeEventListener("keydown", onKey); document.body.style.overflow = ov; prev && prev.focus && !contained && prev.focus(); };
  }, [open, contained]);
  if (!open) return null;
  return (
    <div className={"gw-scrim" + (contained ? " gw-scrim--contained" : "")} onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div ref={ref} className={["gw-modal", className].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="gw-modal__head">
          <div className="gw-modal__titles">
            {tags.length > 0 && <div className="gw-chip-row">{tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>}
            <h2 className="gw-modal__title" id={titleId}>{title}</h2>
          </div>
          <Button variant="quiet" className="gw-modal__close" iconOnly="x" label="بستن" onClick={onClose} />
        </header>
        <div className="gw-modal__cover"><CropFrame><CoverArt art={art} image={image} alt={alt} sample={sample} /></CropFrame></div>
        <div className="gw-modal__cols">
          <section className="gw-modal__col"><h3>{L.challenge}</h3><p>{challenge}</p></section>
          <section className="gw-modal__col"><h3>{L.solution}</h3><p>{solution}</p></section>
          <section className="gw-modal__col"><h3>{L.outcome}</h3><p>{outcome}</p></section>
        </div>
        <footer className="gw-modal__actions">
          <Button href={primaryHref} onClick={onPrimary}>{primaryLabel}</Button>
          <Button variant="secondary" onClick={onSecondary || onClose}>{secondaryLabel}</Button>
        </footer>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BrandMark, CloseIcon, MenuIcon } from "./icons";
import { useDialog } from "./use-dialog";

export type NavItem = { label: string; href: string };

const faIndex = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });

/**
 * The header's Menu button and the full-screen menu. The menu is in the HTML from the first byte: without JavaScript the button is
 * a link to #lm-menu and CSS shows the menu with :target; with JavaScript the button toggles it (focus trap, Escape, scroll lock).
 * `brand` is the site's name (from the database); the CTA row at the bottom is a link to the contact form like every other CTA.
 */
export function NavMenu({ brand, items, ctaLabel, ctaHref, buttonLabel = "منو", closeLabel = "بستن" }: { brand: string; items: NavItem[]; ctaLabel: string; ctaHref: string; buttonLabel?: string; closeLabel?: string }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    if (window.location.hash === "#lm-menu") history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  useDialog(open, close, panel);

  useEffect(() => {
    // Opened by the no-JS link before hydration finished (or deep-linked): take over, and follow the hash afterwards.
    const sync = () => setOpen(window.location.hash === "#lm-menu");
    queueMicrotask(sync);
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <>
      <a
        className="lm-menu-button"
        href="#lm-menu"
        aria-expanded={open}
        aria-controls="lm-menu"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <MenuIcon size="1em" strokeWidth={2} aria-hidden="true" />
        <span className="lm-menu-button__label">{buttonLabel}</span>
      </a>
      <div id="lm-menu" ref={panel} className="lm-menu" data-open={open} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={buttonLabel}>
        <div className="lm-shell lm-menu__top">
          <span className="lm-brand">
            <BrandMark className="lm-brand__mark" />
            {brand}
          </span>
          <a
            className="lm-menu__close"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              close();
            }}
          >
            <CloseIcon size="1em" strokeWidth={2} aria-hidden="true" />
            {closeLabel}
          </a>
        </div>
        <nav className="lm-shell lm-menu__nav" aria-label="منوی اصلی">
          <ul>
            {items.map((item, i) => (
              <li key={item.href} style={{ "--lm-i": i } as CSSProperties}>
                <a href={item.href} onClick={close} className="lm-menu__item">
                  <span className="lm-menu__index">{faIndex.format(i + 1)}</span>
                  <span className="lm-menu__label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lm-shell lm-menu__bottom">
          <a href={ctaHref} className="lm-menu__cta" onClick={close}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </>
  );
}

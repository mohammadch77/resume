"use client";

import { useState } from "react";
import { Button } from "./button";

export type NavLink = { label: string; href: string };

export type NavbarProps = {
  /** Wordmark text set in the display face (no logo exists). */
  brand?: string;
  brandHref?: string;
  /** In-page anchors, max 4–5. */
  links?: NavLink[];
  /** href of the section currently in view (gets aria-current). */
  current?: string;
  /** Must match the hero and contact CTA exactly. */
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Sticky capsule navbar: wordmark, in-page anchor links, the primary CTA. Collapses to a menu sheet under 900px. */
export function Navbar({ brand = "Grin Web", brandHref = "#top", links = [], current, ctaLabel = "درخواست مشاوره رایگان", ctaHref = "#contact", className = "", style }: NavbarProps) {
  const [open, setOpen] = useState(false);
  return (
    <nav className={["gw-nav", open && "is-open", className].filter(Boolean).join(" ")} aria-label="ناوبری اصلی" style={style}>
      <a className="gw-nav__brand" href={brandHref} lang="en" dir="ltr">
        {brand}
      </a>
      <ul className="gw-nav__links">
        {links.map((l) => (
          <li key={l.href}>
            <a className="gw-nav__link" href={l.href} aria-current={current === l.href ? "location" : undefined}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="gw-nav__end">
        <Button href={ctaHref}>{ctaLabel}</Button>
        <Button variant="quiet" className="gw-nav__menu" iconOnly={open ? "x" : "menu"} label={open ? "بستن منو" : "منو"} aria-expanded={open} onClick={() => setOpen(!open)} />
      </div>
      <div className="gw-nav__sheet">
        {links.map((l) => (
          <a key={l.href} className="gw-nav__link" href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <Button href={ctaHref} onClick={() => setOpen(false)}>
          {ctaLabel}
        </Button>
      </div>
    </nav>
  );
}

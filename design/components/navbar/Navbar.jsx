import React from "react";
import { Button } from "../button/Button.jsx";

export function Navbar({ brand = "Grin Web", brandHref = "#top", links = [], current, ctaLabel = "درخواست مشاوره رایگان", ctaHref = "#contact", className = "", style }) {
  const [open, setOpen] = React.useState(false);
  return (
    <nav className={["gw-nav", open && "is-open", className].filter(Boolean).join(" ")} aria-label="ناوبری اصلی" style={style}>
      <a className="gw-nav__brand" href={brandHref} lang="en" dir="ltr">{brand}</a>
      <ul className="gw-nav__links">
        {links.map((l) => (
          <li key={l.href}><a className="gw-nav__link" href={l.href} aria-current={current === l.href ? "location" : undefined}>{l.label}</a></li>
        ))}
      </ul>
      <div className="gw-nav__end">
        <Button href={ctaHref}>{ctaLabel}</Button>
        <Button variant="quiet" className="gw-nav__menu" iconOnly={open ? "x" : "menu"} label={open ? "بستن منو" : "منو"} aria-expanded={open} onClick={() => setOpen(!open)} />
      </div>
      <div className="gw-nav__sheet">
        {links.map((l) => (
          <a key={l.href} className="gw-nav__link" href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
        <Button href={ctaHref} onClick={() => setOpen(false)}>{ctaLabel}</Button>
      </div>
    </nav>
  );
}

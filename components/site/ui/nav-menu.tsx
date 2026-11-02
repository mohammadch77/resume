import type { CSSProperties } from "react";
import { BrandMark, CloseIcon, MenuIcon } from "./icons";

export type NavItem = { label: string; href: string };

const faIndex = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });

/**
 * The header's Menu button and the full-screen menu, as plain server markup. The menu is in the HTML from the first byte and opens with
 * :target (the button is a link to #lm-menu), so it works without JavaScript. With JavaScript the first click loads lib/site/menu.ts, which
 * adds the scroll lock, the focus trap and Escape (components/site/site-launcher.tsx). `brand` is the site's name from the database;
 * the CTA row at the bottom is a link to the contact form like every other CTA.
 */
export function NavMenu({ brand, items, ctaLabel, ctaHref, buttonLabel = "منو", closeLabel = "بستن" }: { brand: string; items: NavItem[]; ctaLabel: string; ctaHref: string; buttonLabel?: string; closeLabel?: string }) {
  return (
    <>
      <a className="lm-menu-button" href="#lm-menu" aria-label={buttonLabel} aria-controls="lm-menu" aria-expanded="false">
        <MenuIcon size="1em" strokeWidth={2} aria-hidden="true" />
        <span className="lm-menu-button__label">{buttonLabel}</span>
      </a>
      <div id="lm-menu" className="lm-menu" data-open="false" aria-label={buttonLabel}>
        <div className="lm-shell lm-menu__top">
          <span className="lm-brand">
            <BrandMark className="lm-brand__mark" />
            {brand}
          </span>
          <a className="lm-menu__close" href="#">
            <CloseIcon size="1em" strokeWidth={2} aria-hidden="true" />
            {closeLabel}
          </a>
        </div>
        <nav className="lm-shell lm-menu__nav" aria-label="منوی تمام‌صفحه">
          <ul>
            {items.map((item, i) => (
              <li key={item.href} style={{ "--lm-i": i } as CSSProperties}>
                <a href={item.href} className="lm-menu__item">
                  <span className="lm-menu__index">{faIndex.format(i + 1)}</span>
                  <span className="lm-menu__label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lm-shell lm-menu__bottom">
          <a href={ctaHref} className="lm-menu__cta">
            {ctaLabel}
          </a>
        </div>
      </div>
    </>
  );
}

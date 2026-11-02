import { CONTACT_HREF } from "@/lib/site/links";
import { BrandMark, NavMenu, PillButton, type NavItem } from "./ui";

/**
 * The header: brand, the section links (from 1024px), the Tehran clock chip, the Menu button with the full-screen menu, and the primary CTA
 * (a button; below 640px it is in the menu and the hero instead). Server markup only: the clock is filled by lib/motion/clock.ts at idle, the
 * menu opens with :target and gains its focus trap from lib/site/menu.ts. `overlay` puts it over the hero (the landing); inner pages keep it in the flow.
 */
export function SiteHeader({ brand, brandHref = "#home", links, ctaLabel, overlay = false }: { brand: string; brandHref?: string; links: NavItem[]; ctaLabel: string; overlay?: boolean }) {
  return (
    <header className={`lm-header${overlay ? "" : " lm-header--static"}`}>
      <div className="lm-shell lm-header__row">
        <a className="lm-brand lm-header__brand" href={brandHref}>
          <BrandMark className="lm-brand__mark" />
          {brand}
        </a>
        {links.length > 0 ? (
          <nav className="lm-header__nav" aria-label="ناوبری اصلی">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div className="lm-header__end">
          <p className="lm-clock" data-clock>
            <span>به وقت تهران</span>
            <span className="lm-clock__time" data-clock-time />
            <span aria-hidden="true">•</span>
            <span className="lm-clock__date" data-clock-date />
          </p>
          <NavMenu brand={brand} items={links} ctaLabel={ctaLabel} ctaHref={CONTACT_HREF} />
          <PillButton href={CONTACT_HREF} variant="accent" className="lm-header__cta">
            {ctaLabel}
          </PillButton>
        </div>
      </div>
    </header>
  );
}

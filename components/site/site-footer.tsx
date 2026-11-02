import Link from "next/link";
import type { HomeData, LandingData } from "@/lib/content/landing";
import { SOCIAL_NETWORKS, type SocialKey } from "@/lib/validation/settings";
import { BrandMark } from "./ui";

const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" });

type Props = {
  brand: string;
  ctaLabel: string;
  /** A plain link (tel:, https:// or #anchor from the site settings; /contact, the contact form, until one is saved), never a button. */
  consultHref: string;
  texts: Pick<HomeData["texts"], "footerTagline" | "footerLegal" | "bandTitle">;
  links: Array<{ label: string; href: string }>;
  services: LandingData["services"];
  socials: Record<string, string>;
};

/** The ink footer: the consultation link, the brand and its tagline, the section links, the services, the socials, the legal line and a big faint brand name. */
export function SiteFooter({ brand, ctaLabel, consultHref, texts, links, services, socials }: Props) {
  const socialLinks = Object.entries(socials).filter(([key]) => key in SOCIAL_NETWORKS) as Array<[SocialKey, string]>;
  return (
    <footer className="lm-foot lm-page">
      <div className="lm-shell lm-foot__inner">
        <div className="lm-foot__cta">
          <p className="lm-foot__lead">{texts.bandTitle}</p>
          <a className="lm-foot__link" href={consultHref} {...(consultHref.startsWith("https://") ? { rel: "noopener noreferrer" } : {})}>
            {ctaLabel}
          </a>
        </div>
        <div className="lm-foot__cols">
          <div>
            <span className="lm-brand">
              <BrandMark className="lm-brand__mark" />
              {brand}
            </span>
            <p className="lm-foot__tag">{texts.footerTagline}</p>
          </div>
          {links.length > 0 ? (
            <nav aria-label="بخش‌های صفحه (پایین صفحه)">
              <h2 className="lm-foot__h">بخش‌ها</h2>
              <ul className="lm-foot__list">
                {links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <span />
          )}
          {services.length > 0 ? (
            <div>
              <h2 className="lm-foot__h">خدمات</h2>
              <ul className="lm-foot__list">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link href="/#services">{s.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span />
          )}
          {socialLinks.length > 0 ? (
            <div>
              <h2 className="lm-foot__h">شبکه‌ها</h2>
              <ul className="lm-foot__list">
                {socialLinks.map(([key, url]) => (
                  <li key={key}>
                    <a href={url} rel="noopener noreferrer">
                      {SOCIAL_NETWORKS[key]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span />
          )}
        </div>
        <p className="lm-foot__legal">
          <span>
            © {year.format(new Date())} {brand}. {texts.footerLegal}
          </span>
        </p>
      </div>
      <span className="lm-foot__mark" aria-hidden="true" dir="ltr">
        {brand}
      </span>
    </footer>
  );
}

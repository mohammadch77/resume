import type { ReactNode } from "react";
import { Arrow, BrandMark } from "./icons";
import { TagChip } from "./tag-chip";

export type PortfolioCardProps = {
  href: string;
  title: string;
  description: string;
  /** The meta row, already formatted: category, then year (Persian digits). */
  category: string;
  year?: string;
  tags: string[];
  /** The cover (a <picture>); without it the card shows the brand mark. It fills the card and sits under a scrim. */
  cover?: ReactNode;
  /** Extra data-* attributes for the link (the case-study opener reads them). */
  linkProps?: Record<`data-${string}`, string>;
};

/** An ink project card (Lumora's portfolio tile): meta row, cover or mark, name, line of description, tags. The whole card is one link. */
export function PortfolioCard({ href, title, description, category, year, tags, cover, linkProps }: PortfolioCardProps) {
  return (
    <a className="lm-card" href={href} {...linkProps}>
      {cover ? (
        <span className="lm-card__cover">{cover}</span>
      ) : (
        <span className="lm-card__mark">
          <BrandMark />
        </span>
      )}
      <span className="lm-card__meta">
        <span>{year ? `${category} — ${year}` : category}</span>
        <span className="lm-card__badge">
          <Arrow kind="up" />
        </span>
      </span>
      <span className="lm-card__body">
        <h3 className="lm-card__title">{title}</h3>
        <p className="lm-card__text">{description}</p>
        {tags.length > 0 ? (
          <span className="lm-card__tags">
            {tags.map((t) => (
              <TagChip key={t}>{t}</TagChip>
            ))}
          </span>
        ) : null}
      </span>
    </a>
  );
}

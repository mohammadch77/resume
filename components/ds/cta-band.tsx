import { useId } from "react";
import { Button } from "./button";

export type CtaBandProps = {
  title: string;
  text: string;
  /** Same label as the site-wide primary CTA. */
  ctaLabel: string;
  ctaHref: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

/** Closes a section: one sentence of context and the region's single primary action (the on-lapis button). */
export function CtaBand({ title, text, ctaLabel, ctaHref, headingLevel = 3, className = "" }: CtaBandProps) {
  const Heading = `h${headingLevel}` as const;
  const titleId = `${useId().replace(/:/g, "")}-t`;
  return (
    <section className={["gw-band", className].filter(Boolean).join(" ")} aria-labelledby={titleId}>
      <div>
        <Heading className="gw-band__title" id={titleId}>
          {title}
        </Heading>
        <p className="gw-band__text">{text}</p>
      </div>
      <Button variant="on-lapis" href={ctaHref} iconEnd="arrow-left">
        {ctaLabel}
      </Button>
    </section>
  );
}

/**
 * Call-to-action band (added by Grin Web): one sentence of context and the section's single primary action.
 * @startingPoint section="Sections" subtitle="Lapis CTA band, one primary action" viewport="1280x400"
 */
export interface CtaBandProps {
  title: string;
  text: string;
  /** Same label as the site-wide primary CTA. */
  ctaLabel: string;
  ctaHref: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}
export declare function CtaBand(props: CtaBandProps): JSX.Element;

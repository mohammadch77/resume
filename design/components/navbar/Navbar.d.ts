export interface NavLink { label: string; href: string; }
/**
 * Sticky capsule navbar: wordmark, in-page anchor links, the primary CTA. Collapses to a menu sheet under 900px.
 * @startingPoint section="Navigation" subtitle="Sticky capsule with anchors + CTA" viewport="1280x200"
 */
export interface NavbarProps {
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
}
export declare function Navbar(props: NavbarProps): JSX.Element;

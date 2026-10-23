/**
 * `sizes` attributes for ResponsivePicture. They describe how wide an image is rendered at each breakpoint, so the browser
 * picks the smallest sufficient variant. The px here are layout breakpoints and rendered widths of the landing's grid
 * (components/site/landing.css), not design values, which is why they live outside the design-adherence lint.
 */
export const IMAGE_SIZES = {
  /** Selected Work card: 420px wide strip card from 760px up, full width below. */
  card: "(min-width: 760px) 420px, 100vw",
  /** Case-study modal cover. */
  modal: "(min-width: 960px) 880px, 100vw",
  /** Cover on /work/<slug> (content width 1200px minus gutters). */
  work: "(min-width: 1200px) 1152px, 100vw",
  /** Hero covers. */
  hero: "(min-width: 1024px) 380px, 60vw",
  /** A gallery thumbnail. */
  gallery: "(min-width: 760px) 280px, 100vw",
  /** A client logo. */
  logo: "(min-width: 1024px) 160px, 33vw",
} as const;

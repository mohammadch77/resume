import { ArrowRight, ArrowUpRight, Menu, Star, X } from "lucide-react";

/** The page's own mark: an arch, after the shape on the hero monitor. Decorative; the brand name is always text beside it. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M2 22V11a10 10 0 0 1 20 0v11h-7V11a3 3 0 0 0-6 0v11z" />
    </svg>
  );
}

/** Arrows point forward (towards the line's end) and up-and-forward; in RTL they are mirrored by CSS (.lm-mirror). */
export function Arrow({ kind }: { kind: "forward" | "up" }) {
  const Glyph = kind === "up" ? ArrowUpRight : ArrowRight;
  return <Glyph className="lm-mirror" size="1em" strokeWidth={2} aria-hidden="true" focusable="false" />;
}

export { Menu as MenuIcon, Star as StarIcon, X as CloseIcon };

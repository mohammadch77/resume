"use client";

import { useSyncExternalStore } from "react";
import { formatNumber } from "@/lib/format";

/** Index (0-based) of the card at the start edge of the strip. Scroll offsets are negative in RTL, hence the abs(). */
function currentIndex(strip: HTMLElement | null, count: number): number {
  const first = strip?.firstElementChild as HTMLElement | null;
  if (!strip || !first || count <= 1) return 0;
  // At the very end the last card is the current one, even when the cards fit and none of them can reach the start edge.
  if (Math.abs(strip.scrollLeft) >= strip.scrollWidth - strip.clientWidth - 2 && strip.scrollWidth > strip.clientWidth) return count - 1;
  const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0;
  const step = first.getBoundingClientRect().width + gap;
  return Math.min(count - 1, Math.max(0, Math.round(Math.abs(strip.scrollLeft) / step)));
}

/**
 * The thin lapis progress line with «۱ از ۴» that follows the horizontal strip of project cards. It reads the strip's
 * scroll position (an external store), so there is no effect and no state to keep in sync. Hidden by CSS where the
 * strip is a vertical list (under 760px). Part of the site, not the design system: it is page-specific composition.
 */
export function StripProgress({ stripId, count }: { stripId: string; count: number }) {
  const index = useSyncExternalStore(
    (notify) => {
      const strip = document.getElementById(stripId);
      strip?.addEventListener("scroll", notify, { passive: true });
      window.addEventListener("resize", notify);
      return () => {
        strip?.removeEventListener("scroll", notify);
        window.removeEventListener("resize", notify);
      };
    },
    () => currentIndex(document.getElementById(stripId), count),
    () => 0,
  );
  const share = count > 0 ? ((index + 1) / count) * 100 : 0;
  return (
    <div className="lk-wrap lk-progress">
      <div className="lk-progress__track" aria-hidden="true">
        <div className="lk-progress__bar" style={{ inlineSize: `${share}%` }} />
      </div>
      <span aria-live="polite">
        {formatNumber(index + 1)} از {formatNumber(count)}
      </span>
    </div>
  );
}

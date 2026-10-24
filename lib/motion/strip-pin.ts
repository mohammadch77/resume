import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

/** design/guidelines/motion.md, moment 2: wide enough, a mouse-like pointer, no reduced motion. Tall enough is checked against the real section. */
const QUERY = "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const PIN_MARGIN = 16;

/**
 * Pins the Selected Work section while vertical scroll moves its strip along the inline axis.
 *
 * The pin itself is native CSS: `.lk-pinned .lk-pin` is `position: sticky`, and a spacer as tall as the strip's
 * horizontal reach, added after it, is what makes it stick for that long. Nothing is moved in the DOM (a library pin
 * wraps the section in a new element, which makes the focused element lose focus), and the compositor does the pinning, so
 * there is no jitter against Lenis. GSAP's ScrollTrigger only reports the progress of that stretch.
 *
 * The strip stays what it always was, a native horizontal scroller: the scroll position is driven through its own
 * `scrollLeft` instead of a transform. That keeps one source of truth for everything that already reads it (the «۱ از ۴»
 * progress, find-in-page, keyboard focus), at the cost of the "transform only" rule: setting `scrollLeft` is a scroll
 * operation, it triggers no layout and no paint of its own.
 *
 * - RTL: `scrollLeft` runs from 0 to a negative number, hence `sign`.
 * - Keyboard focus: tabbing to a card makes the browser scroll the strip, which would fall out of step with the page
 *   scroll that drives it. The page is moved to the matching position, so a focused card is always on screen.
 * - It does nothing where the section does not fit the viewport (it would be cut off), or once the visitor has already
 *   scrolled past it (the spacer would shift what they are reading).
 */
export function pinStrip(lenis: Lenis | null): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const unsubscribe = lenis?.on("scroll", ScrollTrigger.update);
  const mm = gsap.matchMedia();

  mm.add(QUERY, () => {
    const section = document.getElementById("work");
    if (!section) return;
    // The section's own bottom padding may scroll out of view while pinned; its content (down to the progress line) may not.
    const last = section.querySelector(".lk-progress") ?? section;
    const needed = last.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
    const fits = needed + PIN_MARGIN <= window.innerHeight;
    const passed = window.scrollY > section.offsetTop + section.offsetHeight;
    if (!fits || passed) return;

    const strip = () => document.getElementById("work-strip");
    const reach = () => {
      const el = strip();
      return el ? Math.max(0, el.scrollWidth - el.clientWidth) : 0;
    };
    const sign = getComputedStyle(section).direction === "rtl" ? -1 : 1;
    let syncing = false;
    const apply = (progress: number) => {
      const el = strip();
      if (el && !syncing) el.scrollLeft = sign * progress * reach();
    };

    const pin = section.querySelector<HTMLElement>(".lk-pin");
    if (!pin) return;
    const spacer = document.createElement("div");
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.blockSize = `${reach()}px`;
    pin.after(spacer);
    section.classList.add("lk-pinned");
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${Math.max(1, reach())}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => {
        spacer.style.blockSize = `${reach()}px`;
        apply(self.progress);
      },
    });
    const focused = section.contains(document.activeElement) ? document.activeElement : null;

    // The filter chips replace the strip element (and so its length): measure again.
    let queued = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    observer.observe(pin, { childList: true, subtree: true });

    const syncTo = (target: EventTarget | null) => {
      const el = strip();
      if (!el || !(target instanceof Node) || !el.contains(target)) return;
      syncing = true; // while the browser brings the card into view, the page scroll must not overwrite the strip
      requestAnimationFrame(() => {
        // The browser only makes the focused link visible; the whole card must be (the link is at the card's foot).
        const card = target instanceof Element ? target.closest(".gw-project") : null;
        if (card) {
          const view = el.getBoundingClientRect();
          const box = card.getBoundingClientRect();
          if (box.left < view.left) el.scrollLeft += box.left - view.left;
          else if (box.right > view.right) el.scrollLeft += box.right - view.right;
        }
        const range = reach();
        if (range > 0) {
          const progress = Math.min(1, Math.abs(el.scrollLeft) / range);
          const y = trigger.start + progress * (trigger.end - trigger.start);
          if (Math.abs(window.scrollY - y) > 1) {
            if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo(0, y);
          }
        }
        requestAnimationFrame(() => {
          syncing = false;
          trigger.update();
        });
      });
    };
    const onFocus = (event: FocusEvent) => syncTo(event.target);
    section.addEventListener("focusin", onFocus);
    // The pin is built on the first interaction, which may itself be the Tab that focused a card.
    syncTo(focused);

    return () => {
      section.removeEventListener("focusin", onFocus);
      observer.disconnect();
      cancelAnimationFrame(queued);
      spacer.remove();
      section.classList.remove("lk-pinned");
    };
  });

  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => {
    mm.revert();
    unsubscribe?.();
  };
}

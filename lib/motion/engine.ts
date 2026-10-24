import gsap from "gsap";
import Lenis from "lenis";
import type { MotionEffect } from "./caps-script";
import { onScrollLock } from "./scroll-lock";

/** Whatever shows a visitor is about to scroll or tab around; before that the pin has nothing to do. */
const INTERACTIONS = ["pointermove", "wheel", "keydown", "pointerdown", "scroll", "focusin"] as const;

/**
 * ScrollTrigger and the pin set-up (layout reads, spacing) wait for the first interaction instead of competing with
 * the page load: measured, doing it at idle cost +75 ms Total Blocking Time (desktop profile), 18.5 KB gzip, and nobody
 * is using the strip yet. The first mouse movement is enough (a wheel turn nearly always follows one), so the cost is
 * paid before the visitor scrolls rather than in the middle of it.
 */
function pinOnFirstInteraction(lenis: Lenis | null): () => void {
  let stop: (() => void) | undefined;
  let cancelled = false;
  const listen = (on: boolean) => {
    for (const type of INTERACTIONS) (on ? window.addEventListener : window.removeEventListener).call(window, type, begin, { capture: true, passive: true });
  };
  function begin() {
    if (document.querySelector('[role="dialog"]')) return; // the dialog lives inside the section: wait until it is closed
    listen(false);
    // Two tasks instead of one: fetching and evaluating the module, then (when the browser is idle) building the pin.
    void import("./strip-pin").then((m) => {
      const build = () => {
        if (!cancelled) stop = m.pinStrip(lenis);
      };
      if (typeof requestIdleCallback === "function") requestIdleCallback(build, { timeout: 500 });
      else setTimeout(build, 50);
    });
  }
  listen(true);
  return () => {
    cancelled = true;
    listen(false);
    stop?.();
  };
}

/**
 * The lazily loaded motion engine (GSAP + Lenis). It is only ever reached through a dynamic import from
 * components/site/motion-root.tsx, after first paint, and never for a visitor whose capabilities ruled motion out.
 * Returns the teardown.
 */
export async function startMotion(effects: ReadonlySet<MotionEffect>): Promise<() => void> {
  const teardown: Array<() => void> = [];
  let lenis: Lenis | null = null;
  if (effects.has("lenis")) {
    // Desktop wheel smoothing only (syncTouch off, reduced motion respected: both are Lenis defaults we keep).
    // One clock for everything: GSAP's ticker drives Lenis, so autoRaf stays off.
    lenis = new Lenis({ syncTouch: false, anchors: true, autoRaf: false });
    const instance = lenis;
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    teardown.push(onScrollLock((locked) => (locked ? instance.stop() : instance.start())));
    teardown.push(() => {
      gsap.ticker.remove(tick);
      instance.destroy();
    });
  }
  if (effects.has("pin")) teardown.push(pinOnFirstInteraction(lenis));
  document.documentElement.setAttribute("data-motion-ready", [...effects].join(" "));
  return () => {
    document.documentElement.removeAttribute("data-motion-ready");
    for (const fn of teardown.reverse()) fn();
  };
}

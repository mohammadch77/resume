import gsap from "gsap";
import Lenis from "lenis";
import type { MotionEffect } from "./caps-script";
import { onScrollLock } from "./scroll-lock";

/**
 * The lazily loaded motion engine (GSAP + Lenis). It is only ever reached through a dynamic import from
 * components/site/motion-root.tsx, after first paint, and never for a visitor whose capabilities ruled motion out.
 * Returns the teardown.
 */
export async function startMotion(effects: ReadonlySet<MotionEffect>): Promise<() => void> {
  const teardown: Array<() => void> = [];
  if (effects.has("lenis")) {
    // Desktop wheel smoothing only (syncTouch off, reduced motion respected: both are Lenis defaults we keep).
    // One clock for everything: GSAP's ticker drives Lenis, so autoRaf stays off.
    const lenis = new Lenis({ syncTouch: false, anchors: true, autoRaf: false });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    teardown.push(onScrollLock((locked) => (locked ? lenis.stop() : lenis.start())));
    teardown.push(() => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    });
  }
  document.documentElement.setAttribute("data-motion-ready", [...effects].join(" "));
  return () => {
    document.documentElement.removeAttribute("data-motion-ready");
    for (const fn of teardown.reverse()) fn();
  };
}

"use client";

import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { readMotion } from "@/lib/motion/caps-script";

/**
 * Starts the motion engine after first paint (requestIdleCallback, setTimeout where it is missing). Renders nothing.
 * The engine (GSAP, Lenis) is a dynamic import: it never enters the first bundle and is never fetched when the visitor
 * gets no scripted motion (see lib/motion/caps-script.ts).
 */
export function MotionRoot() {
  useEffect(() => {
    const effects = readMotion();
    const engine = effects.has("lenis") || effects.has("pin");
    const trail = effects.has("trail") ? document.querySelector<HTMLElement>("[data-trail-src]") : null;
    if (!engine && !trail) return;
    let stop: (() => void) | undefined;
    let stopTrail: (() => void) | undefined;
    let cancelled = false;
    const start = () => {
      if (engine) {
        void import("@/lib/motion/engine")
          .then((m) => m.startMotion(effects))
          .then((teardown) => {
            if (cancelled) teardown();
            else stop = teardown;
          });
      }
      if (trail) {
        // its own small chunk, with no GSAP or Lenis in it
        void import("@/lib/motion/hero-trail").then((m) => {
          if (cancelled) return;
          stopTrail = m.startHeroTrail(trail);
        });
      }
    };
    const idle = typeof requestIdleCallback === "function" ? requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (typeof requestIdleCallback === "function") cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      stop?.();
      stopTrail?.();
    };
  }, []);
  return null;
}

"use client";

import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { readMotion } from "@/lib/motion/caps-script";

/**
 * Starts, after first paint (requestIdleCallback, setTimeout where it is missing), the small things the page does with script. Renders
 * nothing. Each one is its own dynamic import and is fetched only when the page has the element it works on:
 *   - the Tehran clock and the hero carousel (everybody: they are information, not motion);
 *   - the figure counters (when the visitor gets the entrance motion);
 *   - the hero's pointer trail (a desktop with a fine pointer, see lib/motion/caps-script.ts);
 *   - the smooth-scroll engine (GSAP + Lenis; desktop wheel only).
 * None of them is in the first bundle, and a visitor whose capabilities ruled motion out never fetches the last three.
 */
export function MotionRoot() {
  useEffect(() => {
    const effects = readMotion();
    const stops: Array<() => void> = [];
    let cancelled = false;
    const keep = (stop: (() => void) | undefined) => {
      if (!stop) return;
      if (cancelled) stop();
      else stops.push(stop);
    };
    const start = () => {
      const clock = document.querySelector<HTMLElement>("[data-clock]");
      if (clock) void import("@/lib/motion/clock").then((m) => keep(m.startClock(clock)));
      const carousel = document.querySelector<HTMLElement>("[data-carousel]");
      if (carousel) void import("@/lib/motion/hero-carousel").then((m) => keep(m.startCarousel(carousel)));
      if (effects.has("enter") && document.querySelector("[data-count]")) void import("@/lib/motion/count-up").then((m) => keep(m.startCountUp()));
      const trail = effects.has("trail") ? document.querySelector<HTMLElement>("[data-trail-src]") : null;
      if (trail) void import("@/lib/motion/hero-trail").then((m) => keep(m.startHeroTrail(trail)));
      if (effects.has("lenis")) void import("@/lib/motion/engine").then((m) => m.startMotion(effects)).then((teardown) => keep(teardown));
    };
    const idle = typeof requestIdleCallback === "function" ? requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (typeof requestIdleCallback === "function") cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      for (const stop of stops.reverse()) stop();
    };
  }, []);
  return null;
}

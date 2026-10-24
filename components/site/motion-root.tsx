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
    const scripted = [...effects].some((e) => e !== "enter");
    if (!scripted) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () => {
      void import("@/lib/motion/engine")
        .then((m) => m.startMotion(effects))
        .then((teardown) => {
          if (cancelled) teardown();
          else stop = teardown;
        });
    };
    const idle = typeof requestIdleCallback === "function" ? requestIdleCallback(start, { timeout: 2000 }) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (typeof requestIdleCallback === "function") cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      stop?.();
    };
  }, []);
  return null;
}

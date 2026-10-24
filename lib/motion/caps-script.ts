/**
 * The one place that decides which motion a visitor gets. It is a tiny inline script (the first thing in <body>) that
 * sets `data-motion="enter lenis pin"` on <html> before anything paints; CSS and the lazy engine both read that
 * attribute, so there is a single source of truth and the rules of design/guidelines/motion.md live here only.
 *
 * - nothing for reduced motion, saveData, <= 4 cores, <= 4 GB memory, or no IntersectionObserver;
 * - `enter` (hero entrance, CSS only) for everybody else;
 * - `lenis` and `pin` (wheel smoothing, pinned strip) only with a mouse-like pointer;
 * - `?motion=enter,pin` limits the set to the listed effects (`?motion=none` turns all off): a support switch that
 *   also lets scripts/motion-ab.ts measure an effect on and off in the same build.
 */
export const MOTION_EFFECTS = ["enter", "lenis", "pin"] as const;
export type MotionEffect = (typeof MOTION_EFFECTS)[number];

export const CAPS_SCRIPT = `(function(w,n,d){try{var c=n.connection||{},m=function(q){return w.matchMedia(q).matches};if(m("(prefers-reduced-motion: reduce)")||c.saveData||n.hardwareConcurrency<=4||n.deviceMemory<=4||!("IntersectionObserver" in w))return;var t=["enter"];if(m("(hover: hover) and (pointer: fine)"))t.push("lenis","pin");var q=/[?&]motion=([^&]*)/.exec(w.location.search);if(q){var a=decodeURIComponent(q[1]).split(",");t=t.filter(function(x){return a.indexOf(x)>-1})}if(t.length)d.documentElement.setAttribute("data-motion",t.join(" "))}catch(e){}})(window,navigator,document)`;

/** The effects switched on for this visitor (empty on the server and when the script set nothing). */
export function readMotion(root: Pick<HTMLElement, "getAttribute"> = document.documentElement): Set<MotionEffect> {
  const tokens = (root.getAttribute("data-motion") ?? "").split(" ");
  return new Set(MOTION_EFFECTS.filter((e) => tokens.includes(e)));
}

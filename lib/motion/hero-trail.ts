/**
 * The hero's pointer trail: moving the mouse over the monitor paints a soft brush of the second (bold) picture over the first, and the
 * paint decays by itself. One canvas, no library (this is not GSAP: it is a plain 2D canvas and a requestAnimationFrame loop), loaded as
 * its own small chunk only for a visitor whose capabilities include `trail` (lib/motion/caps-script.ts: a desktop with a fine pointer,
 * no reduced motion, no saveData, not a 2 GB device). The speed of the machine is not guessed from its core count (Firefox reports 4 on
 * ordinary laptops): a frame guard (./frame-guard.ts) stops the effect and removes the canvas if its first 2 s of drawing average over 30 ms a frame. The second picture is not fetched before the first pointer movement
 * (or, failing that, an idle moment), so it costs the first paint nothing.
 *
 * Mechanics (the reference's LiquidReveal): brush radius 143 CSS px, the existing trail fades by `decay` per frame, faster while the
 * pointer rests, and everything is cleared after 120 idle frames, when the loop stops. The canvas is clipped to the silhouette of
 * the monitor with a CSS mask made from the base picture, so nothing is ever painted outside the monitor.
 */
import { createFrameGuard } from "./frame-guard";

const BRUSH_RADIUS = 143;
const DECAY = 0.016;
const FADE_FRAMES = 120;
const MAX_STEPS = 60;

type Point = { x: number; y: number };

export function startHeroTrail(host: HTMLElement): () => void {
  const src = host.dataset.trailSrc;
  const maskSrc = host.dataset.trailMask;
  if (!src || !maskSrc) return () => undefined;

  let disposed = false;
  let canvas: HTMLCanvasElement | null = null;
  let stopCanvas: (() => void) | null = null;

  const load = () => {
    removeFirst();
    if (disposed || canvas) return;
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    void image
      .decode()
      .then(() => {
        if (disposed) return;
        const mounted = mount(host, image, maskSrc);
        canvas = mounted.canvas;
        stopCanvas = mounted.stop;
        host.setAttribute("data-trail-ready", "");
      })
      .catch(() => undefined); // a missing second picture only means no effect
  };

  const firstEvents = ["pointermove", "pointerdown"] as const;
  const removeFirst = () => {
    for (const type of firstEvents) window.removeEventListener(type, load);
    if (idleHandle !== undefined) {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idleHandle);
      else clearTimeout(idleHandle);
    }
  };
  for (const type of firstEvents) window.addEventListener(type, load, { passive: true, once: true });
  const idleHandle: number | undefined = typeof requestIdleCallback === "function" ? requestIdleCallback(load, { timeout: 4000 }) : (setTimeout(load, 2500) as unknown as number);

  return () => {
    disposed = true;
    removeFirst();
    stopCanvas?.();
    canvas?.remove();
    host.removeAttribute("data-trail-ready");
  };
}

function mount(host: HTMLElement, image: HTMLImageElement, maskSrc: string): { canvas: HTMLCanvasElement; stop: () => void } {
  const canvas = document.createElement("canvas");
  canvas.className = "lm-monitor__trail";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.maskImage = `url("${maskSrc}")`;
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, stop: () => undefined };
  const ctx2d = ctx;

  const cover = document.createElement("canvas");
  const brush = document.createElement("canvas");
  const coverCtx = cover.getContext("2d");
  const brushCtx = brush.getContext("2d");
  if (!coverCtx || !brushCtx) return { canvas, stop: () => undefined };

  let dpr = 1;
  let radius = BRUSH_RADIUS;
  let width = 0;
  let height = 0;
  let visible = true;
  let last: Point | null = null;
  let queue: Point[] = [];
  let idle = 0;
  let frame = 0;
  const guard = createFrameGuard();
  let tooSlow = false;

  function measure() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.round(rect.width * dpr);
    height = Math.round(rect.height * dpr);
    canvas.width = cover.width = width;
    canvas.height = cover.height = height;
    // the two pictures are the same size, so "cover" is the whole picture stretched to the canvas
    coverCtx!.clearRect(0, 0, width, height);
    coverCtx!.drawImage(image, 0, 0, width, height);
    radius = BRUSH_RADIUS * dpr;
    brush.width = brush.height = Math.ceil(radius * 2);
  }

  function stamp(px: number, py: number) {
    const diameter = brush.width;
    const c = diameter / 2;
    brushCtx!.globalCompositeOperation = "source-over";
    brushCtx!.clearRect(0, 0, diameter, diameter);
    const g = brushCtx!.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.55, "rgba(255,255,255,0.82)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    brushCtx!.fillStyle = g;
    brushCtx!.fillRect(0, 0, diameter, diameter);
    brushCtx!.globalCompositeOperation = "source-in";
    brushCtx!.drawImage(cover, px - c, py - c, diameter, diameter, 0, 0, diameter, diameter);
    ctx2d.globalCompositeOperation = "source-over";
    ctx2d.drawImage(brush, px - c, py - c);
  }

  function tick(now: number) {
    frame = 0;
    if (!visible || tooSlow) return;
    const drawing = queue.length > 0;
    if (drawing) idle = 0;
    else {
      idle += 1;
      if (idle > FADE_FRAMES) return;
    }
    const fade = drawing ? DECAY : Math.min(DECAY + idle * 0.004, 0.5);
    ctx2d.globalCompositeOperation = "destination-out";
    ctx2d.fillStyle = `rgba(0,0,0,${fade})`;
    ctx2d.fillRect(0, 0, width, height);
    if (drawing) {
      for (const p of queue) stamp(p.x, p.y);
      queue = [];
    }
    if (idle >= FADE_FRAMES) {
      ctx2d.clearRect(0, 0, width, height);
      return;
    }
    if (guard.frame(now)) {
      giveUp();
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  /** Too slow on this machine: stop, forget the paint and leave the base picture alone. */
  function giveUp() {
    tooSlow = true;
    queue = [];
    last = null;
    ctx2d.clearRect(0, 0, width, height);
    teardown();
    canvas.remove();
    host.removeAttribute("data-trail-ready");
  }
  const wake = () => {
    if (!frame && visible && !tooSlow) frame = requestAnimationFrame(tick);
  };

  function onMove(e: PointerEvent) {
    if (!visible || width === 0) return;
    const rect = canvas.getBoundingClientRect();
    const p = { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
    // far outside the monitor: nothing to paint, and the next stroke starts fresh
    if (p.x < -radius || p.y < -radius || p.x > width + radius || p.y > height + radius) {
      last = null;
      return;
    }
    if (last) {
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      const step = Math.max(radius * 0.3, 1);
      const n = Math.min(Math.ceil(dist / step), MAX_STEPS);
      for (let i = 1; i < n; i += 1) queue.push({ x: last.x + ((p.x - last.x) * i) / n, y: last.y + ((p.y - last.y) * i) / n });
    }
    queue.push(p);
    last = p;
    wake();
  }

  measure();
  const resize = new ResizeObserver(() => {
    measure();
    wake();
  });
  resize.observe(canvas);
  // paused (and the paint forgotten) while the monitor is off screen
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      queue = [];
      last = null;
      ctx2d.clearRect(0, 0, width, height);
    }
  });
  io.observe(host);
  window.addEventListener("pointermove", onMove, { passive: true });

  function teardown() {
    window.removeEventListener("pointermove", onMove);
    resize.disconnect();
    io.disconnect();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  return { canvas, stop: teardown };
}

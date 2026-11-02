/**
 * Runtime guard for the hero's pointer trail: instead of guessing the hardware, watch the frames. It counts only the time the effect is
 * actually drawing (consecutive frames; a pause longer than `MAX_GAP_MS`, such as an idle stretch or a hidden tab, is not a slow frame).
 * Once it has seen `WINDOW_MS` of drawing, it says "stop" if the mean frame time was above `MAX_MEAN_MS`, and then never speaks again.
 */
export const WINDOW_MS = 2000;
export const MAX_MEAN_MS = 30;
const MAX_GAP_MS = 250;

export type FrameGuard = {
  /** Call once per frame with a timestamp in ms; returns true exactly once, when the effect is too slow and must stop. */
  frame(now: number): boolean;
};

export function createFrameGuard(): FrameGuard {
  let prev: number | null = null;
  let active = 0;
  let frames = 0;
  let done = false;
  return {
    frame(now) {
      if (done) return false;
      const delta = prev === null ? null : now - prev;
      prev = now;
      if (delta === null || delta > MAX_GAP_MS || delta < 0) return false;
      active += delta;
      frames += 1;
      if (active < WINDOW_MS) return false;
      done = true;
      return active / frames > MAX_MEAN_MS;
    },
  };
}

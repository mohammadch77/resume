import { describe, expect, it } from "vitest";
import { createFrameGuard, MAX_MEAN_MS, WINDOW_MS } from "@/lib/motion/frame-guard";

/** Feeds frames `step` ms apart (a fake clock) until `until` ms have passed; returns the time the guard said stop, or null. */
function drive(step: number, until = WINDOW_MS + 500, start = 1000) {
  const guard = createFrameGuard();
  for (let t = start; t <= start + until; t += step) if (guard.frame(t)) return t - start;
  return null;
}

describe("the hero trail's frame guard (lib/motion/frame-guard.ts)", () => {
  it("a smooth 60 fps run is never stopped", () => {
    expect(drive(16.7)).toBeNull();
  });
  it("30 ms a frame on average is the limit and is allowed", () => {
    expect(drive(MAX_MEAN_MS)).toBeNull();
  });
  it("a slow run (50 ms a frame) stops after the first 2 s of drawing, not before", () => {
    const at = drive(50);
    expect(at).not.toBeNull();
    expect(at!).toBeGreaterThanOrEqual(WINDOW_MS);
    expect(at!).toBeLessThan(WINDOW_MS + 100);
  });
  it("a short hiccup in an otherwise fast run is not enough", () => {
    const guard = createFrameGuard();
    let t = 0;
    let stopped = false;
    for (let i = 0; i < 200; i += 1) {
      t += i === 20 ? 200 : 16.7;
      stopped ||= guard.frame(t);
    }
    expect(stopped).toBe(false);
  });
  it("pauses (idle stretch, hidden tab) are not counted as slow frames", () => {
    const guard = createFrameGuard();
    let t = 0;
    let stopped = false;
    for (let burst = 0; burst < 40; burst += 1) {
      t += 5000; // the loop slept
      for (let i = 0; i < 10; i += 1) stopped ||= guard.frame((t += 16.7));
    }
    expect(stopped).toBe(false);
  });
  it("says stop exactly once", () => {
    const guard = createFrameGuard();
    const answers: boolean[] = [];
    for (let t = 0; t <= 4000; t += 50) answers.push(guard.frame(t));
    expect(answers.filter(Boolean)).toHaveLength(1);
  });
});

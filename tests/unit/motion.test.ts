import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAPS_SCRIPT, readMotion } from "@/lib/motion/caps-script";

type Env = { reduced?: boolean; mouse?: boolean; saveData?: boolean; cores?: number; memory?: number; observer?: boolean; search?: string };

/** Runs the inline script against a fake browser and returns the `data-motion` it sets (null when it sets nothing). */
function run({ reduced = false, mouse = true, saveData = false, cores = 8, memory = 8, observer = true, search = "" }: Env = {}): string | null {
  let attr: string | null = null;
  const win = {
    matchMedia: (q: string) => ({ matches: q.includes("prefers-reduced-motion") ? reduced : q.includes("pointer: fine") ? mouse : false }),
    location: { search },
    ...(observer ? { IntersectionObserver: class {} } : {}),
  };
  const nav = { connection: { saveData }, hardwareConcurrency: cores, deviceMemory: memory };
  const doc = { documentElement: { setAttribute: (_: string, v: string) => (attr = v) } };
  new Function("window", "navigator", "document", CAPS_SCRIPT)(win, nav, doc);
  return attr;
}

describe("which motion a visitor gets (lib/motion/caps-script.ts)", () => {
  it("a capable desktop gets the hero entrance, wheel smoothing and the pinned strip", () => {
    expect(run()).toBe("enter lenis pin");
  });
  it("a touch device gets only the CSS entrance (no smoothing, no pin)", () => {
    expect(run({ mouse: false })).toBe("enter");
  });
  it.each([
    ["reduced motion", { reduced: true }],
    ["saveData", { saveData: true }],
    ["4 CPU cores", { cores: 4 }],
    ["4 GB of memory", { memory: 4 }],
    ["no IntersectionObserver", { observer: false }],
  ] as Array<[string, Env]>)("gets nothing with %s", (_name, env) => {
    expect(run(env)).toBeNull();
  });
  it("a missing deviceMemory (Firefox, Safari) does not count as low memory", () => {
    expect(run({ memory: undefined })).toBe("enter lenis pin");
  });
  it("?motion= limits the set, and none turns everything off", () => {
    expect(run({ search: "?motion=enter,pin" })).toBe("enter pin");
    expect(run({ search: "?x=1&motion=lenis" })).toBe("lenis");
    expect(run({ search: "?motion=none" })).toBeNull();
  });
  it("readMotion ignores unknown tokens", () => {
    expect([...readMotion({ getAttribute: () => "enter bogus pin" })]).toEqual(["enter", "pin"]);
    expect(readMotion({ getAttribute: () => null }).size).toBe(0);
  });
});

describe("the landing's CSS never relies on the motion script for visible content", () => {
  it("entrance rules are scoped to html[data-motion~=enter], so without the attribute everything is visible", () => {
    const css = readFileSync(path.join(process.cwd(), "components/site/landing.css"), "utf8");
    const rules = css.split("}").filter((r) => /lk-rise|lk-slide/.test(r) && /animation\s*:/.test(r));
    for (const rule of rules) expect(rule).toContain('html[data-motion~="enter"]');
  });
});

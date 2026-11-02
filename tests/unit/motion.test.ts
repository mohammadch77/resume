import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAPS_SCRIPT, readMotion } from "@/lib/motion/caps-script";

type Env = { reduced?: boolean; mouse?: boolean; saveData?: boolean; cores?: number; memory?: number; observer?: boolean; search?: string; width?: number };

/** Runs the inline script against a fake browser and returns the `data-motion` it sets (null when it sets nothing). */
function run({ reduced = false, mouse = true, saveData = false, cores = 8, memory = 8, observer = true, search = "", width = 1440 }: Env = {}): string | null {
  let attr: string | null = null;
  const win = {
    matchMedia: (q: string) => ({ matches: q.includes("prefers-reduced-motion") ? reduced : q.includes("pointer: fine") ? mouse : false }),
    location: { search },
    innerWidth: width,
    ...(observer ? { IntersectionObserver: class {} } : {}),
  };
  const nav = { connection: { saveData }, hardwareConcurrency: cores, deviceMemory: memory };
  const doc = { documentElement: { setAttribute: (_: string, v: string) => (attr = v) } };
  new Function("window", "navigator", "document", CAPS_SCRIPT)(win, nav, doc);
  return attr;
}

describe("which motion a visitor gets (lib/motion/caps-script.ts)", () => {
  it("a capable desktop gets the hero entrance, wheel smoothing and the hero's pointer trail", () => {
    expect(run()).toBe("enter lenis trail");
  });
  it("the pointer trail needs a viewport of 1024 px or more", () => {
    expect(run({ width: 1023 })).toBe("enter lenis");
    expect(run({ width: 1024 })).toBe("enter lenis trail");
  });
  it("a touch device gets only the CSS entrance (no smoothing, no pointer trail)", () => {
    expect(run({ mouse: false })).toBe("enter");
  });
  it.each([
    ["reduced motion", { reduced: true }],
    ["saveData", { saveData: true }],
    ["2 GB of memory", { memory: 2 }],
    ["no IntersectionObserver", { observer: false }],
  ] as Array<[string, Env]>)("gets nothing with %s", (_name, env) => {
    expect(run(env)).toBeNull();
  });
  it("the core count is not a reason: 4 cores (Firefox's report on an ordinary laptop) or even 1 still get the effects", () => {
    expect(run({ cores: 4 })).toBe("enter lenis trail");
    expect(run({ cores: 1 })).toBe("enter lenis trail");
  });
  it("4 GB of memory is fine; only a reported 2 GB or less switches the motion off; saveData must be exactly true", () => {
    expect(run({ memory: 4 })).toBe("enter lenis trail");
    expect(run({ memory: 8 })).toBe("enter lenis trail");
  });
  it("a missing deviceMemory (Firefox, Safari) does not count as low memory", () => {
    expect(run({ memory: undefined })).toBe("enter lenis trail");
  });
  it("?motion= limits the set, and none turns everything off", () => {
    expect(run({ search: "?motion=enter,lenis" })).toBe("enter lenis");
    expect(run({ search: "?motion=trail" })).toBe("trail");
    expect(run({ search: "?x=1&motion=lenis" })).toBe("lenis");
    expect(run({ search: "?motion=none" })).toBeNull();
  });
  it("readMotion ignores unknown tokens", () => {
    expect([...readMotion({ getAttribute: () => "enter bogus lenis" })]).toEqual(["enter", "lenis"]);
    expect(readMotion({ getAttribute: () => null }).size).toBe(0);
  });
});

describe("the landing's CSS never relies on the motion script for visible content", () => {
  it("entrance rules are scoped to html[data-motion~=enter], so without the attribute everything is visible", () => {
    for (const file of ["components/site/hero.css"]) {
      const css = readFileSync(path.join(process.cwd(), file), "utf8");
      const rules = css.split("}").filter((r) => /data-enter/.test(r));
      expect(rules.length, file).toBeGreaterThan(0);
      for (const rule of rules) expect(rule, file).toContain('html[data-motion~="enter"]');
    }
  });
});

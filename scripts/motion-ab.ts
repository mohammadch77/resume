import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { MOTION_EFFECTS, type MotionEffect } from "../lib/motion/caps-script.ts";

/**
 * `npm run motion:ab -- <effect> [runs]`: measures one motion effect on and off in the SAME build, alternating the two
 * arms (A, B, A, B ...) so machine drift hits both equally, and prints the medians of Lighthouse's mobile metrics.
 * Arm A is the page with the effects shipped so far (`MOTION_AB_BASE=enter,lenis`, default none), arm B the same plus
 * the one under test. An effect stays
 * only if B's Total Blocking Time is at most 25 ms above A's (CLAUDE.md section 3, Phase 6 rule).
 *
 * Profile: `enter` applies to every visitor and is measured on Lighthouse's mobile profile. `lenis` and `pin` exist only
 * for a mouse-like pointer, so a mobile profile never runs them (the A and B pages would be identical); they are measured
 * on the desktop profile with the CPU slowed 4x (a modest office PC, the slowest machine that still gets them).
 * This laptop reports 4 cores, which the capability gate treats as low-end, so the browser is told it has 8.
 *
 * Measure with Docker's containers and the dev server stopped: the script warms the ISR pages, then stops the test
 * database container itself (the cached pages need no database), so it must be able to start it first.
 * `MOTION_AB_BUILD=1` rebuilds first. Needs a Docker engine for the one-time seeding.
 */
const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
const PG = (process.env.TEST_PG_URL ?? "postgres://postgres:postgres@localhost:5434").replace(/^postgres:\/\/[^@]*@/, "");
const sh = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "inherit", shell: true });
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function waitFor(url: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${url} did not come up`);
}

type Flags = NonNullable<Parameters<typeof lighthouse>[1]>;
const DESKTOP: Flags = {
  formFactor: "desktop",
  screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 4, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
};

type Sample = { perf: number; tbt: number; lcp: number; cls: number; scriptKb: number };

async function main() {
  const effect = process.argv[2] as MotionEffect;
  const runs = Number(process.argv[3] ?? 5);
  if (!MOTION_EFFECTS.includes(effect)) throw new Error(`usage: motion:ab -- <${MOTION_EFFECTS.join("|")}> [runs]`);
  const flags: Flags = { onlyCategories: ["performance"], logLevel: "error", ...(effect === "enter" ? {} : DESKTOP) };
  const base = (process.env.MOTION_AB_BASE ?? "").split(",").filter(Boolean);
  const arms = { A: `${BASE}/?motion=${base.join(",") || "none"}`, B: `${BASE}/?motion=${[...base, effect].join(",")}` };

  if (sh("docker", ["compose", "-f", "deploy/docker-compose.test.yml", "up", "-d", "--wait"]).status !== 0) throw new Error("test database did not start");
  if (sh("npx", ["tsx", "scripts/e2e-db.ts"]).status !== 0) throw new Error("e2e database setup failed");
  if ((process.env.MOTION_AB_BUILD === "1" || !existsSync(".next/BUILD_ID")) && sh("npm", ["run", "build"]).status !== 0) throw new Error("build failed");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: `postgres://app_rw:app_rw@${PG}/gw_e2e`,
    SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123",
    SITE_URL: BASE,
    UPLOADS_DIR: ".e2e-uploads",
  };
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { shell: true, env, stdio: "ignore" });
  const samples: Record<"A" | "B", Sample[]> = { A: [], B: [] };
  try {
    await waitFor(`${BASE}/admin/login`);
    await waitFor(`${BASE}/`);
    sh("docker", ["compose", "-f", "deploy/docker-compose.test.yml", "stop"]);

    const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
    const attached = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
    try {
      await attached.contexts()[0].addInitScript(() => {
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
      });
      flags.port = chrome.port;
      await lighthouse(arms.A, flags); // discarded: warms Chrome's own caches
      for (let i = 0; i < runs; i += 1) {
        for (const arm of ["A", "B"] as const) {
          const result = await lighthouse(arms[arm], flags);
          const lhr = result?.lhr;
          if (!lhr) throw new Error("no Lighthouse result");
          const scripts = (lhr.audits["resource-summary"].details as unknown as { items: Array<{ resourceType: string; transferSize: number }> }).items.find((r) => r.resourceType === "script");
          samples[arm].push({
            perf: lhr.categories.performance.score ?? 0,
            tbt: lhr.audits["total-blocking-time"].numericValue ?? 0,
            lcp: lhr.audits["largest-contentful-paint"].numericValue ?? 0,
            cls: lhr.audits["cumulative-layout-shift"].numericValue ?? 0,
            scriptKb: (scripts?.transferSize ?? 0) / 1024,
          });
        }
      }
    } finally {
      await attached.close();
      await chrome.kill();
    }
  } finally {
    if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill("SIGTERM");
  }

  const med = (arm: "A" | "B", key: keyof Sample) => median(samples[arm].map((s) => s[key]));
  const row = (key: keyof Sample, digits: number) => {
    const a = med("A", key);
    const b = med("B", key);
    return `${key.padEnd(9)} off ${a.toFixed(digits).padStart(9)}   on ${b.toFixed(digits).padStart(9)}   delta ${(b - a).toFixed(digits).padStart(8)}`;
  };
  console.log(`\nEffect "${effect}" (median of ${runs} alternating runs; off = ?motion=${base.join(",") || "none"})`);
  for (const [key, digits] of [["perf", 2], ["tbt", 0], ["lcp", 0], ["cls", 3], ["scriptKb", 1]] as const) console.log(row(key, digits));
  console.log("all TBT  off:", samples.A.map((s) => Math.round(s.tbt)).join(" "), "  on:", samples.B.map((s) => Math.round(s.tbt)).join(" "));
  if (Math.abs(med("B", "scriptKb") - med("A", "scriptKb")) < 0.5) console.log("WARNING: both arms loaded the same scripts; the effect probably did not run (capability gate?)");
  const delta = med("B", "tbt") - med("A", "tbt");
  console.log(delta <= 25 ? `KEEP: TBT +${delta.toFixed(0)} ms is within the 25 ms limit` : `REJECT: TBT +${delta.toFixed(0)} ms is over the 25 ms limit`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});

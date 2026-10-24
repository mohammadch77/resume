import { chromium } from "@playwright/test";

/**
 * `node scripts/motion-cost.ts [runs]`: what the pinned strip costs at the moment it is built, which is the visitor's first
 * interaction (it is deliberately not built at load, so Lighthouse never sees it). Against an already running production
 * server (MOTION_BASE_URL, default http://localhost:3101), desktop viewport, CPU slowed 4x, 8 cores: wait until the
 * engine is idle, press a key, and sum the main-thread task time (CDP Performance.TaskDuration) until the pin exists.
 * The same is done on `?motion=enter,lenis` (no pin) as the control, so the engine's own idle work cancels out.
 */
const BASE = process.env.MOTION_BASE_URL ?? "http://localhost:3101";
const runs = Number(process.argv[2] ?? 7);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function once(browser: Awaited<ReturnType<typeof chromium.launch>>, query: string, expectPin: boolean) {
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 } });
  await context.addInitScript(() => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }));
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Performance.enable");
  await cdp.send("Network.enable");
  const sizes = new Map<string, number>();
  cdp.on("Network.loadingFinished", (e) => sizes.set(e.requestId, e.encodedDataLength));
  const scripts = new Set<string>();
  cdp.on("Network.responseReceived", (e) => e.type === "Script" && scripts.add(e.requestId));

  await page.goto(`${BASE}/${query}`);
  await page.waitForFunction(() => document.documentElement.dataset.motionReady !== undefined);
  await page.waitForTimeout(2500);
  const task = async () => ((await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "TaskDuration")?.value ?? 0) * 1000;
  const [taskBefore, scriptsBefore] = [await task(), scripts.size];
  await page.keyboard.press("Shift");
  if (expectPin) await page.waitForSelector("#work.lk-pinned");
  await page.waitForTimeout(1000);
  const taskMs = (await task()) - taskBefore;
  const kb = [...scripts].slice(scriptsBefore).reduce((sum, id) => sum + (sizes.get(id) ?? 0), 0) / 1024;
  await context.close();
  return { taskMs, kb };
}

const browser = await chromium.launch();
const withPin: Array<Awaited<ReturnType<typeof once>>> = [];
const without: Array<Awaited<ReturnType<typeof once>>> = [];
for (let i = 0; i < runs; i += 1) {
  without.push(await once(browser, "?motion=enter,lenis", false));
  withPin.push(await once(browser, "?motion=enter,lenis,pin", true));
}
await browser.close();
const m = (rows: typeof withPin, key: "taskMs" | "kb") => median(rows.map((r) => r[key]));
console.log(`Pin cost at the first interaction (median of ${runs}, CPU 4x, desktop viewport)`);
console.log(`main-thread task time in the 1 s after the key:  without ${m(without, "taskMs").toFixed(0)} ms   with ${m(withPin, "taskMs").toFixed(0)} ms   delta ${(m(withPin, "taskMs") - m(without, "taskMs")).toFixed(0)} ms`);
console.log(`scripts fetched after the key:                   without ${m(without, "kb").toFixed(1)} KB   with ${m(withPin, "kb").toFixed(1)} KB (gzip, on the wire)`);
console.log("task ms per run  without:", without.map((r) => Math.round(r.taskMs)).join(" "), "  with:", withPin.map((r) => Math.round(r.taskMs)).join(" "));

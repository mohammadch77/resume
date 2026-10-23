import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/** `npx tsx scripts/landing-shots.ts [baseUrl]`: full-page screenshots of the landing at 1440 and 390 px (light theme). */
const BASE = process.argv[2] ?? "http://localhost:3200";
const OUT = path.resolve(".cache/landing-shots");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [label, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]] as const) {
    const page = await browser.newPage({ viewport: { width, height }, locale: "fa-IR", reducedMotion: "reduce" });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      // lazy images below the fold: scroll through once so they load before the full-page capture
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `ours-${label}.png`), fullPage: true, animations: "disabled" });
    console.log(`ours-${label}: ${width}px`);
    await page.close();
  }
  await browser.close();
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});

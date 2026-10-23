import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

/**
 * `npm run ds:screenshots` (with `npm run dev` running): full-length screenshots of /dev/design-system, each theme at
 * desktop (1440) and phone (390) width, plus slices of at most SLICE px so they can be reviewed without scrolling.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3200";
const OUT = path.resolve(".cache/ds-screenshots");
const SLICE = 1800;
const WIDTHS = { desktop: 1440, phone: 390 } as const;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [label, width] of Object.entries(WIDTHS)) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: "fa-IR", reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(`${BASE}/dev/design-system`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) {
      const section = page.locator(`#theme-${theme}`);
      const file = path.join(OUT, `${theme}-${label}.png`);
      await section.screenshot({ path: file, animations: "disabled" });
      const { height } = await sharp(file).metadata();
      console.log(`${theme}-${label}: ${width}x${height}`);
      for (let top = 0, n = 1; top < (height ?? 0); top += SLICE, n += 1) {
        await sharp(file).extract({ left: 0, top, width, height: Math.min(SLICE, (height ?? 0) - top) }).toFile(path.join(OUT, `${theme}-${label}-${String(n).padStart(2, "0")}.png`));
      }
    }
    await context.close();
  }
  await browser.close();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

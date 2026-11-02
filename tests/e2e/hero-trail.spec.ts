import { expect, test, type Page } from "@playwright/test";

const monitor = (page: Page) => page.locator(".lm-monitor");

/** What Firefox reports on an ordinary laptop: 4 cores and no deviceMemory at all. The gate must not read that as a weak machine. */
async function firefoxLikeLaptop(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => undefined });
  });
}

/** Alpha statistics of the trail canvas: pixels that are not transparent, and pixels that are fully opaque. */
const alpha = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(".lm-monitor__trail");
    if (!c) return null;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let any = 0;
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) any += 1;
      if (data[i] === 255) opaque += 1;
    }
    return { any, opaque };
  });

test.describe("the hero's pointer trail on an ordinary desktop (Chromium and Firefox)", () => {
  test("moving the mouse over the monitor makes a canvas with opaque paint, and the second picture is really seen over the base", async ({ page }) => {
    await firefoxLikeLaptop(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", /\btrail\b/);
    const box = (await monitor(page).boundingBox())!;
    const before = await page.screenshot({ clip: box });

    // wake the effect (it loads the second picture at the first pointer movement), then paint
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4);
    await expect(monitor(page)).toHaveAttribute("data-trail-ready", "");
    await expect(page.locator(".lm-monitor__trail")).toHaveCount(1);
    // the paint fades by itself once the pointer rests, so sample while it moves and keep the best frame
    let most = 0;
    let during: Buffer | null = null;
    for (let i = 0; i <= 14; i += 1) {
      await page.mouse.move(box.x + box.width * (0.3 + 0.03 * i), box.y + box.height * 0.45, { steps: 2 });
      most = Math.max(most, (await alpha(page))?.opaque ?? 0);
      if (i === 8) during = await page.screenshot({ clip: box });
    }
    expect(most, "opaque (alpha 255) pixels on the trail canvas at the best moment").toBeGreaterThan(300);
    // the painted pixels are in the picture the visitor sees, not only in a canvas: the monitor looks different from before
    expect(during!.equals(before), "the monitor looks the same with the trail painted").toBe(false);
    await expect(page.locator(".lm-monitor__trail")).toHaveCSS("opacity", "1");
  });

  test("with reduced motion there is no canvas and the second picture is never requested", async ({ page }) => {
    await firefoxLikeLaptop(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto("/", { waitUntil: "networkidle" });
    const trailSrc = (await monitor(page).getAttribute("data-trail-src"))!;
    const box = (await monitor(page).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 12 });
    await page.waitForTimeout(800);
    await expect(page.locator(".lm-monitor__trail")).toHaveCount(0);
    expect(requests.some((u) => u.endsWith(trailSrc))).toBe(false);
  });
});

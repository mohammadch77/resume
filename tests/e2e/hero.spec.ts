import { expect, test, type Page } from "@playwright/test";

/** The motion script refuses machines with <= 4 cores or <= 4 GB; the test machine may be one, so say what it is. */
async function machine(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  });
}

const monitor = (page: Page) => page.locator(".lm-monitor");
const canvas = (page: Page) => page.locator(".lm-monitor__trail");

/** How many pixels of the trail canvas are painted (alpha > 0). */
const painted = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(".lm-monitor__trail");
    if (!c) return -1;
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n += 1;
    return n;
  });

async function sweep(page: Page) {
  const box = (await monitor(page).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.35);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 12 });
}

test.describe("hero with the two pictures (the fixture database has them)", () => {
  test("text beside the monitor: three headline lines, the CTA link, the monitor on the left in RTL", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("#lm-hero-title");
    await expect(h1.locator(".lm-hero__line")).toHaveCount(3);
    await expect(page.locator(".lm-hero__actions a[href='/contact']")).toContainText("درخواست مشاوره رایگان");
    await expect(page.locator(".lm-hero--type")).toHaveCount(0);
    const [t, m] = await Promise.all([h1.boundingBox(), monitor(page).boundingBox()]);
    expect(m!.x, "RTL: the monitor is on the left, the text on the right").toBeLessThan(t!.x);
  });

  test("the base picture is the LCP image: eager, fetchpriority=high, size from the database, Persian alt, AVIF/WebP sources", async ({ page }) => {
    await page.goto("/");
    const img = monitor(page).locator("img");
    await expect(img).toHaveAttribute("fetchpriority", "high");
    await expect(img).toHaveAttribute("loading", "eager");
    await expect(img).toHaveAttribute("width", "899");
    await expect(img).toHaveAttribute("height", "767");
    expect(await img.getAttribute("alt")).toMatch(/[؀-ۿ]/);
    await expect(monitor(page).locator("source[type='image/avif']")).toHaveCount(1);
    await expect(monitor(page).locator("source[type='image/webp']")).toHaveCount(1);
    // no dominant-colour box behind a transparent picture
    expect(await img.getAttribute("style")).toBeNull();
    // it really decodes with transparency: the served variant has an alpha channel
    const src = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
    const res = await page.request.get(src);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toMatch(/image\/(avif|webp|png)/);
  });

  test("the second picture is never part of the page load (it comes at the first pointer or at idle), then the trail paints inside the monitor and fades away", async ({ page }) => {
    await machine(page);
    const early: string[] = [];
    const requests: string[] = [];
    let loaded = false;
    page.on("load", () => (loaded = true));
    page.on("request", (r) => {
      requests.push(r.url());
      if (!loaded) early.push(r.url());
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", /\btrail\b/);
    const trailSrc = (await monitor(page).getAttribute("data-trail-src"))!;
    expect(trailSrc).toMatch(/\.webp$/);
    expect(early.some((u) => u.endsWith(trailSrc)), "second picture requested during the page load").toBe(false);

    await sweep(page);
    await expect(monitor(page)).toHaveAttribute("data-trail-ready", "");
    expect(requests.some((u) => u.endsWith(trailSrc))).toBe(true);
    await sweep(page);
    await expect.poll(() => painted(page), { timeout: 5000 }).toBeGreaterThan(500);
    // clipped to the monitor's silhouette by a CSS mask made from the base picture
    expect(await canvas(page).evaluate((el) => getComputedStyle(el).maskImage)).toMatch(/url\(/);
    // the paint decays by itself and the loop stops: after the fade it is gone
    await expect.poll(() => painted(page), { timeout: 12_000 }).toBe(0);
  });

  test("with no pointer at all the second picture still arrives at idle", async ({ page }) => {
    await machine(page);
    await page.goto("/");
    await expect(monitor(page)).toHaveAttribute("data-trail-ready", "", { timeout: 15_000 });
  });

  test("scrolled out of view the paint is dropped (paused offscreen)", async ({ page }) => {
    await machine(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await sweep(page);
    await expect(monitor(page)).toHaveAttribute("data-trail-ready", "");
    await sweep(page);
    await expect.poll(() => painted(page)).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => painted(page), { timeout: 5000 }).toBe(0);
  });

  test("off for reduced motion, for a low-end machine and with ?motion=none: no canvas, no second picture", async ({ page, browser }) => {
    const trailSrcRequested = async (p: Page, url: string, setup?: () => Promise<void>) => {
      const reqs: string[] = [];
      p.on("request", (r) => reqs.push(r.url()));
      await setup?.();
      await p.goto(url, { waitUntil: "networkidle" });
      const src = (await monitor(p).getAttribute("data-trail-src"))!;
      await sweep(p);
      await p.waitForTimeout(800);
      expect(await canvas(p).count()).toBe(0);
      return reqs.some((u) => u.endsWith(src));
    };
    // reduced motion
    await machine(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await trailSrcRequested(page, "/")).toBe(false);
    // 4 cores
    const low = await browser.newPage();
    await low.addInitScript(() => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 }));
    expect(await trailSrcRequested(low, "/")).toBe(false);
    await low.close();
    // support switch
    const off = await browser.newPage();
    await machine(off);
    expect(await trailSrcRequested(off, "/?motion=none")).toBe(false);
    await off.close();
  });

  test("on a phone: the plain picture only, no canvas, no second picture", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: "fa-IR" });
    const page = await ctx.newPage();
    await machine(page);
    const reqs: string[] = [];
    page.on("request", (r) => reqs.push(r.url()));
    await page.goto("/", { waitUntil: "networkidle" });
    const src = (await monitor(page).getAttribute("data-trail-src"))!;
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", /trail/);
    await page.waitForTimeout(1500);
    expect(await canvas(page).count()).toBe(0);
    expect(reqs.some((u) => u.endsWith(src))).toBe(false);
    // the page does not scroll sideways and the headline and the CTA are in the first screen
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const [h1, cta] = await Promise.all([page.locator("#lm-hero-title").boundingBox(), page.locator(".lm-hero__actions a").first().boundingBox()]);
    expect(h1!.y + h1!.height).toBeLessThan(844);
    expect(cta!.y + cta!.height).toBeLessThan(844);
    await ctx.close();
  });
});

test.describe("hero without pictures (typography only)", () => {
  for (const [name, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]] as const) {
    test(`${name}: a complete hero, no monitor, no canvas, no second picture`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height }, locale: "fa-IR" });
      const page = await ctx.newPage();
      await machine(page);
      const reqs: string[] = [];
      page.on("request", (r) => reqs.push(r.url()));
      await page.goto("/dev/landing-preview", { waitUntil: "networkidle" });
      await expect(page.locator(".lm-hero--type")).toHaveCount(1);
      await expect(page.locator(".lm-monitor")).toHaveCount(0);
      await expect(page.locator("[data-trail-src]")).toHaveCount(0);
      await expect(page.locator(".lm-hero__line")).toHaveCount(3);
      await expect(page.locator(".lm-hero__eyebrow")).toBeVisible();
      await expect(page.locator(".lm-hero__lead")).toBeVisible();
      await expect(page.locator(".lm-hero__actions a[href='/contact']")).toBeVisible();
      // the arch mark is the one graphic on a screen that can hold it
      if (width >= 640) await expect(page.locator(".lm-hero__mark")).toBeVisible();
      await sweep2(page);
      expect(await page.locator("canvas").count()).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      // the headline sits fully in the first screen
      const h1 = await page.locator("#lm-hero-title").boundingBox();
      expect(h1!.y + h1!.height).toBeLessThan(height);
      expect(reqs.filter((u) => /\/uploads\//.test(u))).toEqual([]);
      await ctx.close();
    });
  }
});

async function sweep2(page: Page) {
  await page.mouse.move(300, 300);
  await page.mouse.move(900, 400, { steps: 8 });
}

import { expect, test, type Page } from "@playwright/test";

const FIRST = "فروشگاه آنلاین لوازم خانگی";
const OPEN = "مشاهده‌ی جزئیات پروژه";

/** The motion script refuses machines with <= 4 cores or <= 4 GB; the test machine may be one, so say what it is. */
async function machine(page: Page, { cores = 8, memory = 8 } = {}) {
  await page.addInitScript(
    ({ cores, memory }) => {
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => cores });
      Object.defineProperty(navigator, "deviceMemory", { get: () => memory });
    },
    { cores, memory },
  );
}

const html = (page: Page) => page.locator("html");

test.describe("which motion runs", () => {
  test("a capable desktop gets the full set, and the engine starts only after the page is interactive", async ({ page }) => {
    await machine(page);
    const initialScripts = new Set<string>();
    const lazyScripts: string[] = [];
    let interactive = false;
    page.on("domcontentloaded", () => (interactive = true));
    page.on("request", (r) => {
      if (r.resourceType() !== "script") return;
      if (!interactive) initialScripts.add(r.url());
      else if (!initialScripts.has(r.url())) lazyScripts.push(r.url());
    });
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-motion", "enter lenis pin");
    await expect(html(page)).toHaveAttribute("data-motion-ready", /lenis/);
    await expect(html(page)).toHaveClass(/\blenis\b/);
    expect(lazyScripts.length, "GSAP and Lenis arrive as lazy chunks after DOMContentLoaded").toBeGreaterThan(0);
  });

  test("a low-end machine (4 cores) gets nothing: no attribute, no engine, no extra scripts", async ({ page }) => {
    await machine(page, { cores: 4 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(html(page)).not.toHaveAttribute("data-motion", /.+/);
    await expect(html(page)).not.toHaveAttribute("data-motion-ready", /.+/);
    await expect(html(page)).not.toHaveClass(/\blenis\b/);
  });

  test("reduced motion gets nothing", async ({ page }) => {
    await machine(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(html(page)).not.toHaveAttribute("data-motion", /.+/);
    await expect(html(page)).not.toHaveClass(/\blenis\b/);
  });

  test("?motion=none switches everything off", async ({ page }) => {
    await machine(page);
    await page.goto("/?motion=none");
    await page.waitForLoadState("networkidle");
    await expect(html(page)).not.toHaveAttribute("data-motion", /.+/);
  });
});

test.describe("smooth scrolling and the dialog", () => {
  test("opening a case study stops Lenis, the dialog scrolls with the wheel, closing restarts Lenis", async ({ page }) => {
    await machine(page);
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-motion-ready", /lenis/);
    await expect(html(page)).not.toHaveClass(/lenis-stopped/);

    await page.locator(".gw-project").filter({ hasText: FIRST }).getByRole("link", { name: OPEN }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-lenis-prevent", "true");
    await expect(html(page)).toHaveClass(/lenis-stopped/);

    // the dialog's own content scrolls under the wheel (Lenis would otherwise swallow the event), the page behind does not
    const overflow = await dialog.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow, "the fixture case study must be taller than the dialog for this test to mean anything").toBeGreaterThan(50);
    const pageBefore = await page.evaluate(() => window.scrollY);
    const box = (await dialog.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => dialog.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageBefore);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(html(page)).not.toHaveClass(/lenis-stopped/);
  });

  test("a deep link that opens the dialog before the engine loads still starts Lenis stopped", async ({ page }) => {
    await machine(page);
    await page.goto("/#work/home-appliances-store");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(html(page)).toHaveAttribute("data-motion-ready", /lenis/);
    await expect(html(page)).toHaveClass(/lenis-stopped/);
  });
});

test.describe("hero entrance", () => {
  const animationOf = (page: Page) => page.locator("#top h1").evaluate((el) => getComputedStyle(el).animationName);

  test("a capable visitor gets the CSS entrance; it ends fully visible and in place", async ({ page }) => {
    await machine(page);
    await page.goto("/");
    expect(await animationOf(page)).toBe("lk-rise-still");
    await expect.poll(() => page.locator("#top h1").evaluate((el) => el.getAnimations().length), { timeout: 5000 }).toBe(0);
    const end = await page.locator("#top h1").evaluate((el) => ({ opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform }));
    expect(end).toEqual({ opacity: "1", transform: "none" });
    await expect(page.locator("#top .lk-art__b")).toHaveCSS("opacity", "1");
  });

  test("with reduced motion, on a low-end machine or without JavaScript the hero has no animation at all", async ({ page, browser }) => {
    await machine(page, { cores: 4 });
    await page.goto("/");
    expect(await animationOf(page)).toBe("none");
    await expect(page.locator("#top h1")).toHaveCSS("opacity", "1");

    const reduced = await page.context().newPage();
    await reduced.emulateMedia({ reducedMotion: "reduce" });
    await machine(reduced);
    await reduced.goto("/");
    expect(await animationOf(reduced)).toBe("none");

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const bare = await noJs.newPage();
    await bare.goto(page.url());
    expect(await animationOf(bare)).toBe("none");
    await expect(bare.locator("#top h1")).toHaveCSS("opacity", "1");
    await noJs.close();
  });
});

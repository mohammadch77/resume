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

test.describe("pinned strip", () => {
  /** A desktop tall enough for the section to fit, with the engine running and the pin built. */
  async function pinnedPage(page: Page) {
    await machine(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-motion-ready", /pin/);
    await expect(page.locator("#work.lk-pinned")).toHaveCount(0); // nothing is built before the visitor does something
    await page.keyboard.press("Shift"); // any interaction; a wheel step would start Lenis' smoothing and fight the test's own scrolling
    await expect(page.locator("#work.lk-pinned")).toHaveCount(1);
  }
  const pinTop = (page: Page) => page.locator("#work .lk-pin").evaluate((el) => Math.round(el.getBoundingClientRect().top));
  const stripLeft = (page: Page) => page.locator("#work-strip").evaluate((el) => el.scrollLeft);
  const reach = (page: Page) => page.locator("#work-strip").evaluate((el) => el.scrollWidth - el.clientWidth);
  /** Fully inside the viewport, in both directions. */
  const onScreen = (page: Page, card: ReturnType<Page["locator"]>) =>
    card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight;
    });

  test("vertical scroll moves the strip along the inline axis (RTL: scrollLeft runs negative) and releases it at the end", async ({ page }) => {
    await pinnedPage(page);
    const range = await reach(page);
    expect(range, "the fixture has more cards than fit a row").toBeGreaterThan(100);
    const top = await page.locator("#work").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top);
    expect(Math.abs(await stripLeft(page))).toBeLessThan(2);

    await page.evaluate((y) => window.scrollTo(0, y), top + range / 2);
    await expect.poll(async () => Math.round((await stripLeft(page)) / range * 100) / 100).toBeCloseTo(-0.5, 1);
    // the pinned content stays where the section's top padding ends while the strip moves
    const stuck = await pinTop(page);
    expect(stuck).toBeGreaterThan(0);
    expect(stuck).toBeLessThan(200);

    await page.evaluate((y) => window.scrollTo(0, y), top + range + 400);
    await expect.poll(async () => Math.round(await stripLeft(page))).toBe(-Math.round(range));
    await expect(page.locator("#services")).toBeVisible();
  });

  test("keyboard focus on a card keeps it on screen: the page scroll follows the strip (every card, forwards)", async ({ page }) => {
    await pinnedPage(page);
    const cards = page.locator(".gw-project");
    const total = await cards.count();
    expect(total).toBeGreaterThan(2);
    await cards.first().getByRole("link").focus();
    for (let i = 0; i < total; i += 1) {
      const card = cards.nth(i);
      await expect(card.getByRole("link")).toBeFocused();
      await expect.poll(() => onScreen(page, card), { message: `card ${i + 1} is fully on screen once focused` }).toBe(true);
      if (i < total - 1) await page.keyboard.press("Tab");
    }
    // the page has moved along with the strip, not only the strip
    const range = await reach(page);
    const stuck = await pinTop(page);
    expect(stuck).toBeGreaterThan(0); // still pinned
    expect(stuck).toBeLessThan(200);
    expect(Math.abs(await stripLeft(page))).toBeGreaterThan(range * 0.8);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(range * 0.5);
  });

  test("focusing the last card from the top of the page jumps the page to the end of the strip", async ({ page }) => {
    await pinnedPage(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const last = page.locator(".gw-project").last();
    await last.getByRole("link").focus();
    await expect.poll(() => onScreen(page, last)).toBe(true);
  });

  test("when the very first interaction is focusing a card, the pin is built and the card ends up on screen", async ({ page }) => {
    await machine(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-motion-ready", /pin/);
    const last = page.locator(".gw-project").last();
    await last.getByRole("link").focus();
    await expect(page.locator("#work.lk-pinned")).toHaveCount(1);
    await expect(last.getByRole("link"), "building the pin must not drop focus").toBeFocused();
    await expect.poll(() => onScreen(page, last)).toBe(true);
  });

  test("while a case study is open the pin is not built (the dialog lives in the section); after closing it is", async ({ page }) => {
    await machine(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#work/home-appliances-store");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(html(page)).toHaveAttribute("data-motion-ready", /pin/);
    await dialog.getByRole("heading", { level: 2 }).click(); // an interaction inside the dialog
    await page.keyboard.press("Shift");
    await expect(page.locator("#work.lk-pinned")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "بستن" }).first().click();
    await expect(dialog).toBeHidden();
    await page.keyboard.press("Shift");
    await expect(page.locator("#work.lk-pinned")).toHaveCount(1);
  });

  test("the progress line follows the pinned scroll", async ({ page }) => {
    await pinnedPage(page);
    const range = await reach(page);
    const top = await page.locator("#work").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((y) => window.scrollTo(0, y), top + range);
    await expect(page.locator(".lk-progress span")).toHaveText(/۴ از ۴/);
  });

  test("not pinned where it must not be: a short viewport, a touch device, reduced motion", async ({ page, browser }) => {
    await machine(page);
    await page.setViewportSize({ width: 1440, height: 560 });
    await page.goto("/");
    await expect(html(page)).toHaveAttribute("data-motion-ready", /pin/);
    await expect(page.locator("#work.lk-pinned")).toHaveCount(0);

    const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 1180, height: 900 } });
    const phone = await touch.newPage();
    await machine(phone);
    await phone.goto(page.url());
    await phone.waitForLoadState("networkidle");
    await expect(phone.locator("#work.lk-pinned")).toHaveCount(0);
    await touch.close();

    const calm = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const quiet = await calm.newPage();
    await machine(quiet);
    await quiet.goto(page.url());
    await quiet.waitForLoadState("networkidle");
    await expect(quiet.locator("#work.lk-pinned")).toHaveCount(0);
    await calm.close();
  });
});

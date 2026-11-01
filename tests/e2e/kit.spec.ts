import { expect, test } from "@playwright/test";

const KIT = "/dev/lumora-kit";

test.describe("v2 kit", () => {
  test("Estedad 400 and 600 load, and they are the only face", async ({ page }) => {
    await page.goto(KIT);
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`).sort());
    expect(loaded).toEqual(["Estedad 400", "Estedad 600"]);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^Estedad/);
  });

  test("200% zoom really makes the text bigger (rem + vw root, WCAG 1.4.4)", async ({ browser }) => {
    const measure = async (width: number, height: number, scale: number) => {
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: "fa-IR" });
      const p = await ctx.newPage();
      await p.goto(KIT);
      const px = await p.evaluate(() => ({
        root: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        body: Number.parseFloat(getComputedStyle(document.querySelector("[data-type=body]")!).fontSize),
      }));
      await ctx.close();
      return { ...px, device: px.body * scale };
    };
    // a browser zoomed to 200% = half the CSS viewport at twice the device pixel ratio
    const base = await measure(1440, 900, 1);
    const zoomed = await measure(720, 450, 2);
    expect(zoomed.device / base.device).toBeGreaterThan(1.8);
    // the page itself (not only the root) follows: no clipped overflow sideways at 200%
    const ctx = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2, locale: "fa-IR" });
    const p = await ctx.newPage();
    await p.goto(KIT);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ctx.close();
  });

  test("the root size is scoped to the landing: the admin login keeps the browser default", async ({ page }) => {
    await page.goto("/admin/login");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("16px");
  });

  test("menu: opens from the button, traps focus, Escape closes and focus returns", async ({ page }) => {
    await page.goto(KIT, { waitUntil: "networkidle" });
    const button = page.locator(".lm-menu-button");
    await button.click();
    const menu = page.locator("#lm-menu");
    await expect(menu).toHaveAttribute("data-open", "true");
    await expect(menu).toBeVisible();
    for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.getElementById("lm-menu")!.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("data-open", "false");
    await expect(button).toBeFocused();
  });

  test("menu without JavaScript: the button is a link and :target shows the menu", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, locale: "fa-IR" });
    const p = await ctx.newPage();
    await p.goto(KIT);
    await expect(p.locator("#lm-menu")).toBeHidden();
    await p.locator(".lm-menu-button").click();
    await expect(p.locator("#lm-menu")).toBeVisible();
    await expect(p.locator("#lm-menu a.lm-menu__item")).toHaveCount(4);
    await ctx.close();
  });

  test("dialog: drops in, Escape closes it, focus returns to the opener", async ({ page }) => {
    await page.goto(KIT, { waitUntil: "networkidle" });
    const opener = page.getByTestId("kit-open-dialog");
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("buttons keep their label colour (the link reset must not win over the variant)", async ({ page }) => {
    await page.goto(KIT);
    const dark = page.locator(".lm-pill--dark").first();
    expect(await dark.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
    const accent = page.locator(".lm-pill--accent").first();
    expect(await accent.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(20, 20, 20)");
  });
});

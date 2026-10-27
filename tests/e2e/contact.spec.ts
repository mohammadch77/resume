import { randomBytes } from "node:crypto";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { withDb } from "./helpers";

const CTA = "درخواست مشاوره رایگان";
const SENT = "درخواستتان رسید. پس از بررسی با شما تماس می‌گیریم.";
const PHONE_ERROR = "شماره را با ۰۹ شروع کنید و ۱۱ رقم بنویسید.";
const MESSAGE_ERROR = "درباره‌ی پروژه‌تان چند خط بنویسید.";
const settle = (page: Page) => page.waitForTimeout(3300); // a form younger than 3 s is refused
const unique = () => `مشتری ${randomBytes(3).toString("hex")}`;
const leadsNamed = (name: string) => withDb(async (db) => (await db.query(`SELECT phone, message, consent, source, status FROM leads WHERE name = $1`, [name])).rows);
const dialog = (page: Page) => page.getByRole("dialog", { name: "درباره‌ی پروژه‌تان بگویید" });

/** Where the one contact form can be reached; each must give the same result. */
type Surface = { name: string; open: (browser: Browser) => Promise<{ page: Page; root: Locator; close: () => Promise<void> }>; waits: boolean };
const surfaces: Surface[] = [
  {
    name: "the dialog over the landing",
    waits: true,
    open: async (browser) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/");
      await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
      return { page, root: dialog(page), close: () => context.close() };
    },
  },
  {
    name: "the /contact page",
    waits: true,
    open: async (browser) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/contact");
      return { page, root: page.locator("main"), close: () => context.close() };
    },
  },
  {
    name: "the /contact page without JavaScript",
    waits: false, // no timestamp is sent without JavaScript, so the minimum-time check does not apply
    open: async (browser) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto("/contact");
      return { page, root: page.locator("main"), close: () => context.close() };
    },
  },
];

test.describe("one form, one result: dialog, page and no-JS page", () => {
  for (const surface of surfaces) {
    test(`${surface.name}: invalid input gives the same Persian errors and keeps what was typed; nothing is stored`, async ({ browser }) => {
      const name = unique();
      const { page, root, close } = await surface.open(browser);
      if (surface.waits) await settle(page);
      await root.getByLabel("نام و نام خانوادگی").fill(name);
      await root.getByLabel("شماره تماس").fill("123");
      await root.getByRole("button", { name: CTA }).click();
      await expect(root.locator(".gw-field__error")).toHaveText([PHONE_ERROR, MESSAGE_ERROR]);
      await expect(root.getByLabel("شماره تماس")).toHaveAttribute("aria-invalid", "true");
      await expect(root.getByLabel("نام و نام خانوادگی")).toHaveValue(name);
      expect(await leadsNamed(name)).toHaveLength(0);
      await close();
    });

    test(`${surface.name}: a valid request is stored as a new lead and answered with the same message (no promised time)`, async ({ browser }) => {
      const name = unique();
      const { page, root, close } = await surface.open(browser);
      if (surface.waits) await settle(page);
      await root.getByLabel("نام و نام خانوادگی").fill(name);
      await root.getByLabel("شماره تماس").fill("۰۹۱۲۱۲۳۴۵۶۷");
      await root.getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("یک فروشگاه اینترنتی می‌خواهم.");
      await root.getByRole("button", { name: CTA }).click();
      await expect(root.getByRole("status")).toHaveText(SENT);
      await expect(root.getByRole("status")).not.toContainText("روز");
      expect(await leadsNamed(name)).toEqual([{ phone: "09121234567", message: "یک فروشگاه اینترنتی می‌خواهم.", consent: true, source: "landing", status: "new" }]);
      await close();
    });
  }

  test("the dialog stays open after a successful send, with keyboard focus on the confirmation", async ({ page }) => {
    await page.goto("/");
    await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
    await settle(page);
    await dialog(page).getByLabel("نام و نام خانوادگی").fill(unique());
    await dialog(page).getByLabel("شماره تماس").fill("09121234567");
    await dialog(page).getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("سلام");
    await dialog(page).getByRole("button", { name: CTA }).click();
    await expect(dialog(page).getByRole("status")).toBeFocused();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
  });

  test("a form sent within three seconds is refused with a request to slow down, and works after the pause (dialog)", async ({ page }) => {
    const name = unique();
    await page.goto("/");
    await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
    await dialog(page).getByLabel("نام و نام خانوادگی").fill(name);
    await dialog(page).getByLabel("شماره تماس").fill("09121234567");
    await dialog(page).getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("سلام");
    await dialog(page).getByRole("button", { name: CTA }).click();
    await expect(dialog(page).getByRole("alert").filter({ hasText: "کمی آرام‌تر" })).toBeVisible();
    expect(await leadsNamed(name)).toHaveLength(0);
    await expect(dialog(page).getByLabel("نام و نام خانوادگی")).toHaveValue(name);
    await settle(page);
    await dialog(page).getByRole("button", { name: CTA }).click();
    await expect(dialog(page).getByRole("status")).toHaveText(SENT);
    expect(await leadsNamed(name)).toHaveLength(1);
  });

  test("a filled honeypot looks like success and stores nothing (page)", async ({ page }) => {
    const name = unique();
    await page.goto("/contact");
    await settle(page);
    await page.getByLabel("نام و نام خانوادگی").fill(name);
    await page.getByLabel("شماره تماس").fill("09121234567");
    await page.getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("پیام ربات");
    await page.locator("input[name='website']").evaluate((el: HTMLInputElement) => {
      el.value = "https://spam.example";
    });
    await page.getByRole("button", { name: CTA }).click();
    await expect(page.getByRole("status")).toHaveText(SENT);
    expect(await leadsNamed(name)).toHaveLength(0);
  });
});

test.describe("the dialog", () => {
  const triggers: Array<[string, (page: Page) => Locator]> = [
    ["Navbar", (page) => page.locator("header .gw-nav__end .gw-btn").first()],
    ["hero", (page) => page.locator(".lk-actions").getByRole("link", { name: CTA })],
    ["services band", (page) => page.locator("#services .gw-band").getByRole("link", { name: CTA })],
    ["footer link", (page) => page.locator(".lk-foot__link")],
  ];

  for (const [name, trigger] of triggers) {
    test(`the ${name} CTA opens it (no navigation), focus goes to the first field, Escape closes it and returns focus`, async ({ page }) => {
      await page.goto("/");
      await trigger(page).scrollIntoViewIfNeeded();
      await trigger(page).click();
      await expect(dialog(page)).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
      await expect(dialog(page).getByLabel("نام و نام خانوادگی")).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toBeHidden();
      await expect(trigger(page)).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    });
  }

  test("a modified click (new tab) is left alone: it is not prevented and no dialog opens", async ({ page }) => {
    await page.goto("/");
    const link = page.locator(".lk-actions").getByRole("link", { name: CTA });
    const prevented = await link.evaluate((el) => {
      const e = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(prevented).toBe(false);
    await expect(dialog(page)).toHaveCount(0);
    await expect(link).toHaveAttribute("href", "/contact");
  });

  test("traps Tab and Shift+Tab inside, and closes on a click on the scrim", async ({ page }) => {
    await page.goto("/");
    await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
    await expect(dialog(page)).toBeVisible();
    for (let i = 0; i < 9; i += 1) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.querySelector("[role=dialog]")?.contains(document.activeElement))).toBe(true);
    }
    await dialog(page).getByRole("button", { name: "بستن" }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog(page).getByRole("button", { name: CTA })).toBeFocused(); // wrapped to the last control
    await page.locator(".gw-scrim").click({ position: { x: 4, y: 400 } });
    await expect(dialog(page)).toBeHidden();
  });

  test("drops in with transform and opacity only", async ({ page }) => {
    await page.goto("/");
    await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
    const props = await dialog(page).evaluate((el) => {
      const a = el.getAnimations().find((x) => (x as CSSAnimation).animationName === "gw-drop");
      return a ? [...new Set((a.effect as KeyframeEffect).getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)).sort() : null;
    });
    expect(props, "the dialog runs the gw-drop animation").toEqual(["opacity", "transform"]);
  });

  test("with reduced motion it has no perceptible animation", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
    await expect(dialog(page)).toBeVisible();
    const seconds = await dialog(page).evaluate((el) => Number.parseFloat(getComputedStyle(el).animationDuration));
    expect(seconds).toBeLessThanOrEqual(0.01);
    await context.close();
  });

  test("from a case study: that dialog closes, this one opens, and the page stays locked until it closes", async ({ page }) => {
    await page.goto("/#work/clinic-booking");
    await page.getByRole("dialog").getByRole("link", { name: CTA }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("the work page opens it too", async ({ page }) => {
    await page.goto("/work/home-appliances-store");
    await page.locator("article").getByRole("link", { name: CTA }).click();
    await expect(dialog(page)).toBeVisible();
  });
});

test.describe("the /contact page", () => {
  test("is a page of its own: h1, noindex, and not in the sitemap", async ({ page, request }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1, name: "درباره‌ی پروژه‌تان بگویید" })).toBeVisible();
    expect(await page.locator("meta[name='robots']").getAttribute("content")).toContain("noindex");
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/contact");
    expect(await (await request.get("/robots.txt")).text()).not.toContain("Disallow: /contact"); // crawlers must be able to read the noindex
  });

  test("the landing has no contact section, no #contact link and no inline form", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#contact")).toHaveCount(0);
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator("a[href='#contact']")).toHaveCount(0);
  });
});

test.describe("/dev/landing-preview", () => {
  test("shows the layout with labelled sample cards, and never touches the database", async ({ page }) => {
    const sampleRows = () => withDb(async (db) => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM projects WHERE title LIKE 'نمونه · %' OR slug LIKE 'preview-%'`)).rows[0].n);
    const before = await sampleRows();
    await page.goto("/dev/landing-preview");
    await expect(page.locator(".gw-project")).toHaveCount(5);
    await expect(page.locator(".gw-project .gw-sample")).toHaveCount(5);
    for (const title of await page.locator(".gw-project h3").allInnerTexts()) expect(title).toMatch(/^نمونه/);
    await expect(page.getByRole("note")).toContainText("نمونه");
    expect(await sampleRows()).toBe(before);
    // the contact dialog is not mounted here, so a CTA is a plain link to the real page
    await page.locator(".lk-actions").getByRole("link", { name: CTA }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });
});

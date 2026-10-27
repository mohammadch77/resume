import { expect, test, type Page } from "@playwright/test";
import { signInAndWait, withDb } from "./helpers";

const CTA = "درخواست مشاوره رایگان";

/** The services the landing must show: published, live, and not demo content, in sort order. */
const publishedServices = () =>
  withDb(async (db) => (await db.query<{ title: string; summary: string; icon_key: string }>(`SELECT title, summary, icon_key FROM services WHERE status = 'published' AND deleted_at IS NULL AND title NOT LIKE 'نمونه%' AND summary NOT LIKE 'نمونه%' ORDER BY sort_order, created_at`)).rows);

test.describe("section order and the navbar", () => {
  test("Navbar, hero, work, services + band, results, testimonial, clients, contact, footer; no «روش کار»", async ({ page }) => {
    await page.goto("/");
    const order = await page.locator("main > section").evaluateAll((els) => els.map((e) => e.id || e.getAttribute("aria-label")));
    expect(order).toEqual(["top", "work", "services", "results", "نظر مشتری", "clients", "contact"]);
    const html = await page.content();
    expect(html).not.toContain("روش کار");
    expect(html).not.toContain("#process");
    expect(await page.locator("#process").count()).toBe(0);
    await expect(page.locator("footer")).toBeVisible();
  });

  test("the navbar links match the sections, in page order", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator(".gw-nav__links a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(["#work", "#services", "#clients"]);
    for (const href of hrefs) expect(await page.locator(href!).count(), href!).toBe(1);
  });

  test("the case-study page links back to sections that exist (no #process)", async ({ page }) => {
    await page.goto("/work/home-appliances-store");
    const hrefs = await page.locator(".gw-nav__links a").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs).toEqual(expect.arrayContaining(["/#work", "/#services"]));
    expect(hrefs).not.toContain("/#process");
  });
});

test.describe("services (from the database) and the CTA band", () => {
  test("every published, non-demo service is a card, in sort order, with an icon and a Persian index", async ({ page }) => {
    const expected = await publishedServices();
    expect(expected.length).toBeGreaterThanOrEqual(4);
    await page.goto("/");
    const cards = page.locator("#services .gw-service");
    await expect(cards).toHaveCount(expected.length);
    for (const [i, s] of expected.entries()) {
      const card = cards.nth(i);
      await expect(card.getByRole("heading", { level: 3 })).toHaveText(s.title);
      await expect(card.locator(".gw-service__text")).toHaveText(s.summary);
      await expect(card.locator(".gw-service__icon svg")).toHaveCount(1);
      await expect(card.locator(".gw-service__no")).toHaveText(`۰${(i + 1).toLocaleString("fa-IR")}`);
    }
  });

  test("a card has no hover state and is not interactive", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#services .gw-service").first();
    await expect(card.locator("a, button")).toHaveCount(0);
    const before = await card.evaluate((el) => getComputedStyle(el).borderTopColor);
    await card.hover();
    expect(await card.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(before);
  });

  test("the band follows the cards and carries the section's single primary action, to the contact form", async ({ page }) => {
    await page.goto("/");
    const band = page.locator("#services .gw-band");
    await expect(band).toHaveCount(1);
    expect(await page.evaluate(() => {
      const grid = document.querySelector("#services .gw-service-grid")!;
      const band = document.querySelector("#services .gw-band")!;
      return Boolean(grid.compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await expect(band.getByRole("heading", { level: 3 })).toHaveText("پروژه‌تان را با یک گفت‌وگوی کوتاه شروع کنید");
    const buttons = band.locator(".gw-btn");
    await expect(buttons).toHaveCount(1);
    await expect(buttons).toHaveText(CTA);
    await expect(buttons).toHaveAttribute("href", "#contact");
    await expect(buttons).toHaveClass(/gw-btn--on-lapis/);
    await expect(page.locator("#services .gw-btn")).toHaveCount(1); // nothing else in the region is a button
    await buttons.click();
    await expect(page).toHaveURL(/#contact$/);
  });

  test("the main CTA label is a button four times (Navbar, hero, band, contact) and the footer link is a plain link", async ({ page }) => {
    await page.goto("/");
    const buttons = page.locator(".gw-btn").filter({ hasText: new RegExp(`^${CTA}$`) }).filter({ visible: true });
    await expect(buttons).toHaveCount(4);
    expect(await buttons.evaluateAll((els) => els.map((e) => e.closest("header, #top, #services, #contact")?.id || e.closest("header")?.tagName.toLowerCase()))).toEqual(["header", "top", "services", "contact"]);
    const link = page.locator(".lk-foot a").filter({ hasText: CTA });
    await expect(link).toHaveCount(1);
    await expect(link).not.toHaveClass(/gw-btn/);
  });

  test("no demo («نمونه») content on the landing: no sample badge, no service or card starting with it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".gw-sample")).toHaveCount(0);
    for (const text of await page.locator(".gw-service, .gw-project").allInnerTexts()) expect(text.trim()).not.toMatch(/^نمونه/);
  });
});

test.describe("the footer's consultation link", () => {
  const link = (page: Page) => page.locator(".lk-foot__link");

  test("is a plain link to the contact form until a link is set; it is not a button", async ({ page }) => {
    await page.goto("/");
    await expect(link(page)).toHaveText(CTA);
    await expect(link(page)).toHaveAttribute("href", "#contact");
    await expect(page.locator(".lk-foot .gw-btn")).toHaveCount(0);
    await expect(link(page)).toBeVisible();
    expect((await link(page).boundingBox())!.height).toBeGreaterThanOrEqual(44); // touch target
  });

  test("takes its href from the settings: an invalid one is refused in Persian, tel: works, clearing restores #contact", async ({ page }) => {
    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/settings");
    const field = page.locator("#st-consult-href");
    await expect(page.getByText("tel:+98912xxxxxxx").first()).toBeVisible(); // the hint
    const save = async () => {
      await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
    };

    await field.fill("javascript:alert(1)");
    await save();
    await expect(page.getByText("لینک باید با tel: یا https:// شروع شود یا یک # باشد")).toBeVisible();
    expect(await withDb(async (db) => (await db.query(`SELECT consult_cta_href FROM site_settings WHERE id = 1`)).rows[0].consult_cta_href)).toBeNull();

    await field.fill("tel:+989121234567");
    await save();
    await expect(page.getByText("تنظیمات ذخیره شد.").first()).toBeVisible();
    await page.goto("/");
    await expect(link(page)).toHaveAttribute("href", "tel:+989121234567");

    await page.goto("/admin/settings");
    await page.locator("#st-consult-href").fill("");
    await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
    await expect(page.getByText("تنظیمات ذخیره شد.").first()).toBeVisible();
    await page.goto("/");
    await expect(link(page)).toHaveAttribute("href", "#contact");
  });
});

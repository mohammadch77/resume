import { expect, test } from "@playwright/test";

/** JavaScript is off for the whole file: the landing must be fully usable as plain HTML. */
test.use({ javaScriptEnabled: false });

test("the content, the navigation anchors and the case-study links work without JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  for (const id of ["work", "services", "stats", "clients"]) await expect(page.locator(`#${id}`)).toBeAttached();
  for (const href of ["#work", "#services", "#clients"]) await expect(page.locator(`.lm-header__nav a[href='${href}']`)).toBeAttached();
  await expect(page.locator(".lm-card")).toHaveCount(4);
  // each card is a real link to the static case-study page
  const link = page.locator(".lm-card").first();
  await expect(link).toHaveAttribute("href", /^\/work\/[a-z0-9-]+$/);
  await link.click();
  await expect(page).toHaveURL(/\/work\/home-appliances-store$/);
  await expect(page.locator("h1")).toHaveText("فروشگاه آنلاین لوازم خانگی");
  await expect(page.locator("script[type='application/ld+json']")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("without JavaScript every CTA is a plain link to the contact page, which has the same form", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("a[href='/contact']");
  expect(await links.count()).toBeGreaterThanOrEqual(5); // header, the menu, hero, band, footer
  await page.locator(".lm-hero__actions").getByRole("link", { name: "درخواست مشاوره رایگان" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { level: 1, name: "درباره‌ی پروژه‌تان بگویید" })).toBeVisible();
  await expect(page.getByRole("button", { name: "درخواست مشاوره رایگان" })).toBeVisible();
});

test("without JavaScript the full-screen menu opens with :target, lists the sections and closes with its link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#lm-menu")).toBeHidden();
  await page.locator(".lm-menu-button").click();
  await expect(page.locator("#lm-menu")).toBeVisible();
  await expect(page.locator("#lm-menu a.lm-menu__item")).toHaveCount(3);
  await page.locator("#lm-menu a.lm-menu__item").first().click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#lm-menu")).toBeHidden();
});

test("without JavaScript the hero carousel shows its first card, the figures are their final numbers and the clock is just its label", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".lm-hcard__item[data-active='true']")).toHaveCount(1);
  await expect(page.locator(".lm-hcard__item[data-active='true']")).toBeVisible();
  await expect(page.locator(".lm-hcard__btns")).toBeHidden();
  await expect(page.locator("#stats [data-count]").first()).toHaveText("۱۵۰");
  await expect(page.locator(".lm-clock__time")).toHaveText("");
});

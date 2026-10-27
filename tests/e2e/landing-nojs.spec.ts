import { expect, test } from "@playwright/test";

/** JavaScript is off for the whole file: the landing must be fully usable as plain HTML. */
test.use({ javaScriptEnabled: false });

test("the content, the navigation anchors and the case-study links work without JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  for (const id of ["work", "services", "results", "clients"]) await expect(page.locator(`#${id}`)).toBeAttached();
  for (const href of ["#work", "#services", "#clients"]) await expect(page.locator(`.gw-nav__links a[href='${href}']`)).toBeAttached();
  await expect(page.locator(".gw-project")).toHaveCount(4);
  // the filter row needs JavaScript, so it is hidden rather than shown dead
  await expect(page.getByRole("group", { name: "فیلتر نمونه‌کارها" })).toBeHidden();
  // each card is a real link to the static case-study page
  const link = page.locator(".gw-project").first().getByRole("link", { name: /جزئیات/ });
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
  expect(await links.count()).toBeGreaterThanOrEqual(4); // Navbar (twice: bar and menu sheet), hero, band, footer
  await page.locator(".lk-actions").getByRole("link", { name: "درخواست مشاوره رایگان" }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("heading", { level: 1, name: "درباره‌ی پروژه‌تان بگویید" })).toBeVisible();
  await expect(page.getByRole("button", { name: "درخواست مشاوره رایگان" })).toBeVisible();
});

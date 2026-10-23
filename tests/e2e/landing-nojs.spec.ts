import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { withDb } from "./helpers";

/** JavaScript is off for the whole file: the landing must be fully usable as plain HTML. */
test.use({ javaScriptEnabled: false });

test("the content, the navigation anchors and the case-study links work without JavaScript", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  for (const id of ["work", "services", "process", "results", "clients", "contact"]) await expect(page.locator(`#${id}`)).toBeAttached();
  for (const href of ["#work", "#services", "#process", "#clients"]) await expect(page.locator(`.gw-nav__links a[href='${href}']`)).toBeAttached();
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

test("the contact form posts and shows the result with no JavaScript at all", async ({ page }) => {
  const name = `بدون جاوااسکریپت ${randomBytes(3).toString("hex")}`;
  await page.goto("/");
  await page.getByLabel("نام و نام خانوادگی").fill(name);
  await page.getByLabel("شماره تماس").fill("09123334444");
  await page.getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("ارسال فرم بدون جاوااسکریپت.");
  await page.locator("#contact").getByRole("button", { name: "درخواست مشاوره رایگان" }).click();
  await expect(page.getByRole("status")).toContainText("درخواستتان رسید");
  const rows = await withDb(async (db) => (await db.query(`SELECT phone, source FROM leads WHERE name = $1`, [name])).rows);
  expect(rows).toEqual([{ phone: "09123334444", source: "landing" }]);
});

test("without JavaScript a bad phone number still gets the Persian instruction", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("نام و نام خانوادگی").fill("علی");
  await page.getByLabel("شماره تماس").fill("0912");
  await page.getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("سلام");
  await page.locator("#contact").getByRole("button", { name: "درخواست مشاوره رایگان" }).click();
  await expect(page.getByText("شماره را با ۰۹ شروع کنید و ۱۱ رقم بنویسید.")).toBeVisible();
});

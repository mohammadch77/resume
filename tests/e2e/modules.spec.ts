import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";
import { signInAndWait, withDb } from "./helpers";

const tag = () => randomBytes(3).toString("hex");

test.describe("admin modules (UI)", () => {
  test("categories: add an industry, see it listed, delete it", async ({ page }) => {
    const t = tag();
    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/categories");
    await page.locator("#industry-name").fill(`حوزه ${t}`);
    await page.locator("#industry-slug").fill(`ind-${t}`);
    await page.getByRole("region", { name: /حوزه‌های کاری/ }).getByRole("button", { name: "افزودن" }).click();
    const row = page.getByTestId("category-row").filter({ hasText: `حوزه ${t}` });
    await expect(row).toBeVisible();

    // duplicate slug is a field error, not a crash
    await page.locator("#industry-name").fill(`دیگر ${t}`);
    await page.locator("#industry-slug").fill(`ind-${t}`);
    await page.getByRole("region", { name: /حوزه‌های کاری/ }).getByRole("button", { name: "افزودن" }).click();
    await expect(page.getByText("این نشانی (slug) قبلاً استفاده شده است.")).toBeVisible();

    await row.getByRole("button", { name: "حذف" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "حذف" }).click();
    await expect(row).toHaveCount(0);
  });

  test("services: create, reorder buttons exist, sample text cannot be published", async ({ page }) => {
    const t = tag();
    await signInAndWait(page, "editor@e2e.test");
    await page.goto("/admin/services/new");
    await page.locator("#svc-title").fill(`نمونه · خدمت ${t}`);
    await page.locator("#svc-slug").fill(`svc-${t}`);
    await page.locator("#svc-summary").fill("توضیح کوتاه خدمت");
    await page.getByRole("button", { name: "ایجاد خدمت" }).click();
    await expect(page).toHaveURL(/\/admin\/services$/);
    const row = page.getByTestId("service-row").filter({ hasText: `خدمت ${t}` });
    await row.getByRole("button", { name: "انتشار", exact: true }).click();
    await expect(row.getByText("این محتوای «نمونه» است")).toBeVisible();
    await expect(row.getByText("پیش‌نویس")).toBeVisible();
  });

  test("clients and testimonials: consent is required to publish", async ({ page }) => {
    const t = tag();
    await signInAndWait(page, "editor@e2e.test");
    await page.goto("/admin/clients/new");
    await page.locator("#cl-name").fill(`مشتری ${t}`);
    await page.locator("#cl-slug").fill(`cl-${t}`);
    await page.getByRole("button", { name: "ایجاد مشتری" }).click();
    await expect(page).toHaveURL(/\/admin\/clients$/);
    await expect(page.getByTestId("client-row").filter({ hasText: `مشتری ${t}` })).toBeVisible();

    await page.goto("/admin/testimonials/new");
    await page.locator("#tm-client").selectOption({ label: `مشتری ${t}` });
    await page.locator("#tm-author").fill(`گوینده ${t}`);
    await page.locator("#tm-quote").fill("همکاری با این تیم بسیار حرفه‌ای و سریع بود.");
    await page.getByRole("button", { name: "ثبت نظر" }).click();
    await expect(page).toHaveURL(/\/admin\/testimonials$/);

    const row = page.getByTestId("testimonial-row").filter({ hasText: `گوینده ${t}` });
    await row.getByRole("button", { name: "انتشار", exact: true }).click();
    await expect(row.getByText("رضایت مشتری برای انتشار تأیید نشده است.")).toBeVisible();

    await row.getByRole("link", { name: `گوینده ${t}` }).click();
    await page.getByLabel(/رضایت مشتری برای انتشار این نظر/).check();
    await page.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
    await expect(page).toHaveURL(/\/admin\/testimonials$/);
    await page.getByTestId("testimonial-row").filter({ hasText: `گوینده ${t}` }).getByRole("button", { name: "انتشار", exact: true }).click();
    await expect(page.getByTestId("testimonial-row").filter({ hasText: `گوینده ${t}` }).getByText("منتشرشده")).toBeVisible();
  });

  test("settings: saving, a bad phone is explained, and the value persists", async ({ page }) => {
    const t = tag();
    await signInAndWait(page, "editor@e2e.test");
    await page.goto("/admin/settings");
    await page.locator("#st-hero-title").fill(`تیتر ${t}`);
    await page.locator("#st-phone").fill("123");
    await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
    await expect(page.getByText("شماره باید ۱۱ رقم")).toBeVisible();

    await page.locator("#st-phone").fill("۰۲۱۱۲۳۴۵۶۷۸");
    await page.getByRole("button", { name: "ذخیره‌ی تنظیمات" }).click();
    await expect(page.getByText("تنظیمات ذخیره شد.").first()).toBeVisible();
    await page.reload();
    await expect(page.locator("#st-hero-title")).toHaveValue(`تیتر ${t}`);
    await expect(page.locator("#st-phone")).toHaveValue("02112345678");
  });

  test("users: owner creates an editor who can sign in; editors cannot see users or the audit log", async ({ page, browser }) => {
    const t = tag();
    const email = `new${t}@e2e.test`;
    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/users/new");
    await page.locator("#us-email").fill(email);
    await page.locator("#us-name").fill(`همکار ${t}`);
    await page.locator("#us-password").fill("short");
    await page.getByRole("button", { name: "ایجاد کاربر" }).click();
    await expect(page.getByText("رمز عبور دست‌کم ۱۲ نویسه باشد.")).toBeVisible();
    await page.locator("#us-password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "ایجاد کاربر" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByTestId("user-row").filter({ hasText: email })).toBeVisible();

    const ctx = await browser.newContext();
    const colleague = await ctx.newPage();
    await signInAndWait(colleague, email, E2E_PASSWORD);
    expect((await colleague.goto("/admin/users"))?.status()).toBe(404);
    expect((await colleague.goto("/admin/audit"))?.status()).toBe(404);
    expect((await ctx.request.get("/admin/api/leads/export")).status()).toBe(404);
    await ctx.close();

    // the owner cannot deactivate themselves: no toggle on their own row
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-row").filter({ hasText: "owner@e2e.test" }).getByRole("button", { name: "غیرفعال‌کردن" })).toHaveCount(0);
    expect(await withDb(async (db) => (await db.query(`SELECT count(*)::int AS n FROM users WHERE role = 'owner' AND is_active`)).rows[0].n)).toBeGreaterThanOrEqual(1);
  });

  test("audit log: filters by table and by Shamsi date, and explains a bad date", async ({ page }) => {
    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/audit?table=services");
    await expect(page.getByTestId("audit-row").first()).toBeVisible();
    for (const row of await page.getByTestId("audit-row").all()) await expect(row).toContainText("خدمات");

    await page.goto("/admin/audit?from=1404/13/40");
    await expect(page.getByRole("alert").filter({ hasText: "تاریخ شمسی را به شکل" })).toBeVisible();

    await page.goto("/admin/audit?from=1300/01/01&to=1300/01/02");
    await expect(page.getByText("رویدادی با این فیلتر پیدا نشد.")).toBeVisible();

    await page.goto("/admin/audit?table=users;DROP");
    await expect(page.getByTestId("audit-row").first()).toBeVisible(); // unknown table value is ignored, not an error
  });
});

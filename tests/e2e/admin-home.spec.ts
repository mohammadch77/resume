import { expect, test, type Page } from "@playwright/test";
import { signInAndWait } from "./helpers";

const SAVE = "ذخیره‌ی متن‌ها و تصویرها";
const cards = (page: Page) => page.getByTestId("card-manager");
const stats = (page: Page) => page.getByTestId("stat-manager");

async function open(page: Page) {
  await signInAndWait(page, "editor@e2e.test");
  await page.goto("/admin/home", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "محتوای صفحه‌ی اصلی", level: 1 })).toBeVisible();
}

const publicHtml = async (page: Page) => (await page.request.get("/")).text();

test.describe("admin: محتوای صفحه‌ی اصلی", () => {
  test("every part of the page is here, in the order of the page, with what the database holds and the clients that are named", async ({ page }) => {
    await open(page);
    const headings = await page.locator("main h2, h2").evaluateAll((els) => els.map((e) => e.textContent?.trim()));
    expect(headings).toEqual(["۱. هیرو", "۲. کارت‌های کروسل هیرو", "۳. نوار وضعیت زیر هیرو", "۴. درباره", "۵. آمار", "۶. عنوان بخش‌ها", "۷. بنر بعد از خدمات", "۸. فوتر"]);
    await expect(page.locator("#hm-heroLine1")).not.toHaveValue("");
    await expect(page.locator("#hm-bandText")).not.toHaveValue("");
    await expect(page.locator("#hm-footerLegal")).not.toHaveValue("");
    await expect(cards(page).getByTestId("card-row")).toHaveCount(3);
    await expect(stats(page).getByTestId("stat-row")).toHaveCount(4);
    await expect(page.getByTestId("partners")).toContainText("مشتری آزمایشی");
    // the two pictures: pickers that list only png/webp/avif images, each with its size
    await expect(page.getByRole("group", { name: /تصویر پایه/ })).toBeVisible();
    await expect(page.getByRole("group", { name: /تصویر دوم/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "مشتریان" }).first()).toBeVisible();
  });

  test("an empty or too long text is explained on its field in Persian and nothing is sent; a save shows on the public page at once; the counter counts", async ({ page }) => {
    await open(page);
    const band = page.locator("#hm-bandTitle");
    const original = await band.inputValue();
    await band.fill("");
    await page.getByRole("button", { name: SAVE }).click();
    await expect(page.getByText("بنر: عنوان را بنویسید.")).toBeVisible();
    await band.fill("ا".repeat(121));
    await page.getByRole("button", { name: SAVE }).click();
    await expect(page.getByText("بنر: عنوان حداکثر ۱۲۰ حرف باشد.")).toBeVisible();

    const fresh = `پروژه‌تان را بگویید ${Date.now()}`;
    await band.fill(fresh);
    await expect(page.getByText("ذخیره شد و در صفحه‌ی اصلی اعمال می‌شود.")).toHaveCount(0);
    await page.getByRole("button", { name: SAVE }).click();
    await expect(page.getByRole("status").filter({ hasText: "ذخیره شد" }).first()).toBeVisible();
    expect(await publicHtml(page)).toContain(fresh);

    // second save of the same page works (it carries the version the first one produced), and restores the text
    await band.fill(original);
    await page.getByRole("button", { name: SAVE }).click();
    await expect.poll(async () => (await publicHtml(page)).includes(fresh)).toBe(false);
  });

  test("two editors: the one who saves second gets the conflict dialog and nothing is overwritten", async ({ page, browser }) => {
    await open(page);
    const other = await browser.newPage();
    await open(other);
    const original = await page.locator("#hm-workTitle").inputValue();
    await other.locator("#hm-workTitle").fill(`${original} (نفر دوم)`);
    await other.getByRole("button", { name: SAVE }).click();
    await expect(other.getByRole("status").filter({ hasText: "ذخیره شد" }).first()).toBeVisible();

    await page.locator("#hm-workTitle").fill(`${original} (نفر اول)`);
    await page.getByRole("button", { name: SAVE }).click();
    await expect(page.getByRole("dialog")).toContainText("همزمان تغییر کرده");
    expect(await publicHtml(page)).toContain("(نفر دوم)");
    expect(await publicHtml(page)).not.toContain("(نفر اول)");

    await other.locator("#hm-workTitle").fill(original);
    await other.getByRole("button", { name: SAVE }).click();
    await expect.poll(async () => (await publicHtml(page)).includes("(نفر دوم)")).toBe(false);
    await other.close();
  });

  test("a hero card: add (draft), move up, publish (it appears on the page), a «نمونه» text can not be published, delete", async ({ page }) => {
    await open(page);
    const list = cards(page);
    await list.locator("[data-field=caption]").last().fill("برچسب آزمون");
    await list.locator("[data-field=title]").last().fill("عنوان آزمون کارت");
    await list.getByRole("button", { name: "افزودن", exact: true }).click();
    const row = list.getByTestId("card-row").filter({ hasText: "برچسب آزمون" });
    await expect(row).toBeVisible();
    await expect(row.getByTestId("card-status")).toHaveText("پیش‌نویس");
    await expect(list.getByTestId("card-row")).toHaveCount(4);
    expect(await publicHtml(page)).not.toContain("عنوان آزمون کارت");

    await row.getByRole("button", { name: "بالا" }).click();
    await expect.poll(async () => (await list.getByTestId("card-summary").allTextContents()).indexOf("برچسب آزمون: عنوان آزمون کارت")).toBe(2);

    await row.getByRole("button", { name: "انتشار", exact: true }).click();
    await expect(row.getByTestId("card-status")).toHaveText("منتشرشده");
    await expect.poll(async () => (await publicHtml(page)).includes("عنوان آزمون کارت")).toBe(true);

    await row.getByRole("button", { name: "لغو انتشار" }).click();
    await expect(row.getByTestId("card-status")).toHaveText("پیش‌نویس");
    await row.getByRole("button", { name: "ویرایش" }).click();
    await row.locator("[data-field=caption]").fill("نمونه · برچسب");
    await row.getByRole("button", { name: "ذخیره‌ی تغییر" }).click();
    const sample = list.getByTestId("card-row").filter({ hasText: "نمونه · برچسب" });
    await sample.getByRole("button", { name: "انتشار", exact: true }).click();
    await expect(page.getByText("این محتوای «نمونه» است")).toBeVisible();
    await expect(sample.getByTestId("card-status")).toHaveText("پیش‌نویس");

    await sample.getByRole("button", { name: "حذف" }).click();
    await expect(list.getByTestId("card-row")).toHaveCount(3);
    await expect.poll(async () => (await publicHtml(page)).includes("عنوان آزمون کارت")).toBe(false);
  });

  test("figures: the list is full (four), so there is no add form; editing validates on the field in Persian and a drafted figure can be published and withdrawn", async ({ page }) => {
    await open(page);
    const list = stats(page);
    await expect(list.getByTestId("stat-row")).toHaveCount(4);
    await expect(list.getByRole("button", { name: "افزودن", exact: true })).toHaveCount(0);
    const first = list.getByTestId("stat-row").first();
    await first.getByRole("button", { name: "ویرایش" }).click();
    await first.locator("[data-field=value]").fill("۱۲۳۴۵۶۷");
    await first.locator("[data-field=label]").fill("");
    await first.getByRole("button", { name: "ذخیره‌ی تغییر" }).click();
    await expect(first.getByText("عدد را بین ۰ تا ۹۹۹٬۹۹۹ بنویسید.")).toBeVisible();
    await expect(first.getByText("عنوان آمار را بنویسید.")).toBeVisible();
    await first.getByRole("button", { name: "بستن" }).click();

    // withdraw the last figure and publish it again: the public section follows each step
    const last = list.getByTestId("stat-row").last();
    const label = (await last.getByTestId("stat-summary").textContent())!.replace(/^[۰-۹]+\S*\s/, "");
    await last.getByRole("button", { name: "لغو انتشار" }).click();
    await expect(last.getByTestId("stat-status")).toHaveText("پیش‌نویس");
    await expect.poll(async () => (await publicHtml(page)).includes(label)).toBe(false);
    await last.getByRole("button", { name: "انتشار", exact: true }).click();
    await expect(last.getByTestId("stat-status")).toHaveText("منتشرشده");
    await expect.poll(async () => (await publicHtml(page)).includes(label)).toBe(true);
  });
});

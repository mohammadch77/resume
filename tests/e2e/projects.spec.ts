import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAndWait, withDb } from "./helpers";

const tag = () => randomBytes(3).toString("hex");

/** Rows the project form needs as choices: one industry, one service, one image with alt text. */
async function seedChoices(): Promise<{ industry: string; service: string; alt: string }> {
  const t = tag();
  const alt = `کاور-${t}`;
  await withDb(async (db) => {
    const owner = (await db.query<{ id: string }>(`SELECT id FROM users WHERE email = 'owner@e2e.test'`)).rows[0].id;
    await db.query(`INSERT INTO industries (slug, name) VALUES ($1, $2)`, [`ind-${t}`, `حوزه-${t}`]);
    await db.query(`INSERT INTO services (slug, title, summary, icon_key) VALUES ($1, $2, 'توضیح', 'globe')`, [`svc-${t}`, `خدمت-${t}`]);
    await db.query(
      `INSERT INTO media_assets (kind, mime, bytes, width, height, alt_fa, sha256, original_path, uploaded_by)
       VALUES ('image', 'image/webp', 1000, 100, 100, $1, $2, $3, $4)`,
      [alt, randomBytes(32).toString("hex"), `a/${t}.webp`, owner],
    );
  });
  return { industry: `حوزه-${t}`, service: `خدمت-${t}`, alt };
}

test("project lifecycle: create, publish is blocked then allowed, public page follows every change", async ({ page, request }) => {
  const choices = await seedChoices();
  const t = tag();
  const slug = `e2e-${t}`;
  const title = `پروژه ${t}`;
  const renamed = `${title} (ویرایش‌شده)`;

  await signInAndWait(page, "owner@e2e.test");
  await page.goto("/admin/projects/new");
  await page.locator("#pf-title").fill(title);
  await page.locator("#pf-slug").fill(slug);
  await page.locator("#pf-summary").fill("این یک خلاصه‌ی آزمایشی با طول کافی برای انتشار است.");
  await page.locator("#pf-industry").selectOption({ label: choices.industry });
  await page.getByRole("button", { name: "ایجاد پروژه" }).click();

  // A new project lands on its edit page; without cover and service it cannot be published.
  await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "انتشار", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "کاور انتخاب نشده است." })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "دست‌کم یک خدمت" })).toBeVisible();
  expect((await request.get(`/work/${slug}`)).status()).toBe(404);

  // Complete the requirements and save.
  await page.getByRole("checkbox", { name: choices.service }).check();
  // The radios are visually hidden; a user clicks the thumbnail (its label), here inside the cover picker.
  const coverPicker = page.getByRole("group", { name: /کاور/ });
  const cover = coverPicker.getByRole("radio", { name: choices.alt });
  await coverPicker.locator("label").filter({ has: page.getByRole("radio", { name: choices.alt }) }).click();
  await expect(cover).toBeChecked();
  await page.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);

  // Publish from the list: the public page appears immediately (cached 404 is replaced).
  const row = page.getByTestId("project-row").filter({ hasText: title });
  await row.getByRole("button", { name: "انتشار", exact: true }).click();
  await expect(row.getByText("منتشرشده")).toBeVisible();
  const published = await request.get(`/work/${slug}`);
  expect(published.status()).toBe(200);
  expect(await published.text()).toContain(title);

  // Rename: the cached page shows the new title at once.
  await row.getByRole("link", { name: title }).click();
  await page.locator("#pf-title").fill(renamed);
  await page.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
  await expect(page).toHaveURL(/\/admin\/projects$/);
  expect(await (await request.get(`/work/${slug}`)).text()).toContain(renamed);

  // Unpublish: 404 again, immediately.
  await page.getByTestId("project-row").filter({ hasText: renamed }).getByRole("button", { name: "لغو انتشار" }).click();
  await expect(page.getByTestId("project-row").filter({ hasText: renamed }).getByText("پیش‌نویس")).toBeVisible();
  expect((await request.get(`/work/${slug}`)).status()).toBe(404);
});

test("two editors: the second save of a stale form gets the conflict dialog and nothing is overwritten", async ({ browser }) => {
  const choices = await seedChoices();
  const t = tag();
  const slug = `e2e-${t}`;
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signInAndWait(a, "owner@e2e.test");
  await signInAndWait(b, "owner@e2e.test");

  await a.goto("/admin/projects/new");
  await a.locator("#pf-title").fill(`هم‌زمان ${t}`);
  await a.locator("#pf-slug").fill(slug);
  await a.locator("#pf-summary").fill("خلاصه‌ی آزمایشی برای بررسی هم‌زمانی ویرایش.");
  await a.locator("#pf-industry").selectOption({ label: choices.industry });
  await a.getByRole("button", { name: "ایجاد پروژه" }).click();
  await expect(a).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
  const editUrl = a.url();

  await b.goto(editUrl);
  await a.locator("#pf-title").fill(`نفر اول ${t}`);
  await a.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
  await expect(a).toHaveURL(/\/admin\/projects$/);

  await b.locator("#pf-title").fill(`نفر دوم ${t}`);
  await b.getByRole("button", { name: "ذخیره‌ی تغییرات" }).click();
  await expect(b.getByRole("dialog").getByText("این مورد همزمان تغییر کرده است")).toBeVisible();
  const stored = await withDb(async (db) => (await db.query<{ title: string }>(`SELECT title FROM projects WHERE slug = $1`, [slug])).rows[0].title);
  expect(stored).toBe(`نفر اول ${t}`);
});

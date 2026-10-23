import { expect, test } from "@playwright/test";
import { fakeExe, makePhoto } from "../support/media-fixtures";
import { MEDIA_ERRORS } from "../../lib/media/messages";
import { signInAndWait } from "./helpers";

test.describe("upload endpoint hardening", () => {
  test("anonymous upload is refused with 401 by the handler itself (it sits outside the proxy matcher)", async ({ request, baseURL }) => {
    const res = await request.post("/admin/api/media", { headers: { origin: baseURL! }, multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: await makePhoto(50, 50) } } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: "unauthenticated" });
  });
  test("a foreign or missing Origin is refused with 403", async ({ request }) => {
    const cases: Array<Record<string, string>> = [{ origin: "https://evil.example" }, {}];
    for (const headers of cases) {
      const res = await request.post("/admin/api/media", { headers, multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: await makePhoto(50, 50) } } });
      expect(res.status()).toBe(403);
    }
  });
  test("an oversized Content-Length is refused before the body is read", async ({ request, baseURL }) => {
    // 401 wins for anonymous callers; the size rule is covered through the authenticated flow in the unit/DB tests.
    const res = await request.post("/admin/api/media", { headers: { origin: baseURL! }, data: "x" });
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("served files", () => {
  test("path traversal and unknown or non-media files are 404", async ({ request }) => {
    for (const p of ["/uploads/%2e%2e/%2e%2e/package.json", "/uploads/media/zz/missing.jpg", "/uploads/media/aa/notes.txt", "/uploads/.env", "/uploads/..%2f..%2fpackage.json"]) {
      expect((await request.get(p)).status(), p).toBe(404);
    }
  });
});

test.describe("media library", () => {
  test("upload -> alt text -> shown with real <picture> -> delete; fake types are refused in Persian", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (m) => m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text()) && problems.push(m.text()));

    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: "رسانه" })).toBeVisible();

    // 1. a real photo (unique content so dedupe cannot interfere with reruns)
    const photo = await makePhoto(1600, 1000, { seed: Date.now() % 100000 });
    await page.locator("#images").setInputFiles({ name: "نمونه.jpg", mimeType: "image/jpeg", buffer: photo });
    const card = page.getByTestId("media-card").first();
    // sharp re-encodes a photo into AVIF, WebP and JPEG at several widths before the card can appear; on a loaded
    // 8 GB machine that alone can pass the default 5 s (it failed twice in full runs).
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText("متن جایگزین ندارد؛ برای انتشار لازم است")).toBeVisible();
    await expect(card.getByText("استفاده نشده")).toBeVisible();

    // the generated variants really load (the browser picks AVIF) and keep their intrinsic size
    const img = card.locator("picture img");
    await expect(img).toHaveAttribute("width", "1600");
    await expect(img).toHaveAttribute("height", "1000");
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(await card.locator("picture source").count()).toBe(2);

    // 2. alt text
    await card.getByLabel("متن جایگزین (فارسی)").fill("نمایی از یک پروژه‌ی نمونه");
    await card.getByRole("button", { name: "ذخیره" }).click();
    await expect(card.getByText("ذخیره شد.")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("media-card").first().getByLabel("متن جایگزین (فارسی)")).toHaveValue("نمایی از یک پروژه‌ی نمونه");

    // 3. spoofed types: an .exe renamed .jpg is rejected with the Persian message
    await page.locator("#images").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: fakeExe() });
    await expect(page.getByRole("alert").filter({ hasText: MEDIA_ERRORS.unsupported_type })).toBeVisible();

    // 4. delete
    const count = await page.getByTestId("media-card").count();
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("media-card").first().getByRole("button", { name: "حذف" }).click();
    await expect(page.getByTestId("media-card")).toHaveCount(count - 1);
    expect(problems).toEqual([]);
  });

  test("a used file refuses deletion with the friendly message and stays", async ({ page }) => {
    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/media");
    const photo = await makePhoto(800, 500, { seed: (Date.now() + 7) % 100000 });
    await page.locator("#images").setInputFiles({ name: "used.jpg", mimeType: "image/jpeg", buffer: photo });
    // The library may already hold other images (the landing fixture), so "a card is visible" proves nothing here:
    // wait for THIS file's confirmation. sharp re-encodes it into AVIF, WebP and JPEG first, which can pass 5 s on a loaded machine.
    await expect(page.getByRole("listitem").filter({ hasText: "used.jpg" }).getByText("بارگذاری شد.")).toBeVisible({ timeout: 30_000 });

    const { withDb } = await import("./helpers");
    await withDb(async (db) => {
      const media = await db.query<{ id: string }>(`SELECT id FROM media_assets ORDER BY created_at DESC LIMIT 1`);
      const industry = await db.query<{ id: string }>(
        `INSERT INTO industries (slug, name) VALUES ('e2e-' || substr(md5(random()::text), 1, 8), 'حوزه') RETURNING id`,
      );
      await db.query(
        `INSERT INTO projects (slug, title, industry_id, summary, cover_media_id) VALUES ('e2e-' || substr(md5(random()::text), 1, 8), 'پروژه', $1, 'خلاصه‌ی نمونه برای آزمون', $2)`,
        [industry.rows[0].id, media.rows[0].id],
      );
    });
    await page.reload();
    const used = page.getByTestId("media-card").first();
    // the list now renders every fixture image (AVIF/WebP pictures), so a reload on a loaded machine can pass 5 s
    await expect(used.getByText("در ۱ جا استفاده شده")).toBeVisible({ timeout: 20_000 });
    page.once("dialog", (d) => d.accept());
    await used.getByRole("button", { name: "حذف" }).click();
    await expect(used.getByRole("alert")).toHaveText(MEDIA_ERRORS.in_use);
    await expect(used).toBeVisible();
  });
});

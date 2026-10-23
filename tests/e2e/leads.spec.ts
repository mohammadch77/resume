import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAndWait, withDb } from "./helpers";

const tag = () => randomBytes(3).toString("hex");

async function seedLead(name: string, message: string): Promise<string> {
  return withDb(async (db) => {
    const r = await db.query<{ id: string }>(
      `INSERT INTO leads (name, phone, message, consent) VALUES ($1, '09121234567', $2, true) RETURNING id`,
      [name, message],
    );
    return r.rows[0].id;
  });
}

test.describe("leads", () => {
  test("an editor can triage a lead; visitor text is shown as plain text, never as markup", async ({ page }) => {
    const t = tag();
    const id = await seedLead(`مشتری ${t}`, `پیام ${t} & "نقل‌قول" و =1+1`);
    await signInAndWait(page, "editor@e2e.test");
    await page.goto(`/admin/leads/${id}`);
    await expect(page.getByText(`پیام ${t} & "نقل‌قول" و =1+1`)).toBeVisible();

    await page.locator("#ld-status").selectOption("contacted");
    await page.locator("#ld-notes").fill(`یادداشت ${t}`);
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
    await expect(page.getByText("ذخیره شد.")).toBeVisible();
    const row = await withDb(async (db) => (await db.query(`SELECT status, internal_notes FROM leads WHERE id = $1`, [id])).rows[0]);
    expect(row).toEqual({ status: "contacted", internal_notes: `یادداشت ${t}` });
  });

  test("CSV export is owner-only, has a BOM and neutralises formulas", async ({ browser }) => {
    const t = tag();
    await seedLead(`=cmd|'/c calc'!A0 ${t}`, "پیام");

    const anon = await browser.newContext();
    const anonRes = await anon.request.get("/admin/api/leads/export", { maxRedirects: 0 });
    expect([302, 303, 307, 308, 401]).toContain(anonRes.status());

    const editorCtx = await browser.newContext();
    const editorPage = await editorCtx.newPage();
    await signInAndWait(editorPage, "editor@e2e.test");
    expect((await editorCtx.request.get("/admin/api/leads/export")).status()).toBe(404);
    await editorPage.goto("/admin/leads");
    await expect(editorPage.getByRole("link", { name: /دانلود همه/ })).toHaveCount(0);

    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await signInAndWait(ownerPage, "owner@e2e.test");
    const res = await ownerCtx.request.get("/admin/api/leads/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toMatch(/^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers()["cache-control"]).toBe("no-store");
    const body = Buffer.from(await res.body());
    expect(body.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf])); // UTF-8 BOM
    const text = body.toString("utf8");
    expect(text).toContain(`"'=cmd|'/c calc'!A0 ${t}"`);
    expect(text).not.toContain(`"=cmd`);
    await ownerPage.goto("/admin/leads");
    await expect(ownerPage.getByRole("link", { name: /دانلود همه/ })).toBeVisible();
  });
});

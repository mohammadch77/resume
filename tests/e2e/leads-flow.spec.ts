import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signInAndWait, withDb } from "./helpers";

const CTA = "درخواست مشاوره رایگان";
const newLeads = () => withDb(async (db) => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM leads WHERE status = 'new'`)).rows[0].n);

test("a visitor's request becomes a «جدید» lead in the panel and shows up on the dashboard", async ({ page, browser }) => {
  const name = `درخواست ${randomBytes(3).toString("hex")}`;
  const before = await newLeads();

  // the visitor
  await page.goto("/");
  await page.waitForTimeout(3300); // the form refuses to be sent in under 3 s
  await page.getByLabel("نام و نام خانوادگی").fill(name);
  await page.getByLabel("شماره تماس").fill("۰۹۱۲۱۲۳۴۵۶۷");
  await page.getByRole("textbox", { name: "درباره‌ی پروژه", exact: true }).fill("یک وب‌سایت شرکتی می‌خواهم.");
  await page.locator("#contact").getByRole("button", { name: CTA }).click();
  await expect(page.getByRole("status")).toContainText("درخواستتان رسید");

  // one row, status new
  const rows = await withDb(async (db) => (await db.query<{ id: string; status: string; phone: string; source: string }>(`SELECT id, status, phone, source FROM leads WHERE name = $1`, [name])).rows);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ status: "new", phone: "09121234567", source: "landing" });
  expect(await newLeads()).toBe(before + 1);

  // the panel
  const admin = await (await browser.newContext()).newPage();
  await signInAndWait(admin, "owner@e2e.test");
  await admin.goto("/admin/leads");
  const row = admin.getByTestId("lead-row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row).toContainText("جدید");
  await admin.goto("/admin/leads?status=new");
  await expect(admin.getByTestId("lead-row").filter({ hasText: name })).toBeVisible();

  // the dashboard: the count of new requests and the latest requests (name, phone, Shamsi time, link to the detail page)
  await admin.goto("/admin");
  const stat = admin.locator("section[aria-label='آمار'] > *").filter({ hasText: "درخواست‌های جدید" });
  await expect(stat).toContainText((before + 1).toLocaleString("fa-IR"));
  const entry = admin.getByTestId("dashboard-leads").locator("li").filter({ hasText: name });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText("09121234567");
  await expect(entry).toContainText("جدید");
  await expect(entry.locator("time")).toHaveText(/[۰-۹]{4}/); // a Shamsi year in Persian digits
  await expect(entry.getByRole("link", { name })).toHaveAttribute("href", `/admin/leads/${rows[0].id}`);
  await entry.getByRole("link", { name }).click();
  await expect(admin).toHaveURL(new RegExp(`/admin/leads/${rows[0].id}$`));
  await expect(admin.getByText("یک وب‌سایت شرکتی می‌خواهم.")).toBeVisible();
});

test("the dashboard lists at most the five newest requests, newest first", async ({ page }) => {
  await signInAndWait(page, "owner@e2e.test");
  await page.goto("/admin");
  const times = await page.getByTestId("dashboard-leads").locator("time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!));
  expect(times.length).toBeGreaterThan(0);
  expect(times.length).toBeLessThanOrEqual(5);
  expect([...times].sort().reverse()).toEqual(times);
});

import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, LOGIN_ERROR, SESSION_COOKIE } from "./constants";
import { createUser, signIn, signInAndWait, withDb } from "./helpers";

test.describe("login", () => {
  test("signs in and sets a hardened session cookie whose raw value is not in the database", async ({ page, context }) => {
    await signIn(page, "owner@e2e.test");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();

    const cookie = (await context.cookies()).find((c) => c.name === SESSION_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });

    const stored = await withDb((db) =>
      db.query<{ id: string }>(`SELECT id FROM sessions WHERE id = $1`, [createHash("sha256").update(cookie!.value).digest("hex")]),
    );
    expect(stored.rowCount).toBe(1);
    const raw = await withDb((db) => db.query(`SELECT 1 FROM sessions WHERE id = $1`, [cookie!.value]));
    expect(raw.rowCount).toBe(0);
  });

  test("unknown email and wrong password show the same generic error", async ({ page }) => {
    await signIn(page, "nobody@e2e.test", "whatever-password");
    await expect(page.locator("form").getByRole("alert")).toHaveText(LOGIN_ERROR);
    const unknown = await page.locator("form").getByRole("alert").innerText();

    await signIn(page, "owner@e2e.test", "wrong-password-xx");
    await expect(page.locator("form").getByRole("alert")).toHaveText(LOGIN_ERROR);
    expect(await page.locator("form").getByRole("alert").innerText()).toBe(unknown);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("locks the account after 5 failures; even the right password gets the same generic message", async ({ page }) => {
    const user = await createUser("editor");
    for (let i = 0; i < 5; i++) {
      await signIn(page, user.email, `wrong-password-${i}`);
      await expect(page.locator("form").getByRole("alert")).toHaveText(LOGIN_ERROR);
    }
    await signIn(page, user.email, E2E_PASSWORD);
    await expect(page.locator("form").getByRole("alert")).toHaveText(LOGIN_ERROR);
    await expect(page).toHaveURL(/\/admin\/login/);

    const row = await withDb((db) => db.query(`SELECT failed_logins, locked_until FROM users WHERE id = $1`, [user.id]));
    expect(row.rows[0].failed_logins).toBe(5);
    expect(row.rows[0].locked_until).not.toBeNull();
  });

  test("an already signed-in visitor is moved from /admin/login to the dashboard", async ({ page }) => {
    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("logout", () => {
  test("ends the session: the old cookie no longer works", async ({ page, context }) => {
    await signIn(page, "owner@e2e.test");
    await expect(page).toHaveURL(/\/admin$/);
    const old = (await context.cookies()).find((c) => c.name === SESSION_COOKIE)!;

    await page.getByRole("button", { name: "خروج" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await context.clearCookies();
    await context.addCookies([old]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    expect(await withDb((db) => db.query(`SELECT 1 FROM sessions WHERE id = $1`, [createHash("sha256").update(old.value).digest("hex")]))).toMatchObject({ rowCount: 0 });
  });
});

test.describe("roles", () => {
  test("an editor does not see Users / Audit and gets 404 on both pages", async ({ page }) => {
    await signIn(page, "editor@e2e.test");
    await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible();
    await expect(page.getByRole("link", { name: "کاربران" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "گزارش تغییرات" })).toHaveCount(0);

    for (const path of ["/admin/users", "/admin/audit"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("an owner sees and opens both pages", async ({ page }) => {
    await signInAndWait(page, "owner@e2e.test");
    await page.getByRole("link", { name: "کاربران" }).click();
    await expect(page.getByRole("heading", { name: "کاربران" })).toBeVisible();
    await page.getByRole("link", { name: "گزارش تغییرات" }).click();
    await expect(page.getByRole("heading", { name: "گزارش تغییرات" })).toBeVisible();
  });

  test("deactivating a user from the Users page ends that user's sessions at once", async ({ page, browser }) => {
    const victim = await createUser("editor");
    const victimCtx = await browser.newContext({ baseURL: "http://localhost:3100" });
    const victimPage = await victimCtx.newPage();
    await signIn(victimPage, victim.email);
    await expect(victimPage.getByRole("heading", { name: "داشبورد" })).toBeVisible();

    await signInAndWait(page, "owner@e2e.test");
    await page.goto("/admin/users");
    const row = page.getByRole("row").filter({ hasText: victim.email });
    await row.getByRole("button", { name: "غیرفعال‌کردن" }).click();
    await expect(row.getByText("غیرفعال", { exact: true })).toBeVisible();

    await victimPage.goto("/admin");
    await expect(victimPage).toHaveURL(/\/admin\/login/);
    await victimCtx.close();
  });
});

test.describe("request hardening", () => {
  test("a POST from a foreign origin is refused", async ({ request }) => {
    const res = await request.post("/admin/login", { headers: { origin: "https://evil.example" }, data: "x" });
    expect(res.status()).toBe(403);
  });
  test("a POST without an Origin header is refused", async ({ request }) => {
    const res = await request.post("/admin/login", { data: "x" });
    expect(res.status()).toBe(403);
  });
  test("/admin responses are noindex and never cached", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
    expect(res.headers()["cache-control"]).toContain("no-store");
  });
});

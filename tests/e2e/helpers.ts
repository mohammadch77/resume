import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { expect, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./constants";

const BASE = process.env.TEST_PG_URL ?? "postgres://postgres:postgres@localhost:5434";

export async function withDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: `${BASE}/gw_e2e` });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

let cachedHash: Promise<string> | undefined;

/** A fresh account, so lockout / deactivation tests never disturb the shared owner and editor. */
export async function createUser(role: "owner" | "editor"): Promise<{ email: string; id: string }> {
  cachedHash ??= hash(E2E_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const email = `u${randomBytes(4).toString("hex")}@e2e.test`;
  const passwordHash = await cachedHash;
  const id = await withDb(async (db) => {
    const r = await db.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, 'کاربر تازه', $3) RETURNING id`,
      [email, passwordHash, role],
    );
    return r.rows[0].id;
  });
  return { email, id };
}

export async function signIn(page: Page, email: string, password: string = E2E_PASSWORD): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("ایمیل").fill(email);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود به پنل" }).click();
}

/** Signs in and waits until the dashboard is shown, so later navigations cannot race the login. */
export async function signInAndWait(page: Page, email: string, password: string = E2E_PASSWORD): Promise<void> {
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/admin$/);
}

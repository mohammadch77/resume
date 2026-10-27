import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, inject } from "vitest";
import { ICON_NAMES } from "@/components/ds";
import { SERVICE_ICONS } from "@/lib/validation/common";
import { SERVICE_SEED } from "../../scripts/seed-services";
import { E, connect, rejected } from "./helpers";

const run = promisify(execFile);
const db = connect();
afterAll(() => db.close());

const tsx = path.resolve("node_modules/tsx/dist/cli.mjs");
const seedEnv = (extra: Record<string, string> = {}) => {
  const host = inject("baseUrl").replace(/^postgres:\/\/[^@]*@/, "");
  return {
    ...process.env,
    MIGRATOR_DATABASE_URL: `postgres://migrator:migrator@${host}/${inject("dbName")}`,
    OWNER_EMAIL: "seed-owner@example.com",
    OWNER_PASSWORD: "a-long-test-password-1",
    NODE_ENV: "test",
    ...extra,
  };
};
const script = (file: string, args: string[] = [], env: Record<string, string> = {}) =>
  run(process.execPath, [tsx, file, ...args], { env: seedEnv(env) as NodeJS.ProcessEnv });
const seed = (args: string[] = [], env: Record<string, string> = {}) => script("scripts/seed.ts", args, env);
const seedOwner = (env: Record<string, string> = {}) => script("scripts/seed-owner.ts", [], env);
const seedServices = (env: Record<string, string> = {}) => script("scripts/seed-services.ts", [], env);

describe("seed:owner", () => {
  it("creates the owner from the environment, never prints the password, reminds about the cache", async () => {
    const out = await seedOwner();
    expect(out.stdout + out.stderr).not.toContain("a-long-test-password-1");
    expect(out.stdout).toContain(".next/cache/fetch-cache");
    const owner = await db.su.query(`SELECT role, password_hash, is_active FROM users WHERE email = 'seed-owner@example.com'`);
    expect(owner.rows[0]).toMatchObject({ role: "owner", is_active: true });
    expect(owner.rows[0].password_hash).toMatch(/^\$argon2id\$/);
  });

  it("is idempotent and never overwrites an existing password", async () => {
    const before = (await db.su.query(`SELECT password_hash FROM users WHERE email = 'seed-owner@example.com'`)).rows[0].password_hash;
    const out = await seedOwner({ OWNER_PASSWORD: "another-long-password-2" });
    expect(out.stdout).toContain("already exists");
    expect((await db.su.query(`SELECT count(*)::int AS n FROM users WHERE email = 'seed-owner@example.com'`)).rows[0].n).toBe(1);
    expect((await db.su.query(`SELECT password_hash FROM users WHERE email = 'seed-owner@example.com'`)).rows[0].password_hash).toBe(before);
  });

  it("works in production (it is the deployment bootstrap) and refuses a short password or bad email", async () => {
    await seedOwner({ NODE_ENV: "production" });
    await expect(seedOwner({ OWNER_PASSWORD: "short" })).rejects.toMatchObject({ code: 1 });
    await expect(seedOwner({ OWNER_EMAIL: "not-an-email" })).rejects.toMatchObject({ code: 1 });
  });
});

describe("sample seed (db:seed)", () => {
  it("creates settings, industries, services and draft projects, all labelled «نمونه», and no user", async () => {
    const usersBefore = (await db.su.query(`SELECT count(*)::int AS n FROM users`)).rows[0].n;
    const out = await seed();
    expect(out.stdout).toContain(".next/cache/fetch-cache");
    expect((await db.su.query(`SELECT count(*)::int AS n FROM users`)).rows[0].n).toBe(usersBefore);

    expect((await db.su.query(`SELECT count(*)::int AS n FROM site_settings`)).rows[0].n).toBe(1);
    expect((await db.su.query(`SELECT count(*)::int AS n FROM industries WHERE slug LIKE 'sample-%'`)).rows[0].n).toBe(3);
    expect((await db.su.query(`SELECT count(*)::int AS n FROM services WHERE title LIKE 'نمونه%'`)).rows[0].n).toBe(4);
    const projects = await db.su.query<{ status: string; title: string }>(`SELECT status, title FROM projects WHERE slug LIKE 'sample-project-%'`);
    expect(projects.rowCount).toBe(4);
    for (const p of projects.rows) {
      expect(p.status).toBe("draft");
      expect(p.title).toContain("نمونه");
    }
  });

  it("is idempotent", async () => {
    await seed();
    expect((await db.su.query(`SELECT count(*)::int AS n FROM projects WHERE slug LIKE 'sample-project-%'`)).rows[0].n).toBe(4);
  });

  it("refuses to run with NODE_ENV=production unless --force", async () => {
    await expect(seed([], { NODE_ENV: "production" })).rejects.toMatchObject({ code: 1 });
    await seed(["--force"], { NODE_ENV: "production" });
  });

  it("demo projects cannot be published as-is", async () => {
    const p = await db.su.query<{ id: string }>(`SELECT id FROM projects WHERE slug = 'sample-project-1'`);
    const err = await rejected(
      db.app.query(`UPDATE projects SET status = 'published', published_at = now(), version = version + 1 WHERE id = $1`, [p.rows[0].id]),
    );
    expect(err.code).toBe(E.gate);
  });
});

describe("seed:services", () => {
  const SLUGS = ["web-design", "app-design", "ui-ux-design", "seo-services"];
  const rows = () =>
    db.su.query<{ slug: string; title: string; summary: string; icon_key: string; status: string }>(
      `SELECT slug, title, summary, icon_key, status FROM services WHERE slug = ANY($1) AND deleted_at IS NULL ORDER BY sort_order`,
      [SLUGS],
    );
  const clean = () => db.su.query(`DELETE FROM services WHERE slug = ANY($1)`, [SLUGS]);
  afterAll(clean); // other test files count services

  it("creates the four real services, published, with no sample label and a known icon, and reminds about the caches", async () => {
    await clean();
    const out = await seedServices();
    expect(out.stdout).toContain("4 created");
    expect(out.stdout).toContain(".next/cache/fetch-cache");
    expect(out.stdout).toContain(".next/server/route-cache");
    const got = await rows();
    expect(got.rows.map((r) => r.slug)).toEqual(SLUGS);
    expect(got.rows.map((r) => r.title)).toEqual(["طراحی وب‌سایت", "طراحی اپلیکیشن", "طراحی UI/UX", "خدمات سئو"]);
    for (const r of got.rows) {
      expect(r.status).toBe("published");
      expect(`${r.title} ${r.summary}`).not.toContain("نمونه");
      expect(SERVICE_ICONS).toContain(r.icon_key);
      expect(r.summary).not.toMatch(/[0-9۰-۹]/); // no numeric claims
    }
  });

  it("is idempotent and never overwrites what an editor changed", async () => {
    await db.su.query(`UPDATE services SET title = 'عنوان ویرایش‌شده', version = version + 1 WHERE slug = 'web-design' AND deleted_at IS NULL`);
    const out = await seedServices();
    expect(out.stdout).toContain("0 created");
    expect(out.stdout).toContain("4 already there");
    const got = await rows();
    expect(got.rowCount).toBe(4);
    expect(got.rows[0].title).toBe("عنوان ویرایش‌شده");
  });

  it("works in production (it is real content) and creates a service again after it was deleted", async () => {
    await db.su.query(`UPDATE services SET status = 'draft', version = version + 1 WHERE slug = 'seo-services' AND deleted_at IS NULL`);
    await db.su.query(`UPDATE services SET deleted_at = now(), version = version + 1 WHERE slug = 'seo-services' AND deleted_at IS NULL`);
    await seedServices({ NODE_ENV: "production" });
    const got = await rows();
    expect(got.rows.find((r) => r.slug === "seo-services")?.status).toBe("published");
  });

  it("every icon it uses is one the design system can draw", () => {
    for (const s of SERVICE_SEED) expect(ICON_NAMES).toContain(s.iconKey);
  });
});

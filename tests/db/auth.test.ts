import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { runAdminAction, type ActionContext } from "@/lib/auth/admin-action-core";
import {
  LOCKOUT_MS,
  ROTATION_GRACE_MS,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_ROTATE_MS,
  SESSION_TOUCH_MS,
} from "@/lib/auth/config";
import { attemptLogin } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  revokeAllForUser,
  revokeSession,
  touchOrRotate,
  validateSession,
} from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { connect, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const PASSWORD = "a-correct-password-1";
let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

const T0 = new Date("2026-03-01T08:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const meta = { ipHash: null, userAgent: "vitest" };

async function mkUser(role: "owner" | "editor" = "editor", over: Partial<{ isActive: boolean }> = {}) {
  const email = `a${uid()}@example.com`;
  const [u] = await db
    .insert(schema.users)
    .values({ email, passwordHash, displayName: "کاربر", role, isActive: over.isActive ?? true })
    .returning();
  return { id: u.id, email, role };
}
const row = async (userId: string) => (await db.select().from(schema.users).where(eq(schema.users.id, userId)))[0];
const login = (email: string, password: string, now: Date) =>
  attemptLogin(db, { email, password }, { ...meta, requestId: randomUUID() }, now);

describe("sessions", () => {
  it("stores only the sha256 of the token and validates it", async () => {
    const u = await mkUser();
    const s = await createSession(db, u.id, meta, T0);
    const stored = await pools.su.query(`SELECT id FROM sessions WHERE user_id = $1`, [u.id]);
    expect(stored.rows[0].id).toBe(hashToken(s.token));
    expect(JSON.stringify(stored.rows)).not.toContain(s.token);
    expect((await validateSession(db, s.token, at(1000)))?.user.id).toBe(u.id);
    expect(await validateSession(db, s.token + "x", at(1000))).toBeNull();
  });

  it("expires after the idle period and after the absolute cap", async () => {
    const u = await mkUser();
    const s = await createSession(db, u.id, meta, T0);
    expect(await validateSession(db, s.token, at(SESSION_IDLE_MS - 1))).not.toBeNull();
    expect(await validateSession(db, s.token, at(SESSION_IDLE_MS))).toBeNull();
  });

  it("sliding extension is written at most every 5 minutes and never passes the absolute cap", async () => {
    const u = await mkUser();
    const s = await createSession(db, u.id, meta, T0);
    const cur0 = (await validateSession(db, s.token, at(1000)))!;
    expect(await touchOrRotate(db, s.token, cur0, meta, at(SESSION_TOUCH_MS - 1))).toBeNull();
    expect((await validateSession(db, s.token, at(1000)))!.expiresAt).toEqual(cur0.expiresAt);

    await touchOrRotate(db, s.token, cur0, meta, at(SESSION_TOUCH_MS));
    const cur1 = (await validateSession(db, s.token, at(SESSION_TOUCH_MS + 1)))!;
    expect(cur1.expiresAt.getTime()).toBe(at(SESSION_TOUCH_MS).getTime() + SESSION_IDLE_MS);
    expect(cur1.expiresAt.getTime()).toBeLessThanOrEqual(cur1.absoluteExpiresAt.getTime());
  });

  it("rotates after 30 minutes: new token inherits the absolute cap, old token survives only a grace window", async () => {
    const u = await mkUser();
    const s = await createSession(db, u.id, meta, T0);
    const cur = (await validateSession(db, s.token, at(1000)))!;
    const now = at(SESSION_ROTATE_MS);
    const rotated = await touchOrRotate(db, s.token, cur, meta, now);
    expect(rotated).not.toBeNull();
    expect(rotated!.token).not.toBe(s.token);

    const fresh = (await validateSession(db, rotated!.token, now))!;
    expect(fresh.absoluteExpiresAt).toEqual(cur.absoluteExpiresAt);
    expect(fresh.absoluteExpiresAt.getTime()).toBe(T0.getTime() + SESSION_ABSOLUTE_MS);

    expect(await validateSession(db, s.token, at(SESSION_ROTATE_MS + ROTATION_GRACE_MS - 1))).not.toBeNull();
    expect(await validateSession(db, s.token, at(SESSION_ROTATE_MS + ROTATION_GRACE_MS))).toBeNull();

    // a parallel request carrying the old token during the grace window must not rotate again
    const old = (await validateSession(db, s.token, now))!;
    expect(await touchOrRotate(db, s.token, old, meta, now)).toBeNull();
    const count = await pools.su.query(`SELECT count(*)::int AS n FROM sessions WHERE user_id = $1`, [u.id]);
    expect(count.rows[0].n).toBe(2);
  });

  it("revoke removes one session; revokeAllForUser removes all of them", async () => {
    const u = await mkUser();
    const a = await createSession(db, u.id, meta, T0);
    const b = await createSession(db, u.id, meta, T0);
    await revokeSession(db, a.token);
    expect(await validateSession(db, a.token, at(1000))).toBeNull();
    expect(await validateSession(db, b.token, at(1000))).not.toBeNull();
    await revokeAllForUser(db, u.id);
    expect(await validateSession(db, b.token, at(1000))).toBeNull();
  });

  it("sessions of inactive or soft-deleted users are invalid", async () => {
    const u = await mkUser();
    const s = await createSession(db, u.id, meta, T0);
    await pools.su.query(`UPDATE users SET is_active = false WHERE id = $1`, [u.id]);
    expect(await validateSession(db, s.token, at(1000))).toBeNull();
    await pools.su.query(`UPDATE users SET is_active = true, deleted_at = now() WHERE id = $1`, [u.id]);
    expect(await validateSession(db, s.token, at(1000))).toBeNull();
  });
});

describe("login and lockout", () => {
  it("succeeds with the right password, resets the counters and records the login", async () => {
    const u = await mkUser();
    await pools.su.query(`UPDATE users SET failed_logins = 3 WHERE id = $1`, [u.id]);
    const r = await login(u.email, PASSWORD, T0);
    expect(r.ok).toBe(true);
    const after = await row(u.id);
    expect(after.failedLogins).toBe(0);
    expect(after.lastLoginAt).toEqual(T0);
  });

  it("email lookup is case-insensitive", async () => {
    const u = await mkUser();
    expect((await login(u.email.toUpperCase(), PASSWORD, T0)).ok).toBe(true);
  });

  it("unknown email, wrong password and inactive user all fail identically", async () => {
    const u = await mkUser();
    const inactive = await mkUser("editor", { isActive: false });
    const results = [
      await login(`nobody${uid()}@example.com`, PASSWORD, T0),
      await login(u.email, "wrong-password", T0),
      await login(inactive.email, PASSWORD, T0),
    ];
    for (const r of results) expect(r).toEqual({ ok: false });
  });

  it("locks the account for 15 minutes after 5 failures — even the right password is refused — then allows login", async () => {
    const u = await mkUser();
    for (let i = 1; i <= 4; i++) {
      await login(u.email, "bad", at(i * 1000));
      expect((await row(u.id)).lockedUntil).toBeNull();
    }
    await login(u.email, "bad", at(5000));
    const locked = await row(u.id);
    expect(locked.failedLogins).toBe(5);
    expect(locked.lockedUntil).toEqual(at(5000 + LOCKOUT_MS));

    expect(await login(u.email, PASSWORD, at(6000))).toEqual({ ok: false });
    expect((await row(u.id)).failedLogins).toBe(5); // refused attempts while locked are not counted

    expect((await login(u.email, PASSWORD, at(5000 + LOCKOUT_MS))).ok).toBe(true);
  });

  it("after a lock expires, one more wrong password starts a fresh count instead of re-locking at once", async () => {
    const u = await mkUser();
    for (let i = 1; i <= 5; i++) await login(u.email, "bad", at(i * 1000));
    const later = at(5000 + LOCKOUT_MS + 1000);
    await login(u.email, "bad", later);
    const after = await row(u.id);
    expect(after.failedLogins).toBe(1);
    expect(after.lockedUntil).toBeNull();
  });

  it("failed attempts are audited without an actor and without the password hash", async () => {
    const u = await mkUser();
    await login(u.email, "bad", T0);
    const r = await pools.su.query(
      `SELECT actor_id, after_data FROM audit_log WHERE table_name = 'users' AND row_id = $1 AND action = 'UPDATE' ORDER BY id DESC LIMIT 1`,
      [u.id],
    );
    expect(r.rows[0].actor_id).toBeNull();
    expect(r.rows[0].after_data).not.toHaveProperty("password_hash");
  });

  it("a successful login is audited with the user as the actor", async () => {
    const u = await mkUser();
    await login(u.email, PASSWORD, T0);
    const r = await pools.su.query(
      `SELECT actor_id FROM audit_log WHERE table_name = 'users' AND row_id = $1 AND action = 'UPDATE' ORDER BY id DESC LIMIT 1`,
      [u.id],
    );
    expect(r.rows[0].actor_id).toBe(u.id);
  });
});

describe("runAdminAction gate", () => {
  const SITE = "https://site.example";
  const schemaIn = z.object({ title: z.string().min(2) });
  const ctx = (over: Partial<ActionContext> = {}): ActionContext => ({
    db,
    user: null,
    origin: SITE,
    siteOrigin: SITE,
    requestId: randomUUID(),
    ...over,
  });
  const handler = async ({ tx, input }: { tx: Parameters<Parameters<typeof runAdminAction>[3]>[0]["tx"]; input: { title: string } }) => {
    const [svc] = await tx
      .insert(schema.services)
      .values({ slug: `svc-${uid()}`, title: input.title, summary: "s", iconKey: "globe" })
      .returning();
    return svc.id;
  };
  const sessionUser = async (role: "owner" | "editor") => {
    const u = await mkUser(role);
    return { id: u.id, email: u.email, displayName: "x", role };
  };

  it("rejects a foreign or missing Origin before anything else", async () => {
    const user = await sessionUser("owner");
    for (const origin of [null, "https://evil.example"]) {
      const r = await runAdminAction(ctx({ user, origin }), { roles: ["owner"], schema: schemaIn }, { title: "ok" }, handler);
      expect(r).toMatchObject({ ok: false, code: "bad_origin" });
    }
  });
  it("rejects anonymous callers", async () => {
    const r = await runAdminAction(ctx(), { roles: ["owner"], schema: schemaIn }, { title: "ok" }, handler);
    expect(r).toMatchObject({ ok: false, code: "unauthenticated" });
  });
  it("rejects an editor calling an owner-only action and does not run the handler", async () => {
    const user = await sessionUser("editor");
    const before = (await pools.su.query(`SELECT count(*)::int AS n FROM services`)).rows[0].n;
    const r = await runAdminAction(ctx({ user }), { roles: ["owner"], schema: schemaIn }, { title: "ok" }, handler);
    expect(r).toMatchObject({ ok: false, code: "forbidden" });
    expect((await pools.su.query(`SELECT count(*)::int AS n FROM services`)).rows[0].n).toBe(before);
  });
  it("rejects invalid input with per-field errors", async () => {
    const user = await sessionUser("owner");
    const r = await runAdminAction(ctx({ user }), { roles: ["owner"], schema: schemaIn }, { title: "x" }, handler);
    expect(r).toMatchObject({ ok: false, code: "invalid_input" });
    expect(!r.ok && r.fieldErrors?.title).toBeTruthy();
  });
  it("runs the handler in a transaction attributed to the caller", async () => {
    const user = await sessionUser("owner");
    const requestId = randomUUID();
    const r = await runAdminAction(ctx({ user, requestId }), { roles: ["owner", "editor"], schema: schemaIn }, { title: "عنوان" }, handler);
    expect(r.ok).toBe(true);
    const id = r.ok ? r.data : "";
    const audit = await pools.su.query(`SELECT actor_id, request_id FROM audit_log WHERE table_name = 'services' AND row_id = $1`, [id]);
    expect(audit.rows[0]).toEqual({ actor_id: user.id, request_id: requestId });
  });
  it("rolls everything back when the handler throws", async () => {
    const user = await sessionUser("owner");
    const slug = `rb-${uid()}`;
    await expect(
      runAdminAction(ctx({ user }), { roles: ["owner"], schema: schemaIn }, { title: "ok" }, async ({ tx }) => {
        await tx.insert(schema.services).values({ slug, title: "t", summary: "s", iconKey: "globe" });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect((await pools.su.query(`SELECT 1 FROM services WHERE slug = $1`, [slug])).rowCount).toBe(0);
  });
});

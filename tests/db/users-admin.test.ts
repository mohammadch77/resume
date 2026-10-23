import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { guard } from "@/lib/admin/outcome";
import { createUser, getUser, listUsers, resetPassword, setUserActive, unlockUser, updateUser } from "@/lib/admin/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { Db } from "@/lib/db/client";
import { describeDbError } from "@/lib/db/errors";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { userCreateSchema, type UserCreateValues } from "@/lib/validation/user";
import { connect, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const PASSWORD = "first-long-password-1";
const values = (over: Partial<UserCreateValues> = {}): UserCreateValues => ({ email: `n${uid()}@example.com`, displayName: "کاربر تازه", role: "editor", password: PASSWORD, ...over });
const run = async <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, await mkUser(pools.su, "owner"), null, fn);
const hashOf = async (id: string) => (await pools.su.query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [id])).rows[0].password_hash;
const sessionCount = async (id: string) => (await pools.su.query(`SELECT count(*)::int AS n FROM sessions WHERE user_id = $1`, [id])).rows[0].n as number;

describe("users admin", () => {
  it("creates an account whose password is stored only as an argon2id hash", async () => {
    const v = values();
    const id = await run((tx) => createUser(tx, v));
    const hash = await hashOf(id);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(PASSWORD);
    expect(await verifyPassword(hash, PASSWORD)).toBe(true);
    expect(await getUser(db, id)).toMatchObject({ email: v.email, role: "editor", isActive: true });
    expect((await listUsers(db)).some((u) => u.id === id)).toBe(true);
    // the audit trail records the creation without the hash
    const audit = (await pools.su.query(`SELECT after_data FROM audit_log WHERE table_name = 'users' AND row_id = $1 AND action = 'INSERT'`, [id])).rows[0];
    expect(audit.after_data).not.toHaveProperty("password_hash");
  });

  it("reports a duplicate email (case-insensitive) as an email field error", async () => {
    const v = values({ email: `Dup${uid()}@Example.com` });
    await run((tx) => createUser(tx, v));
    const outcome = await run((tx) => guard(tx, (sp) => createUser(sp, { ...v, email: v.email.toLowerCase() })));
    expect(outcome).toMatchObject({ kind: "failed", field: "email" });
  });

  it("updates name and role", async () => {
    const id = await run((tx) => createUser(tx, values()));
    expect(await run((tx) => updateUser(tx, id, { displayName: "نام جدید", role: "owner" }))).toBe(true);
    expect(await getUser(db, id)).toMatchObject({ displayName: "نام جدید", role: "owner" });
    expect(await run((tx) => updateUser(tx, "00000000-0000-4000-8000-000000000000", { displayName: "x", role: "editor" }))).toBe(false);
  });

  it("deactivating ends every session of that user, and reactivating does not bring them back", async () => {
    const id = await run((tx) => createUser(tx, values()));
    await createSession(db, id, { ipHash: null, userAgent: null });
    await createSession(db, id, { ipHash: null, userAgent: null });
    expect(await sessionCount(id)).toBe(2);
    await run((tx) => setUserActive(tx, id, false));
    expect(await sessionCount(id)).toBe(0);
    expect((await getUser(db, id))!.isActive).toBe(false);
    await run((tx) => setUserActive(tx, id, true));
    expect(await sessionCount(id)).toBe(0);
  });

  it("resetting the password replaces the hash, clears the lockout and ends all sessions", async () => {
    const id = await run((tx) => createUser(tx, values()));
    await createSession(db, id, { ipHash: null, userAgent: null });
    await pools.su.query(`UPDATE users SET failed_logins = 5, locked_until = now() + interval '1 hour' WHERE id = $1`, [id]);
    expect((await getUser(db, id))!.locked).toBe(true);

    await run((tx) => resetPassword(tx, id, "second-long-password-2"));
    const hash = await hashOf(id);
    expect(await verifyPassword(hash, "second-long-password-2")).toBe(true);
    expect(await verifyPassword(hash, PASSWORD)).toBe(false);
    expect(await getUser(db, id)).toMatchObject({ failedLogins: 0, locked: false });
    expect(await sessionCount(id)).toBe(0);
  });

  it("unlocking clears the lockout but keeps the password", async () => {
    const id = await run((tx) => createUser(tx, values()));
    const before = await hashOf(id);
    await pools.su.query(`UPDATE users SET failed_logins = 7, locked_until = now() + interval '1 hour' WHERE id = $1`, [id]);
    expect(await run((tx) => unlockUser(tx, id))).toBe(true);
    expect(await getUser(db, id)).toMatchObject({ failedLogins: 0, locked: false });
    expect(await hashOf(id)).toBe(before);
  });

  it("a removed last owner is reported in Persian (GW007) and a used record likewise (GW008)", () => {
    expect(describeDbError({ code: "GW007", message: "last_owner" })).toEqual({ kind: "failed", message: "دست‌کم یک مالک فعال باید باقی بماند. ابتدا مالک دیگری بسازید." });
    expect(describeDbError({ code: "GW008", message: "in_use: clients" })).toMatchObject({ kind: "failed" });
  });
});

describe("user form validation", () => {
  it("requires a 12+ character password that differs from the email, and a valid email", () => {
    expect(userCreateSchema.safeParse(values()).success).toBe(true);
    expect(userCreateSchema.safeParse(values({ password: "short" })).success).toBe(false);
    expect(userCreateSchema.safeParse(values({ email: "not-an-email" })).success).toBe(false);
    const same = userCreateSchema.safeParse(values({ email: "someone-long@example.com", password: "someone-long@example.com" }));
    expect(same.success).toBe(false);
    expect(userCreateSchema.safeParse(values({ role: "admin" as never })).success).toBe(false);
  });
});

import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { LOCKOUT_MS, MAX_FAILED_LOGINS } from "./config";
import { isLocked } from "./policy";
import { verifyPassword } from "./password";
import { createSession, purgeExpired, type NewSession } from "./session";

export type LoginResult = { ok: true; userId: string; session: NewSession } | { ok: false };

/**
 * Every failure (unknown email, wrong password, locked, inactive) returns the same `{ ok: false }`;
 * the password is always verified so timing does not distinguish the cases either.
 */
export async function attemptLogin(
  db: Db,
  input: { email: string; password: string },
  ctx: { ipHash: string | null; userAgent: string | null; requestId: string },
  now: Date = new Date(),
): Promise<LoginResult> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`${users.email} = ${input.email} AND ${users.deletedAt} IS NULL`)
    .limit(1);

  const passwordOk = await verifyPassword(user?.passwordHash ?? null, input.password);
  if (!user) return { ok: false };
  if (isLocked(user.lockedUntil, now)) return { ok: false };

  if (!passwordOk) {
    // A lock that has already expired restarts the counter at 1.
    const lockUntil = new Date(now.getTime() + LOCKOUT_MS);
    const next = sql`CASE WHEN ${users.lockedUntil} IS NOT NULL AND ${users.lockedUntil} <= ${now} THEN 1 ELSE ${users.failedLogins} + 1 END`;
    await withActor(db, null, ctx.requestId, (tx) =>
      tx
        .update(users)
        .set({
          failedLogins: next,
          lockedUntil: sql`CASE WHEN ${next} >= ${MAX_FAILED_LOGINS} THEN ${lockUntil}::timestamptz ELSE NULL END`,
        })
        .where(eq(users.id, user.id)),
    );
    return { ok: false };
  }
  if (!user.isActive) return { ok: false };

  const session = await withActor(db, user.id, ctx.requestId, async (tx) => {
    await tx.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: now }).where(eq(users.id, user.id));
    await purgeExpired(tx, now);
    return createSession(tx, user.id, { ipHash: ctx.ipHash, userAgent: ctx.userAgent }, now);
  });
  return { ok: true, userId: user.id, session };
}

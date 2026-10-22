import { eq, lt } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { ROTATION_GRACE_MS, SESSION_ABSOLUTE_MS } from "./config";
import { isExpired, shouldRotate, shouldTouch, slidingExpiry } from "./policy";
import { hashToken, newToken } from "./tokens";

type Executor = Db | Tx;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "editor";
};

export type ValidSession = {
  user: SessionUser;
  createdAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
};

export type NewSession = { token: string; expiresAt: Date };

export async function createSession(
  db: Executor,
  userId: string,
  meta: { ipHash: string | null; userAgent: string | null },
  now: Date = new Date(),
): Promise<NewSession> {
  const token = newToken();
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
  const expiresAt = slidingExpiry(now, absoluteExpiresAt);
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    absoluteExpiresAt,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    createdAt: now,
  });
  return { token, expiresAt };
}

/** Read-only check. Expired sessions and sessions of inactive/deleted users are invalid. */
export async function validateSession(db: Executor, token: string, now: Date = new Date()): Promise<ValidSession | null> {
  const rows = await db
    .select({
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      absoluteExpiresAt: sessions.absoluteExpiresAt,
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hashToken(token)))
    .limit(1);
  const row = rows[0];
  if (!row || !row.isActive || row.deletedAt !== null) return null;
  if (isExpired(row.expiresAt, row.absoluteExpiresAt, now)) return null;
  return {
    user: { id: row.id, email: row.email, displayName: row.displayName, role: row.role },
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    absoluteExpiresAt: row.absoluteExpiresAt,
  };
}

/**
 * Keeps a valid session fresh. Returns a replacement session when the token was rotated
 * (the old token stays valid for a short grace window), otherwise null.
 */
export async function touchOrRotate(
  db: Executor,
  token: string,
  current: ValidSession,
  meta: { ipHash: string | null; userAgent: string | null },
  now: Date = new Date(),
): Promise<NewSession | null> {
  if (shouldRotate(current.createdAt, current.expiresAt, now)) {
    const replacement = await createSession(db, current.user.id, meta, now);
    // Keep the absolute cap of the original login: the new session inherits it.
    await db
      .update(sessions)
      .set({ absoluteExpiresAt: current.absoluteExpiresAt, expiresAt: slidingExpiry(now, current.absoluteExpiresAt) })
      .where(eq(sessions.id, hashToken(replacement.token)));
    await db
      .update(sessions)
      .set({ expiresAt: new Date(now.getTime() + ROTATION_GRACE_MS) })
      .where(eq(sessions.id, hashToken(token)));
    return { token: replacement.token, expiresAt: slidingExpiry(now, current.absoluteExpiresAt) };
  }
  if (shouldTouch(current.expiresAt, current.absoluteExpiresAt, now)) {
    await db
      .update(sessions)
      .set({ expiresAt: slidingExpiry(now, current.absoluteExpiresAt) })
      .where(eq(sessions.id, hashToken(token)));
  }
  return null;
}

export async function revokeSession(db: Executor, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function revokeAllForUser(db: Executor, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping, run opportunistically at login. */
export async function purgeExpired(db: Executor, now: Date = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

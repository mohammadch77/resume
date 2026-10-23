import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllForUser } from "@/lib/auth/session";
import type { UserCreateValues, UserEditValues, UserRole } from "@/lib/validation/user";

export type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  failedLogins: number;
  /** Locked out right now (computed by the database clock). */
  locked: boolean;
  lastLoginAt: Date | null;
};

const columns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  role: users.role,
  isActive: users.isActive,
  failedLogins: users.failedLogins,
  locked: sql<boolean>`coalesce(${users.lockedUntil} > now(), false)`,
  lastLoginAt: users.lastLoginAt,
};

export async function listUsers(db: Db): Promise<UserRow[]> {
  return db.select(columns).from(users).where(isNull(users.deletedAt)).orderBy(asc(users.createdAt));
}

export async function getUser(db: Db, id: string): Promise<UserRow | null> {
  const [row] = await db.select(columns).from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));
  return row ?? null;
}

/** The password is hashed here (argon2id) and never stored or logged in clear. */
export async function createUser(tx: Tx, v: UserCreateValues): Promise<string> {
  const [row] = await tx
    .insert(users)
    .values({ email: v.email.trim(), displayName: v.displayName, role: v.role, passwordHash: await hashPassword(v.password) })
    .returning({ id: users.id });
  return row.id;
}

/** False when the user does not exist. Demoting the last active owner is refused by the database (GW007). */
export async function updateUser(tx: Tx, id: string, v: UserEditValues): Promise<boolean> {
  const rows = await tx.update(users).set(v).where(and(eq(users.id, id), isNull(users.deletedAt))).returning({ id: users.id });
  return rows.length === 1;
}

/** Deactivating also ends every session of that user. Deactivating the last active owner is refused (GW007). */
export async function setUserActive(tx: Tx, id: string, active: boolean): Promise<boolean> {
  const rows = await tx.update(users).set({ isActive: active }).where(and(eq(users.id, id), isNull(users.deletedAt))).returning({ id: users.id });
  if (rows.length !== 1) return false;
  if (!active) await revokeAllForUser(tx, id);
  return true;
}

/** New password, lock cleared, every existing session ended (a stolen session must not survive a reset). */
export async function resetPassword(tx: Tx, id: string, password: string): Promise<boolean> {
  const rows = await tx
    .update(users)
    .set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning({ id: users.id });
  if (rows.length !== 1) return false;
  await revokeAllForUser(tx, id);
  return true;
}

/** Clears a lockout caused by failed logins without changing the password. */
export async function unlockUser(tx: Tx, id: string): Promise<boolean> {
  const rows = await tx.update(users).set({ failedLogins: 0, lockedUntil: null }).where(and(eq(users.id, id), isNull(users.deletedAt))).returning({ id: users.id });
  return rows.length === 1;
}

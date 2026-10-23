import { describeDbError } from "@/lib/db/errors";
import type { Tx } from "@/lib/db/with-actor";

/**
 * What a content action tells the form. Always plain data (it crosses the server/client boundary).
 *  ok       - done
 *  conflict - someone else changed the row first (optimistic lock); nothing was written
 *  blocked  - a publish rule is not met; `reasons` lists exactly what is missing (Persian)
 *  failed   - anything else the user can fix (`field` points at the form field when known)
 */
export type Outcome<T = null> =
  | { kind: "ok"; value: T }
  | { kind: "conflict" }
  | { kind: "blocked"; reasons: string[] }
  | { kind: "failed"; message: string; field?: string };

export const ok = <T>(value: T): Outcome<T> => ({ kind: "ok", value });
export const failed = (message: string, field?: string): Outcome<never> => ({ kind: "failed", message, field });

/** Thrown by a handler when `UPDATE ... WHERE version = $expected` matched no row. */
export class ConflictError extends Error {
  constructor() {
    super("version conflict");
  }
}

/** Thrown by a handler when the app itself (not a trigger) refuses to publish; `reasons` are Persian sentences. */
export class BlockedError extends Error {
  constructor(readonly reasons: string[]) {
    super("blocked");
  }
}

/** Expect exactly one row from an optimistic-lock UPDATE ... RETURNING, else raise the conflict. */
export function expectOne<R>(rows: R[]): R {
  if (rows.length !== 1) throw new ConflictError();
  return rows[0];
}

/**
 * Runs `fn` in a SAVEPOINT so a rule violation (publish gate, unique slug, ...) can be reported to the form
 * without poisoning the surrounding transaction, and maps known database errors to an Outcome.
 * Unknown errors are rethrown (the action fails loudly and the whole transaction rolls back).
 */
export async function guard<T>(tx: Tx, fn: (sp: Tx) => Promise<T>): Promise<Outcome<T>> {
  try {
    return ok(await tx.transaction((sp) => fn(sp as unknown as Tx)));
  } catch (err) {
    if (err instanceof ConflictError) return { kind: "conflict" };
    if (err instanceof BlockedError) return { kind: "blocked", reasons: err.reasons };
    const problem = describeDbError(err);
    if (problem) return problem;
    throw err;
  }
}

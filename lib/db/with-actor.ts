import { sql } from "drizzle-orm";
import type { Db } from "./client";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Runs `fn` in a transaction with the acting user and request id set as transaction-local
 * settings, so the audit trigger can attribute every change. Every mutation goes through this.
 */
export async function withActor<T>(
  db: Db,
  userId: string | null,
  requestId: string | null,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${userId ?? ""}, true), set_config('app.request_id', ${requestId ?? ""}, true)`,
    );
    return fn(tx);
  });
}

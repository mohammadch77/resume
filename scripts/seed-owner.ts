import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import pg from "pg";
import { z } from "zod";
import * as s from "../lib/db/schema";

/**
 * Creates the first owner from the environment (`npm run seed:owner`). Unlike the sample seed this is the bootstrap
 * step of a real deployment, so it is allowed in production. Idempotent: an existing account is left untouched
 * (its password is never overwritten). The password is read from the environment and never printed.
 */
const envSchema = z.object({
  MIGRATOR_DATABASE_URL: z.string().min(1),
  OWNER_EMAIL: z.email(),
  OWNER_PASSWORD: z.string().min(12, "OWNER_PASSWORD must be at least 12 characters"),
  OWNER_NAME: z.string().min(1).max(80).default("مدیر سایت"),
});

async function main() {
  const env = envSchema.parse(process.env);
  const pool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL, max: 1 });
  const db = drizzle(pool, { schema: s });
  try {
    const existing = await db
      .select({ id: s.users.id })
      .from(s.users)
      .where(and(eq(s.users.email, env.OWNER_EMAIL), isNull(s.users.deletedAt)));
    if (existing.length > 0) {
      console.log("Owner already exists; nothing changed.");
    } else {
      await db.insert(s.users).values({
        email: env.OWNER_EMAIL,
        passwordHash: await hash(env.OWNER_PASSWORD),
        displayName: env.OWNER_NAME,
        role: "owner",
      });
      console.log(`Owner created: ${env.OWNER_EMAIL}`);
    }
    // Plain SQL outside a Server Action cannot expire Next's content cache (updateTag only works inside one).
    // The owner account is not public content, but the same rule applies to every script that writes directly.
    console.log("NOTE: if the app has run before, delete .next/cache/fetch-cache and .next/server/route-cache (or recreate the container) and restart it; Next keeps its data cache and its rendered pages on disk, so a restart alone serves stale pages.");
  } finally {
    await pool.end();
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

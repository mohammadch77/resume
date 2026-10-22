import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "migrations");

/** Applies drizzle/migrations/*.sql in filename order, each in its own transaction, once. */
export async function migrate(connectionString: string, dir = MIGRATIONS_DIR): Promise<string[]> {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         checksum text NOT NULL,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const done = await client.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE name = $1",
        [file],
      );
      if (done.rowCount) {
        if (done.rows[0].checksum !== checksum) {
          throw new Error(`Migration ${file} was modified after being applied`);
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
      applied.push(file);
    }
  } finally {
    await client.end();
  }
  return applied;
}

if (process.argv[1] && path.basename(process.argv[1]) === "migrate.ts") {
  const url = process.env.MIGRATOR_DATABASE_URL;
  if (!url) {
    console.error("MIGRATOR_DATABASE_URL is required");
    process.exit(1);
  }
  migrate(url).then(
    (applied) => console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Nothing to apply"),
    (err: Error) => {
      console.error(err.message);
      process.exit(1);
    },
  );
}

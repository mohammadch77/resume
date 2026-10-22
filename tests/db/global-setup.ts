import { randomBytes } from "node:crypto";
import pg from "pg";
import type { TestProject } from "vitest/node";
import { migrate } from "../../scripts/migrate";

const BASE = process.env.TEST_PG_URL ?? "postgres://postgres:postgres@localhost:5434";

declare module "vitest" {
  export interface ProvidedContext {
    dbName: string;
    baseUrl: string;
  }
}

/** Creates a fresh database (owned by migrator), applies all migrations as migrator, drops it afterwards. */
export default async function setup(project: TestProject) {
  const dbName = `gw_test_${randomBytes(4).toString("hex")}`;
  const admin = new pg.Client({ connectionString: `${BASE}/postgres` });
  await admin.connect();
  await admin.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN
      CREATE ROLE migrator LOGIN PASSWORD 'migrator' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
      CREATE ROLE app_rw LOGIN PASSWORD 'app_rw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
  END $$`);
  await admin.query(`CREATE DATABASE ${dbName} OWNER migrator`);
  await admin.query(`REVOKE CONNECT ON DATABASE ${dbName} FROM PUBLIC`);
  await admin.query(`GRANT CONNECT ON DATABASE ${dbName} TO app_rw`);

  const hostPart = BASE.replace(/^postgres:\/\/[^@]*@/, "");
  const migratorUrl = `postgres://migrator:migrator@${hostPart}/${dbName}`;
  await migrate(migratorUrl);

  project.provide("dbName", dbName);
  project.provide("baseUrl", BASE);

  return async () => {
    await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await admin.end();
  };
}

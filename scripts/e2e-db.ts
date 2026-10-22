import { hash } from "@node-rs/argon2";
import pg from "pg";
import { E2E_PASSWORD } from "../tests/e2e/constants";
import { migrate } from "./migrate";

/** Recreates the `gw_e2e` database with the owner and editor accounts the Playwright tests sign in with. */
const BASE = process.env.TEST_PG_URL ?? "postgres://postgres:postgres@localhost:5434";
const DB = "gw_e2e";
const hostPart = BASE.replace(/^postgres:\/\/[^@]*@/, "");

async function main() {
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
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB} OWNER migrator`);
  await admin.query(`GRANT CONNECT ON DATABASE ${DB} TO app_rw`);
  await admin.end();

  const migratorUrl = `postgres://migrator:migrator@${hostPart}/${DB}`;
  await migrate(migratorUrl);

  const db = new pg.Client({ connectionString: migratorUrl });
  await db.connect();
  const passwordHash = await hash(E2E_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  for (const [email, name, role] of [
    ["owner@e2e.test", "مالک آزمایشی", "owner"],
    ["editor@e2e.test", "ویراستار آزمایشی", "editor"],
  ]) {
    await db.query(`INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4)`, [email, passwordHash, name, role]);
  }
  await db.query(
    `INSERT INTO site_settings (id, brand_name, hero_title, hero_subtitle, primary_cta_label)
     VALUES (1, 'Grin Web', 'عنوان', 'زیرعنوان', 'درخواست مشاوره رایگان')`,
  );
  await db.end();
  console.log("e2e database ready");
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});

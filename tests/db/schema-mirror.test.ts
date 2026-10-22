import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { is } from "drizzle-orm";
import { PgTable as PgTableClass } from "drizzle-orm/pg-core";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { connect } from "./helpers";

const db = connect();
afterAll(() => db.close());

describe("lib/db/schema.ts mirrors the migrated database", () => {
  const tables = Object.values(schema).filter((v) => is(v, PgTableClass)) as unknown as PgTable[];

  it("covers exactly the tables that exist", async () => {
    const r = await db.su.query<{ t: string }>(
      `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations' ORDER BY 1`,
    );
    expect(tables.map((t) => getTableConfig(t).name).sort()).toEqual(r.rows.map((x) => x.t));
  });

  for (const table of tables) {
    const cfg = getTableConfig(table);
    it(`${cfg.name}: column names and nullability match`, async () => {
      const r = await db.su.query<{ c: string; n: string }>(
        `SELECT column_name AS c, is_nullable AS n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY 1`,
        [cfg.name],
      );
      const expected = r.rows.map((x) => `${x.c}:${x.n === "NO"}`);
      const actual = cfg.columns.map((c) => `${c.name}:${c.notNull}`).sort();
      expect(actual).toEqual(expected);
    });
  }
});

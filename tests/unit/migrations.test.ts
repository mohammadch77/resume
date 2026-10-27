import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR = path.resolve(__dirname, "..", "..", "drizzle", "migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

describe("migrations carry rules, not data", () => {
  it("finds the migrations in order", () => {
    expect(files[0]).toBe("0001_schema.sql");
    expect(files).toContain("0005_admin_guards.sql");
    expect(files).toContain("0006_consult_cta_href.sql");
  });

  for (const file of files) {
    it(`${file}: no INSERT except the audit trigger writing audit_log`, () => {
      const sql = readFileSync(path.join(DIR, file), "utf8");
      const inserts = [...sql.matchAll(/insert\s+into\s+([a-z_."]+)/gi)].map((m) => m[1].replaceAll('"', ""));
      expect(inserts.filter((table) => table !== "audit_log")).toEqual([]);
    });
  }
});

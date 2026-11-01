import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_TEXT_DEFAULTS } from "../../lib/content/home-defaults";

const DIR = path.resolve(__dirname, "..", "..", "drizzle", "migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

describe("migrations carry rules, not data", () => {
  it("finds the migrations in order", () => {
    expect(files[0]).toBe("0001_schema.sql");
    expect(files).toContain("0005_admin_guards.sql");
    expect(files).toContain("0006_consult_cta_href.sql");
    expect(files).toContain("0008_home_content_row.sql");
  });

  // the one exception: 0008 creates the singleton row of home_content (app_rw can not INSERT it, see the file's header)
  const ALLOWED: Record<string, string[]> = { "0008_home_content_row.sql": ["home_content"] };
  for (const file of files) {
    it(`${file}: no INSERT except the audit trigger writing audit_log${ALLOWED[file] ? ` and ${ALLOWED[file].join(", ")}` : ""}`, () => {
      const sql = readFileSync(path.join(DIR, file), "utf8");
      const inserts = [...sql.matchAll(/insert\s+into\s+([a-z_."]+)/gi)].map((m) => m[1].replaceAll('"', ""));
      expect(inserts.filter((table) => table !== "audit_log" && !(ALLOWED[file] ?? []).includes(table))).toEqual([]);
    });
  }

  it("0008's literals are exactly the default copy of lib/content/home-defaults.ts, and it never touches the pictures", () => {
    const sql = readFileSync(path.join(DIR, "0008_home_content_row.sql"), "utf8");
    const values = sql.slice(sql.indexOf("VALUES"));
    for (const text of Object.values(HOME_TEXT_DEFAULTS)) expect(values, text).toContain(`'${text.replaceAll("'", "''")}'`);
    expect(sql).not.toContain("hero_image");
    expect(sql).toMatch(/ON CONFLICT \(id\) DO NOTHING/);
  });
});

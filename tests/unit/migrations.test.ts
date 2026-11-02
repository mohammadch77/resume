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
    expect(files).toContain("0009_home_content_marketing_texts.sql");
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

  const NINE = ["clientsEyebrow", "clientsTitle", "partnersLabel", "contactTitle", "contactLead", "contactNote"];
  it("0009 adds exactly the six marketing-copy columns, NOT NULL with a length CHECK and the current copy as DEFAULT, and keeps every existing value", () => {
    const sql = readFileSync(path.join(DIR, "0009_home_content_marketing_texts.sql"), "utf8");
    for (const key of NINE) {
      const text = HOME_TEXT_DEFAULTS[key as keyof typeof HOME_TEXT_DEFAULTS];
      const column = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      expect(sql, key).toContain(`ADD COLUMN ${column} text NOT NULL DEFAULT '${text.replaceAll("'", "''")}'`);
    }
    expect(sql).not.toMatch(/(DROP|UPDATE|DELETE)/i);
    expect((sql.match(/ADD CONSTRAINT/g) ?? []).length).toBe(3);
  });

  it("0008's literals are exactly the default copy of lib/content/home-defaults.ts, and it never touches the pictures", () => {
    const sql = readFileSync(path.join(DIR, "0008_home_content_row.sql"), "utf8");
    const values = sql.slice(sql.indexOf("VALUES"));
    for (const [key, text] of Object.entries(HOME_TEXT_DEFAULTS)) {
      if (NINE.includes(key)) continue; // these six columns came with 0009
      expect(values, text).toContain(`'${text.replaceAll("'", "''")}'`);
    }
    expect(sql).not.toContain("hero_image");
    expect(sql).toMatch(/ON CONFLICT \(id\) DO NOTHING/);
  });
});

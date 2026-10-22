import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "design") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const files = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "lib")), ...walk(path.join(ROOT, "components"))];
const actionFiles = files.filter((f) => /^\s*["']use server["']/m.test(readFileSync(f, "utf8").slice(0, 200)));

describe("server actions", () => {
  it("finds the action files", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of actionFiles) {
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    it(`${rel}: every export is wrapped in adminAction, unless the file is marked public-action`, () => {
      const src = readFileSync(file, "utf8");
      if (src.includes("// public-action")) return;
      const asyncFunctionExports = src.match(/^export\s+(async\s+)?function\s+\w+/gm) ?? [];
      expect(asyncFunctionExports, "use `export const x = adminAction(...)`").toEqual([]);
      const constExports = [...src.matchAll(/^export\s+const\s+(\w+)\s*=\s*([^\n]*)/gm)];
      expect(constExports.length).toBeGreaterThan(0);
      for (const [, name, rhs] of constExports) expect(rhs, name).toMatch(/^adminAction\(/);
    });
  }

  it("public actions are limited to the login form (add new ones here deliberately)", () => {
    const publicFiles = actionFiles
      .filter((f) => readFileSync(f, "utf8").includes("// public-action"))
      .map((f) => path.relative(ROOT, f).replaceAll("\\", "/"));
    expect(publicFiles).toEqual(["app/(admin)/admin/login/actions.ts"]);
  });
});

describe("admin pages", () => {
  const pages = files.filter((f) => /app[\\/]\(admin\)[\\/]admin[\\/].*page\.tsx$/.test(f));
  for (const page of pages) {
    const rel = path.relative(ROOT, page).replaceAll("\\", "/");
    if (rel.endsWith("login/page.tsx")) continue;
    it(`${rel} sits under the panel layout (which calls requireRole)`, () => {
      expect(rel).toContain("/(panel)/");
    });
  }
  it("the panel layout requires a role", () => {
    const layout = readFileSync(path.join(ROOT, "app/(admin)/admin/(panel)/layout.tsx"), "utf8");
    expect(layout).toMatch(/requireRole\(/);
  });
});

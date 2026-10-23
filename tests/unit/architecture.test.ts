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

  it("public actions are limited to the login form and the contact form (add new ones here deliberately)", () => {
    const publicFiles = actionFiles
      .filter((f) => readFileSync(f, "utf8").includes("// public-action"))
      .map((f) => path.relative(ROOT, f).replaceAll("\\", "/"));
    expect(publicFiles.sort()).toEqual(["app/(admin)/admin/login/actions.ts", "app/(site)/contact/actions.ts"]);
  });
});

describe("media limits are written once", () => {
  it("no source file except lib/media/config.ts spells out the upload size limits", () => {
    const literal = /(104857600|26214400|15728640)|(15|25|100)\s*\*\s*1024\s*\*\s*1024/;
    const offenders = files
      .filter((f) => !f.replaceAll("\\", "/").endsWith("lib/media/config.ts"))
      .filter((f) => literal.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f).replaceAll("\\", "/"));
    expect(offenders).toEqual([]);
  });
});

describe("admin route handlers", () => {
  const handlers = files.filter((f) => /app[\\/]\(admin\)[\\/].*route\.ts$/.test(f));
  it("finds the upload handler", () => {
    expect(handlers.length).toBeGreaterThanOrEqual(1);
  });
  for (const handler of handlers) {
    const rel = path.relative(ROOT, handler).replaceAll("\\", "/");
    it(`${rel} authenticates itself (it may be outside the proxy matcher)`, () => {
      expect(readFileSync(handler, "utf8")).toMatch(/authenticateAdminRequest\(/);
    });
  }
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

describe("public landing rules", () => {
  const rel = (f: string) => path.relative(ROOT, f).replaceAll("\\", "/");
  const siteFiles = files.filter((f) => /^(components\/site\/|app\/\(site\)\/)/.test(rel(f)));
  const read = (f: string) => readFileSync(f, "utf8");

  it("finds the site files", () => {
    expect(siteFiles.length).toBeGreaterThan(10);
  });

  it("a <video> is rendered only by gallery-video.tsx, and only the case study imports it (never the hero, cards or sections)", () => {
    const withVideoTag = siteFiles.filter((f) => /^\s*<video[\s>]/m.test(read(f))).map(rel);
    expect(withVideoTag).toEqual(["components/site/gallery-video.tsx"]);
    const importers = siteFiles.filter((f) => /gallery-video/.test(read(f)) && !rel(f).endsWith("gallery-video.tsx")).map(rel);
    expect(importers).toEqual(["components/site/case-study.tsx"]);
    // and nothing in the design system renders one either
    expect(files.filter((f) => rel(f).startsWith("components/ds/") && /^\s*<video[\s>]/m.test(read(f)))).toEqual([]);
  });

  it("public code never imports admin code", () => {
    const offenders = siteFiles.filter((f) => /from "@\/(components\/admin|lib\/admin|app\/\(admin\))/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("the «۱ از ۴» strip progress is site composition (components/site), not a design-system component", () => {
    expect(siteFiles.map(rel)).toContain("components/site/strip-progress.tsx");
    expect(files.filter((f) => rel(f).startsWith("components/ds/") && /StripProgress|lk-progress/.test(read(f)))).toEqual([]);
  });

  it("covers go through ResponsivePicture; CoverArt appears in the site only as the design system's own fallback", () => {
    const usesCoverArt = siteFiles.filter((f) => /<CoverArt/.test(read(f))).map(rel);
    // hero art and the /work page fall back to CoverArt when a project has no image; nothing else may
    expect(usesCoverArt.sort()).toEqual(["app/(site)/work/[slug]/page.tsx", "components/site/hero.tsx"]);
    expect(siteFiles.filter((f) => /<img[\s>]/.test(read(f))).map(rel)).toEqual(["components/site/responsive-picture.tsx"]);
  });
});

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { devPagesEnabled } from "@/lib/dev-pages";
import { buildThemeCss, buildTokensCss } from "../../scripts/gen-tokens";
import { findViolations } from "../../scripts/tokens-check";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8").replaceAll("\r\n", "\n");

describe("generated token files", () => {
  it("app/tokens.css and app/theme.css match design/ exactly (run `npm run tokens:gen` after changing design/)", () => {
    expect(read("app/tokens.css")).toBe(buildTokensCss());
    expect(read("app/theme.css")).toBe(buildThemeCss());
  });

  it("the theme maps every design colour and type size to a Tailwind utility", () => {
    const theme = buildThemeCss();
    for (const token of ["--color-paper", "--color-accent-ink", "--color-surface", "--text-display-xl", "--text-display-xl--line-height", "--text-body", "--radius-pill", "--ease-out", "--spacing: 4px"]) {
      expect(theme, token).toContain(token);
    }
  });

  it("the spacing scale is a real token group (the page CSS uses var(--space-7))", () => {
    expect(buildTokensCss()).toContain("--space-7:48px;");
  });

  it("the font faces point at /fonts and the base element rules sit in a layer", () => {
    const css = buildTokensCss();
    expect(css).toContain('url("/fonts/Estedad-SemiBold.woff2")');
    expect(css).not.toContain("../fonts/");
    expect(css).toMatch(/@layer base \{[\s\S]*html\{background/);
  });
});

describe("tokens:check", () => {
  it("passes on this repository: no raw colours or px values in app/ and components/", () => {
    expect(findViolations()).toEqual([]);
  });

  it("finds raw colours and px values, but not breakpoints, comments or generated files", () => {
    const root = mkdtempSync(path.join(tmpdir(), "gw-tokens-"));
    try {
      mkdirSync(path.join(root, "app"), { recursive: true });
      mkdirSync(path.join(root, "components", "ui"), { recursive: true });
      writeFileSync(path.join(root, "app", "bad.tsx"), 'const a = "#2338d6";\nconst b = { padding: "13px" };\nconst c = "rgb(1, 2, 3)";\n');
      writeFileSync(path.join(root, "app", "ok.tsx"), '// a 16px comment and #fff in prose\nconst sizes = "(min-width: 1280px) 20vw, 100vw";\nconst gap = "var(--space-4)";\n');
      writeFileSync(path.join(root, "app", "tokens.css"), ":root{--x:#ffffff;--y:4px}");
      writeFileSync(path.join(root, "components", "ui", "vendor.tsx"), 'const r = "rounded-[4px]";');
      const found = findViolations(root);
      expect(found.map((v) => `${v.file}:${v.line}:${v.rule}`).sort()).toEqual(["app/bad.tsx:1:raw hex colour", "app/bad.tsx:2:raw px value", "app/bad.tsx:3:raw rgb()/hsl()/oklch() colour"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("dev pages gate", () => {
  it("exist in development and test, never in production unless a test run asks for them", () => {
    expect(devPagesEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devPagesEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(devPagesEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devPagesEnabled({ NODE_ENV: "production", ENABLE_DEV_PAGES: "false" })).toBe(false);
    expect(devPagesEnabled({ NODE_ENV: "production", ENABLE_DEV_PAGES: "true" })).toBe(true);
  });
});

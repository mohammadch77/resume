import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildThemeCss, buildTokensCss, loadTokens } from "../../scripts/gen-tokens";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8").replaceAll("\r\n", "\n");

describe("v2 tokens (design/tokens.json)", () => {
  it("the generated files are exactly what the JSON builds", () => {
    expect(read("app/tokens.css")).toBe(buildTokensCss());
    expect(read("app/theme.css")).toBe(buildThemeCss());
  });

  it("has one accent family, an ink of #141414 and no dark theme", () => {
    const t = loadTokens();
    expect(t.color.accent).toBe("#ec3f1e");
    expect(t.color.ink).toBe("#141414");
    expect(t.color.paper).toBe("#ffffff");
    expect(t.color.surface).toBe("#f1f0ee");
    expect(buildTokensCss()).not.toContain('data-theme="dark"');
  });

  it("Estedad is the only font family, in two weights, self-hosted and licensed", () => {
    const t = loadTokens();
    expect(Object.keys(t.font)).toEqual(["sans"]);
    expect(t.font.sans).toMatch(/^"Estedad"/);
    expect(t.font.sans).not.toMatch(/Vazirmatn/);
    const css = buildTokensCss();
    expect([...css.matchAll(/font-family:"([^"]+)"/g)].map((m) => m[1])).toEqual(["Estedad", "Estedad"]);
    expect(css).not.toMatch(/https?:\/\//);
    for (const w of ["Regular", "SemiBold"]) {
      const f = path.join(ROOT, `public/fonts/Estedad-${w}.woff2`);
      expect(existsSync(f), w).toBe(true);
      expect(statSync(f).size).toBeLessThan(40 * 1024);
    }
    expect(read("public/fonts/OFL-Estedad.txt")).toContain("SIL OPEN FONT LICENSE Version 1.1");
  });

  it("the landing root size mixes rem and vw (zoom and the font-size setting still work) and is scoped to the landing", () => {
    const css = buildTokensCss();
    expect(css).toMatch(/:root:has\(\.lm-root\)\{font-size:clamp\(\d+px,calc\([\d.]+rem \+ [\d.]+vw\),\d+px\)\}/);
    expect(css).not.toMatch(/html\{[^}]*font-size:[\d.]+vw/);
  });

  it("the kit never uses letter-spacing (it breaks Persian joining)", () => {
    expect(read("components/site/ui/ui.css")).not.toMatch(/letter-spacing/);
  });
});

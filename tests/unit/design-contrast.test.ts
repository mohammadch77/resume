import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, contrastReport } from "../../scripts/design-contrast";

describe("design:contrast", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  it("every colour pair the site uses meets AA (4.5:1 text, 3:1 non-text) in both themes", () => {
    const failed = contrastReport().filter((r) => !r.ok);
    expect(failed.map((r) => `${r.theme}: ${r.what} ${r.ratio.toFixed(2)}`)).toEqual([]);
  });

  it("covers both themes with the same pairs", () => {
    const rows = contrastReport();
    const light = rows.filter((r) => r.theme === "light");
    expect(light.length).toBeGreaterThan(15);
    expect(rows.filter((r) => r.theme === "dark")).toHaveLength(light.length);
  });

  it("refuses a stylesheet without the colour blocks instead of passing silently", () => {
    expect(() => contrastReport(":root{--color-paper:#ffffff;--color-ink:#ffffff;}")).toThrow(/colour block/);
  });
});

describe("focus rings on the dark grounds", () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
  it("the CTA band and the footer override the default focus ring, which has no contrast there", () => {
    expect(read("design/components/cta-band/cta-band.css")).toMatch(/\.gw-band :focus-visible\{outline-color:var\(--color-on-lapis\)\}/);
    expect(read("components/site/landing.css")).toMatch(/\.lk-foot :focus-visible\{outline-color:var\(--color-paper\)\}/);
  });
});

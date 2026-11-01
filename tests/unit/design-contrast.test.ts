import { describe, expect, it } from "vitest";
import { contrastRatio, contrastReport } from "../../scripts/design-contrast";

describe("design:contrast", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  it("every colour pair the site uses meets AA (4.5:1 text, 3:1 large text and non-text)", () => {
    const failed = contrastReport().filter((r) => !r.ok);
    expect(failed.map((r) => `${r.what} ${r.ratio.toFixed(2)}`)).toEqual([]);
  });

  it("checks the pairs that matter for the accent: it is never small text on white", () => {
    const rows = contrastReport();
    expect(rows.length).toBeGreaterThan(20);
    const accentOnPaper = rows.find((r) => r.fg.startsWith("accent #") && r.bg.startsWith("paper") && r.min === 3);
    expect(accentOnPaper?.ratio).toBeLessThan(4.5);
    expect(rows.find((r) => r.what.startsWith("accent-coloured small text on page"))?.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("refuses a stylesheet without the colour block instead of passing silently", () => {
    expect(() => contrastReport(":root{--color-paper:#ffffff;--color-ink:#ffffff;}")).toThrow(/unknown colour token/);
    expect(() => contrastReport("body{}")).toThrow(/colour block/);
  });
});

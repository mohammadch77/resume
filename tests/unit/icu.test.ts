import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ICU is complete in the Node that runs the tests", () => {
  it("scripts/icu-check.mjs passes (full ICU, Persian calendar and digits, current Tehran tzdata)", () => {
    const out = execFileSync(process.execPath, [path.resolve("scripts/icu-check.mjs")], { encoding: "utf8" });
    const report = JSON.parse(out) as { failures: string[]; icu: string };
    expect(report.failures).toEqual([]);
    expect(report.icu).toBeTruthy();
  });
});

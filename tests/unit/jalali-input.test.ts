import { describe, expect, it } from "vitest";
import { formatJalaliInput, normalizeDigits, parseJalaliInput } from "@/lib/date/jalali-input";

describe("Shamsi date input", () => {
  it("parses ASCII and Persian digits and both separators", () => {
    expect(parseJalaliInput("1404/01/01")).toBe("2025-03-21");
    expect(parseJalaliInput("۱۴۰۴/۰۱/۰۱")).toBe("2025-03-21");
    expect(parseJalaliInput("1404-1-1")).toBe("2025-03-21");
    expect(parseJalaliInput(" ١٤٠٤/٠١/٠١ ")).toBe("2025-03-21");
  });
  it("rejects impossible dates and noise", () => {
    expect(parseJalaliInput("1404/12/30")).toBeNull(); // 1404 is not a leap year
    expect(parseJalaliInput("1403/12/30")).toBe("2025-03-20"); // 1403 is
    expect(parseJalaliInput("1404/13/01")).toBeNull();
    expect(parseJalaliInput("hello")).toBeNull();
    expect(parseJalaliInput("")).toBeNull();
  });
  it("formats back to the typed form", () => {
    expect(formatJalaliInput("2025-03-21")).toBe("1404/01/01");
    expect(formatJalaliInput(null)).toBe("");
  });
  it("normalises digits", () => {
    expect(normalizeDigits("۰۹۱۲٣")).toBe("09123");
  });
});

import { describe, expect, it } from "vitest";
import { HOME_TEXT_DEFAULTS } from "@/lib/content/home-defaults";
import { isSampleText } from "@/lib/content/sample";

/** The column limits of drizzle/migrations/0007_home_content.sql (char_length BETWEEN 1 AND n). */
const MAX: Record<keyof typeof HOME_TEXT_DEFAULTS, number> = {
  heroEyebrow: 60,
  heroLine1: 60,
  heroLine2: 60,
  heroLine3: 60,
  heroDescription: 300,
  heroSecondaryCtaLabel: 40,
  aboutEyebrow: 60,
  aboutLead: 200,
  aboutRest: 300,
  workEyebrow: 60,
  workTitle: 80,
  servicesEyebrow: 60,
  servicesTitle: 80,
  statsEyebrow: 60,
  statsTitle: 80,
  bandTitle: 120,
  bandText: 300,
  footerTagline: 200,
  footerLegal: 120,
  clientsEyebrow: 60,
  clientsTitle: 80,
  partnersLabel: 40,
  contactTitle: 80,
  contactLead: 200,
  contactNote: 200,
};

describe("the page's default copy (lib/content/home-defaults.ts)", () => {
  it("every text fits its column", () => {
    for (const [key, max] of Object.entries(MAX)) {
      const text = HOME_TEXT_DEFAULTS[key as keyof typeof MAX];
      expect(text.length, key).toBeGreaterThanOrEqual(1);
      expect(text.length, key).toBeLessThanOrEqual(max);
    }
    expect(Object.keys(HOME_TEXT_DEFAULTS).sort()).toEqual(Object.keys(MAX).sort());
  });

  it("is real copy, not a claim: no sample label, no digits (no figure, year or count that could be untrue), no Latin brand text", () => {
    for (const [key, text] of Object.entries(HOME_TEXT_DEFAULTS)) {
      // «نمونه‌کارها» (portfolio) is a real word that happens to start with the sample label
      expect(isSampleText(text.replace("نمونه‌کار", "")), key).toBe(false);
      expect(text, key).not.toMatch(/[0-9۰-۹٠-٩]/);
      expect(text, key).not.toMatch(/[A-Za-z]{3,}/);
    }
  });
});

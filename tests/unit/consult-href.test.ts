import { describe, expect, it } from "vitest";
import { CONSULT_HREF_PATTERN, settingsFormSchema, SOCIAL_KEYS } from "@/lib/validation/settings";

const base = {
  brandName: "گرین وب",
  heroTitle: "تیتر",
  heroSubtitle: "زیرتیتر",
  primaryCtaLabel: "درخواست مشاوره رایگان",
  contactPhone: "",
  contactEmail: "",
  contactAddress: "",
  consultCtaHref: "",
  socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ""])),
  seoTitle: "",
  seoDescription: "",
};
const parse = (consultCtaHref: string) => settingsFormSchema.safeParse({ ...base, consultCtaHref });

describe("consultCtaHref (the footer link)", () => {
  it.each(["", "tel:+989121234567", "tel:02112345678", "https://example.com/a?b=1", "#contact"])("accepts %j", (v) => {
    expect(parse(v).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "http://example.com", "mailto:a@b.co", "tel:", "tel:12", "#", "/contact", "https://exa mple.com", "https://a.com/<b>"])("rejects %j with a Persian instruction", (v) => {
    const r = parse(v);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("tel:+98912xxxxxxx");
  });

  it("accepts Persian digits in a phone link and stores them as ASCII", () => {
    const r = parse("tel:+۹۸۹۱۲۱۲۳۴۵۶۷");
    expect(r.success && r.data.consultCtaHref).toBe("tel:+989121234567");
  });

  it("trims spaces around the value", () => {
    const r = parse("  #contact  ");
    expect(r.success && r.data.consultCtaHref).toBe("#contact");
  });

  it("uses the same pattern as the database CHECK", () => {
    expect(CONSULT_HREF_PATTERN.test("tel:+989121234567")).toBe(true);
    expect(CONSULT_HREF_PATTERN.test("http://example.com")).toBe(false);
  });
});

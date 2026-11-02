import { describe, expect, it } from "vitest";
import { HOME_FORM_BLANK, heroCardSchema, homeFormSchema, homeStatSchema } from "@/lib/validation/home";

describe("home form validation (Persian messages on the field)", () => {
  it("the defaults are a valid form", () => {
    expect(homeFormSchema.safeParse(HOME_FORM_BLANK).success).toBe(true);
  });
  it("an empty required text says which one, in Persian, on that field", () => {
    const r = homeFormSchema.safeParse({ ...HOME_FORM_BLANK, bandTitle: "  " });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]).toMatchObject({ path: ["bandTitle"], message: expect.stringContaining("بنر: عنوان را بنویسید") });
  });
  it("Persian digits are accepted for the rating and the stat value", () => {
    expect(homeFormSchema.safeParse({ ...HOME_FORM_BLANK, heroRatingScore: "۴", heroRatingLabel: "x" }).success).toBe(true);
    const stat = homeStatSchema.safeParse({ value: "۱۵۰", suffix: "+", label: "پروژه" });
    expect(stat.success && stat.data.value).toBe("150");
    expect(homeStatSchema.safeParse({ value: "1000000", suffix: "", label: "x" }).success).toBe(false);
    expect(homeStatSchema.safeParse({ value: "-1", suffix: "", label: "x" }).success).toBe(false);
    expect(homeStatSchema.safeParse({ value: "5", suffix: "12345", label: "x" }).success).toBe(false);
  });
  it("card and stat labels have the column limits (40/80 and 60)", () => {
    expect(heroCardSchema.safeParse({ caption: "ا".repeat(40), title: "ا".repeat(80) }).success).toBe(true);
    expect(heroCardSchema.safeParse({ caption: "ا".repeat(41), title: "x" }).success).toBe(false);
    expect(homeStatSchema.safeParse({ value: "1", suffix: "", label: "ا".repeat(61) }).success).toBe(false);
  });
});

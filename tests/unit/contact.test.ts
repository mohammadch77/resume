import { describe, expect, it } from "vitest";
import { contactSchema, normalizePhone } from "@/lib/leads/submit";
import { leadText } from "@/lib/leads/notify";

describe("normalizePhone", () => {
  it.each([
    ["09121234567", "09121234567"],
    ["۰۹۱۲۱۲۳۴۵۶۷", "09121234567"],
    ["٠٩١٢١٢٣٤٥٦٧", "09121234567"],
    ["+98 912 123 4567", "09121234567"],
    ["0098-912-123-4567", "09121234567"],
    ["989121234567", "09121234567"],
    ["9121234567", "09121234567"],
    ["(0912) 123 4567", "09121234567"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["0212345678", "08121234567", "0912123456", "091212345678", "abc", ""])("leaves %j for validation to reject", (input) => {
    expect(contactSchema.safeParse({ name: "علی", phone: input, message: "سلام" }).success).toBe(false);
  });
});

describe("contact schema messages say how to fix the field", () => {
  const errors = (input: Record<string, string>) => {
    const r = contactSchema.safeParse({ name: "علی", phone: "09121234567", message: "پیام", ...input });
    return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
  };

  it("name", () => {
    expect(errors({ name: "  " })).toEqual({ name: "نام خود را بنویسید." });
    expect(errors({ name: "x".repeat(81) }).name).toContain("۸۰");
    expect(errors({ name: "<b>علی</b>" }).name).toContain("<");
  });
  it("phone", () => {
    expect(errors({ phone: "12345" })).toEqual({ phone: "شماره را با ۰۹ شروع کنید و ۱۱ رقم بنویسید." });
  });
  it("message", () => {
    expect(errors({ message: "" })).toEqual({ message: "درباره‌ی پروژه‌تان چند خط بنویسید." });
    expect(errors({ message: "y".repeat(2001) }).message).toContain("۲۰۰۰");
    expect(errors({ message: "<script>" }).message).toContain("<");
  });
  it("trims and normalises valid input", () => {
    expect(contactSchema.parse({ name: "  علی  ", phone: " ۰۹۱۲۱۲۳۴۵۶۷ ", message: "  سلام  " })).toEqual({ name: "علی", phone: "09121234567", message: "سلام" });
  });
});

describe("notification text", () => {
  it("is plain text with the lead's fields and cuts a very long message", () => {
    const text = leadText({ name: "علی", phone: "09121234567", message: "ب".repeat(900) });
    expect(text).toContain("نام: علی");
    expect(text).toContain("تلفن: 09121234567");
    expect(text.length).toBeLessThan(700);
    expect(text.endsWith("…")).toBe(true);
  });
});

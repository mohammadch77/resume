import { describe, expect, it } from "vitest";
import { describeDbError, pgError, publishGateReasons, PUBLISH_GATE_REASONS } from "@/lib/db/errors";
import { blankToNull, optionalHttpsUrl, requiredText, slugSchema } from "@/lib/validation/common";

const pg = (code: string, message = "", constraint?: string) => Object.assign(new Error(message), { code, constraint });
/** Drizzle wraps the driver error in `cause`. */
const wrapped = (inner: Error) => Object.assign(new Error("Failed query"), { cause: inner });

describe("database error mapping", () => {
  it("finds the pg error inside Drizzle's wrapper", () => {
    expect(pgError(wrapped(pg("23505", "dup", "projects_slug_active_uq")))).toMatchObject({ code: "23505", constraint: "projects_slug_active_uq" });
    expect(pgError(new Error("plain"))).toBeNull();
    expect(pgError(null)).toBeNull();
  });

  it("lists every missing publish requirement in Persian, in the order given", () => {
    expect(publishGateReasons("publish_gate: cover,services,summary_length")).toEqual([
      PUBLISH_GATE_REASONS.cover,
      PUBLISH_GATE_REASONS.services,
      PUBLISH_GATE_REASONS.summary_length,
    ]);
    expect(publishGateReasons("publish_gate: something_new")[0]).toContain("something_new");
    expect(publishGateReasons("unrelated")).toEqual([]);
  });

  it("every code the publish-gate triggers can emit has a Persian text", () => {
    for (const code of ["cover", "cover_alt", "services", "published_at", "summary_length", "demo_content", "consent"]) {
      expect(PUBLISH_GATE_REASONS[code], code).toMatch(/[؀-ۿ]/);
    }
  });

  it.each([
    ["GW001", { kind: "conflict" }],
    ["GW003", { kind: "blocked" }],
    ["GW002", { kind: "failed" }],
    ["GW006", { kind: "failed" }],
    ["GW004", { kind: "failed" }],
    ["GW005", { kind: "failed" }],
    ["23001", { kind: "failed" }],
    ["23503", { kind: "failed" }],
    ["23514", { kind: "failed" }],
  ])("%s -> %j", (code, expected) => {
    expect(describeDbError(wrapped(pg(code, "publish_gate: cover")))).toMatchObject(expected);
  });

  it("points a duplicate slug / email at its form field", () => {
    expect(describeDbError(wrapped(pg("23505", "", "services_slug_active_uq")))).toMatchObject({ field: "slug" });
    expect(describeDbError(wrapped(pg("23505", "", "users_email_active_uq")))).toMatchObject({ field: "email" });
    expect(describeDbError(wrapped(pg("23505", "", "something_else")))).toMatchObject({ kind: "failed" });
  });

  it("leaves unknown errors alone so they fail loudly", () => {
    expect(describeDbError(new Error("connection reset"))).toBeNull();
    expect(describeDbError(wrapped(pg("40P01")))).toBeNull();
  });
});

describe("shared validation", () => {
  it.each(["a", "online-store", "x1-y2-z3"])("slug accepts %s", (v) => expect(slugSchema.safeParse(v).success).toBe(true));
  it.each(["", "Bad", "a--b", "-a", "a-", "a b", "فروشگاه", "a".repeat(81)])("slug rejects %j", (v) => expect(slugSchema.safeParse(v).success).toBe(false));
  it("https urls: empty is fine, http and javascript: are not", () => {
    const s = optionalHttpsUrl("نشانی");
    expect(s.safeParse("").success).toBe(true);
    expect(s.safeParse("https://example.ir/a").success).toBe(true);
    expect(s.safeParse("http://example.ir").success).toBe(false);
    expect(s.safeParse("javascript:alert(1)").success).toBe(false);
    expect(s.safeParse("https://").success).toBe(false);
  });
  it("required text trims and names the field in the message", () => {
    const r = requiredText("عنوان", 10).safeParse("   ");
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].message).toContain("عنوان");
  });
  it("blankToNull", () => {
    expect(blankToNull("  ")).toBeNull();
    expect(blankToNull(" x ")).toBe("x");
  });
});

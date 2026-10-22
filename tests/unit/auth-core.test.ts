import { describe, expect, it } from "vitest";
import {
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  ROTATION_GRACE_MS,
  SESSION_IDLE_MS,
  SESSION_ROTATE_MS,
  SESSION_TOUCH_MS,
} from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isExpired, isLocked, shouldRotate, shouldTouch, slidingExpiry } from "@/lib/auth/policy";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { isAllowedOrigin } from "@/lib/auth/request";
import { hashIp, hashToken, newToken } from "@/lib/auth/tokens";

const T0 = new Date("2026-01-10T10:00:00Z");
const after = (ms: number) => new Date(T0.getTime() + ms);

describe("password", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(h, "correct horse battery")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
  });
  it("never accepts when there is no stored hash (unknown user), even with the dummy hash's own password", async () => {
    expect(await verifyPassword(null, "grin-web-timing-equalizer")).toBe(false);
    expect(await verifyPassword(null, "anything")).toBe(false);
  });
  it("a malformed stored hash is a failed verification, not a crash", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});

describe("tokens", () => {
  it("are 256-bit, unique, url-safe; only their sha256 is stored", () => {
    const a = newToken();
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(newToken()).not.toBe(a);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
    expect(hashToken(a)).toBe(hashToken(a));
  });
  it("ip hashes are stable within a day and differ across days and secrets", () => {
    const s = "s".repeat(32);
    const day1 = hashIp("203.0.113.7", s, new Date("2026-01-10T01:00:00Z"));
    expect(day1).toMatch(/^[0-9a-f]{64}$/);
    expect(day1).not.toContain("203.0.113.7");
    expect(hashIp("203.0.113.7", s, new Date("2026-01-10T23:00:00Z"))).toBe(day1);
    expect(hashIp("203.0.113.7", s, new Date("2026-01-11T01:00:00Z"))).not.toBe(day1);
    expect(hashIp("203.0.113.7", "t".repeat(32), new Date("2026-01-10T01:00:00Z"))).not.toBe(day1);
    expect(hashIp("203.0.113.8", s, new Date("2026-01-10T01:00:00Z"))).not.toBe(day1);
  });
});

describe("session policy", () => {
  const absolute = after(7 * 24 * 3600 * 1000);
  it("sliding expiry is idle time, capped by the absolute expiry", () => {
    expect(slidingExpiry(T0, absolute).getTime()).toBe(T0.getTime() + SESSION_IDLE_MS);
    const near = after(1000);
    expect(slidingExpiry(T0, near)).toEqual(near);
  });
  it("expires at the idle limit and at the absolute cap", () => {
    expect(isExpired(after(1), absolute, T0)).toBe(false);
    expect(isExpired(T0, absolute, T0)).toBe(true);
    expect(isExpired(after(1000), T0, T0)).toBe(true);
  });
  it("rotates after 30 minutes, not before, and not while already rotating out", () => {
    const expires = after(SESSION_IDLE_MS);
    expect(shouldRotate(T0, expires, after(SESSION_ROTATE_MS - 1))).toBe(false);
    expect(shouldRotate(T0, expires, after(SESSION_ROTATE_MS))).toBe(true);
    const rotatingOut = after(SESSION_ROTATE_MS + ROTATION_GRACE_MS - 1000);
    expect(shouldRotate(T0, rotatingOut, after(SESSION_ROTATE_MS))).toBe(false);
  });
  it("extends expiry only after 5 minutes of idle time were used", () => {
    const expires = after(SESSION_IDLE_MS);
    expect(shouldTouch(expires, absolute, after(SESSION_TOUCH_MS - 1))).toBe(false);
    expect(shouldTouch(expires, absolute, after(SESSION_TOUCH_MS))).toBe(true);
  });
  it("never extends beyond the absolute cap", () => {
    const cap = after(SESSION_IDLE_MS);
    expect(shouldTouch(cap, cap, after(SESSION_IDLE_MS - 1000))).toBe(false);
  });
});

describe("lockout", () => {
  it("is 5 attempts and 15 minutes", () => {
    expect(MAX_FAILED_LOGINS).toBe(5);
    expect(LOCKOUT_MS).toBe(15 * 60 * 1000);
  });
  it("isLocked only while locked_until is in the future", () => {
    expect(isLocked(null, T0)).toBe(false);
    expect(isLocked(after(1), T0)).toBe(true);
    expect(isLocked(T0, T0)).toBe(false);
    expect(isLocked(after(-1), T0)).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit per window, per key, then recovers", () => {
    const rl = new RateLimiter(3, 1000);
    expect([1, 2, 3, 4].map(() => rl.allow("a", 0))).toEqual([true, true, true, false]);
    expect(rl.allow("b", 0)).toBe(true);
    expect(rl.allow("a", 1001)).toBe(true);
  });
});

describe("origin check", () => {
  it("accepts only the exact site origin; a missing Origin is rejected", () => {
    const site = "https://example.ir";
    expect(isAllowedOrigin("https://example.ir", site)).toBe(true);
    expect(isAllowedOrigin(null, site)).toBe(false);
    expect(isAllowedOrigin("https://evil.example", site)).toBe(false);
    expect(isAllowedOrigin("http://example.ir", site)).toBe(false);
    expect(isAllowedOrigin("https://example.ir.evil.example", site)).toBe(false);
  });
});

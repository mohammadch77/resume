import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "@/lib/auth/rate-limit";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { CONTACT_LIMITS, MIN_FILL_MS, submitContact, type ContactDeps } from "@/lib/leads/submit";
import { connect, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const ORIGIN = "https://grin.example";
const NOW = 1_800_000_000_000;
const good = () => ({ name: `سارا ${uid()}`, phone: "09121234567", message: "می‌خواهم یک فروشگاه اینترنتی بسازم.", website: "", ts: String(NOW - MIN_FILL_MS - 5_000) });

let notified: Array<{ name: string; phone: string; message: string }>;
let limiters: Map<string, RateLimiter>;
beforeEach(() => {
  notified = [];
  limiters = new Map();
});

const deps = (over: Partial<ContactDeps> = {}): ContactDeps => ({
  db,
  now: NOW,
  origin: ORIGIN,
  siteOrigin: ORIGIN,
  ipHash: "a".repeat(64),
  allow: (key, limit) => {
    const rule = key.startsWith("ip:") ? "ip" : "global";
    if (!limiters.has(rule)) limiters.set(rule, new RateLimiter(limit.max, limit.windowMs));
    return limiters.get(rule)!.allow(key, NOW);
  },
  notify: (lead) => notified.push(lead),
  ...over,
});
const rowsFor = async (name: string) => (await pools.su.query(`SELECT * FROM leads WHERE name = $1`, [name])).rows;

describe("contact form core", () => {
  it("stores a valid lead (normalised phone, consent, source, ip hash) and notifies once", async () => {
    const input = { ...good(), phone: "۰۹۱۲ ۱۲۳ ۴۵۶۷" };
    expect(await submitContact(deps(), input)).toEqual({ status: "sent" });
    const [row] = await rowsFor(input.name);
    expect(row).toMatchObject({ phone: "09121234567", consent: true, source: "landing", status: "new", ip_hash: "a".repeat(64), email: null });
    expect(notified).toEqual([{ name: input.name, phone: "09121234567", message: input.message }]);
  });

  it("rejects a foreign or missing Origin before anything else", async () => {
    for (const origin of ["https://evil.example", null]) {
      const input = good();
      const r = await submitContact(deps({ origin }), input);
      expect(r).toMatchObject({ status: "error", message: "درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید." });
      expect(await rowsFor(input.name)).toHaveLength(0);
    }
    expect(notified).toEqual([]);
  });

  it("a filled honeypot looks like success but stores and notifies nothing", async () => {
    const input = { ...good(), website: "https://spam.example" };
    expect(await submitContact(deps(), input)).toEqual({ status: "sent" });
    expect(await rowsFor(input.name)).toHaveLength(0);
    expect(notified).toEqual([]);
  });

  it("refuses a form submitted faster than a person can fill it, accepts it after the minimum", async () => {
    const input = { ...good(), ts: String(NOW - (MIN_FILL_MS - 1)) };
    expect(await submitContact(deps(), input)).toMatchObject({ status: "error", message: "فرم را کمی آرام‌تر پر کنید؛ چند ثانیه بعد دوباره ارسال کنید.", values: { name: input.name } });
    expect(await rowsFor(input.name)).toHaveLength(0);
    expect(await submitContact(deps(), { ...input, ts: String(NOW - MIN_FILL_MS) })).toEqual({ status: "sent" });
  });

  it("without a timestamp (no JavaScript) the fill-time check is skipped but every other gate still applies", async () => {
    const input = { ...good(), ts: "" };
    expect(await submitContact(deps(), input)).toEqual({ status: "sent" });
    expect(await submitContact(deps(), { ...good(), ts: "", website: "x" })).toEqual({ status: "sent" }); // honeypot silent
    expect(await submitContact(deps(), { ...good(), ts: "", phone: "1" })).toMatchObject({ status: "error" });
  });

  it("rate limits per ip hash and then globally, with a Persian message, storing nothing over the limit", async () => {
    const results = [];
    const inputs = Array.from({ length: CONTACT_LIMITS.perIp.max + 1 }, () => good());
    for (const input of inputs) results.push(await submitContact(deps(), input));
    expect(results.slice(0, CONTACT_LIMITS.perIp.max).every((r) => r.status === "sent")).toBe(true);
    expect(results.at(-1)).toMatchObject({ status: "error", message: "درخواست‌های زیادی ثبت شده است. چند دقیقه بعد دوباره تلاش کنید." });
    expect(await rowsFor(inputs.at(-1)!.name)).toHaveLength(0);

    // another visitor is not affected by the first one's limit
    const other = good();
    expect(await submitContact(deps({ ipHash: "b".repeat(64) }), other)).toEqual({ status: "sent" });

    // the global cap applies even when the address is unknown
    const global = new RateLimiter(CONTACT_LIMITS.global.max, CONTACT_LIMITS.global.windowMs);
    for (let i = 0; i < CONTACT_LIMITS.global.max; i += 1) global.allow("global", NOW);
    const blocked = await submitContact(deps({ ipHash: null, allow: (key) => global.allow(key, NOW) }), good());
    expect(blocked).toMatchObject({ status: "error", message: expect.stringContaining("درخواست‌های زیادی") });
  });

  it("validates on the server: field errors in Persian, the typed values come back, nothing is stored", async () => {
    const input = { ...good(), name: "", phone: "12345", message: "" };
    const r = await submitContact(deps(), input);
    expect(r).toEqual({
      status: "error",
      fieldErrors: { name: "نام خود را بنویسید.", phone: "شماره را با ۰۹ شروع کنید و ۱۱ رقم بنویسید.", message: "درباره‌ی پروژه‌تان چند خط بنویسید." },
      values: { name: "", phone: "12345", message: "" },
    });
    expect(notified).toEqual([]);
  });

  it("stores markup-looking text only as text: the database itself refuses < and > (CHECK), so it is rejected before it", async () => {
    const input = { ...good(), message: "<script>alert(1)</script>" };
    expect(await submitContact(deps(), input)).toMatchObject({ status: "error", fieldErrors: { message: expect.stringContaining("<") } });
    expect(await rowsFor(input.name)).toHaveLength(0);
  });

  it("a database failure becomes a generic message (no internals), logs it, and does not notify", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { insert: () => ({ values: () => Promise.reject(new Error("connection refused")) }) } as unknown as Db;
    const r = await submitContact(deps({ db: broken }), good());
    expect(r).toMatchObject({ status: "error", message: "ثبت درخواست انجام نشد. چند دقیقه بعد دوباره تلاش کنید یا تماس بگیرید." });
    expect(JSON.stringify(r)).not.toContain("connection refused");
    expect(log).toHaveBeenCalled();
    expect(notified).toEqual([]);
    log.mockRestore();
  });
});

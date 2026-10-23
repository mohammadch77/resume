import { drizzle } from "drizzle-orm/node-postgres";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { guard } from "@/lib/admin/outcome";
import { getSettings, saveSettings } from "@/lib/admin/settings";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { SOCIAL_KEYS, settingsFormSchema, type SettingsFormValues } from "@/lib/validation/settings";
import { connect, mkUser } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
let userId: string;
beforeAll(async () => {
  userId = await mkUser(pools.su, "editor");
  await pools.su.query(`DELETE FROM site_settings`); // this file owns the singleton row while it runs; other files recreate their own
});
afterAll(() => pools.close());

const blankSocials = () => Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ""])) as SettingsFormValues["socials"];
const values = (over: Partial<SettingsFormValues> = {}): SettingsFormValues => ({
  brandName: "گرین وب", heroTitle: "سایتی که مشتری می‌آورد", heroSubtitle: "برای کسب‌وکارهای کوچک", primaryCtaLabel: "درخواست مشاوره رایگان",
  contactPhone: "", contactEmail: "", contactAddress: "", socials: blankSocials(), seoTitle: "", seoDescription: "", ...over,
});
const run = <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, userId, null, fn);

describe("site settings", () => {
  it("has no row until the first save, which creates it; a second create is a conflict", async () => {
    expect(await getSettings(db)).toBeNull();
    await run((tx) => saveSettings(tx, undefined, values()));
    expect(await getSettings(db)).toMatchObject({ version: 1, values: { brandName: "گرین وب", contactPhone: "", socials: blankSocials() } });
    expect(await run((tx) => guard(tx, (sp) => saveSettings(sp, undefined, values())))).toEqual({ kind: "conflict" });
  });

  it("stores contact details and only the filled social networks", async () => {
    await run((tx) =>
      saveSettings(tx, 1, values({
        contactPhone: "02112345678", contactEmail: "info@example.com", contactAddress: "تهران",
        socials: { ...blankSocials(), telegram: "https://t.me/grinweb", instagram: "https://instagram.com/grinweb" },
        seoTitle: "عنوان",
      })),
    );
    const got = (await getSettings(db))!;
    expect(got.version).toBe(2);
    expect(got.values).toMatchObject({ contactPhone: "02112345678", contactEmail: "info@example.com", seoTitle: "عنوان" });
    const raw = (await pools.su.query(`SELECT socials FROM site_settings WHERE id = 1`)).rows[0].socials;
    expect(raw).toEqual({ telegram: "https://t.me/grinweb", instagram: "https://instagram.com/grinweb" });
  });

  it("clearing an optional field stores NULL", async () => {
    await run((tx) => saveSettings(tx, 2, values()));
    const row = (await pools.su.query(`SELECT contact_phone, contact_email, seo_title FROM site_settings WHERE id = 1`)).rows[0];
    expect(row).toEqual({ contact_phone: null, contact_email: null, seo_title: null });
  });

  it("reports a stale version as a conflict and writes nothing", async () => {
    await run((tx) => saveSettings(tx, 3, values({ brandName: "نفر اول" })));
    expect(await run((tx) => guard(tx, (sp) => saveSettings(sp, 3, values({ brandName: "نفر دوم" }))))).toEqual({ kind: "conflict" });
    expect((await getSettings(db))!.values.brandName).toBe("نفر اول");
  });

  it("the database refuses a malformed phone or a non-https social link even if validation is bypassed", async () => {
    const phone = await run((tx) => guard(tx, (sp) => saveSettings(sp, 4, { ...values(), contactPhone: "123" })));
    expect(phone.kind).toBe("failed");
    const social = await run((tx) => guard(tx, (sp) => saveSettings(sp, 4, values({ socials: { ...blankSocials(), telegram: "http://t.me/x" } }))));
    expect(social.kind).toBe("failed");
    expect((await getSettings(db))!.version).toBe(4);
  });
});

describe("settings form validation", () => {
  it("accepts a Persian-digit phone and normalises it", () => {
    expect(settingsFormSchema.parse(values({ contactPhone: "۰۲۱۱۲۳۴۵۶۷۸" })).contactPhone).toBe("02112345678");
  });
  it("rejects bad phone, email and social links with Persian messages", () => {
    const r = settingsFormSchema.safeParse(values({ contactPhone: "12", contactEmail: "nope", socials: { ...blankSocials(), github: "http://x" } }));
    expect(r.success).toBe(false);
    const fields = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    expect(fields).toEqual(expect.arrayContaining(["contactPhone", "contactEmail", "socials.github"]));
  });
});

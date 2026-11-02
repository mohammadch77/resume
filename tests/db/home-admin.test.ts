import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addCard,
  addStat,
  checkHeroImages,
  getHomeAdmin,
  listCards,
  listStats,
  removeListRow,
  reorderList,
  saveHome,
  setCardStatus,
  setStatStatus,
  updateCard,
  updateStat,
} from "@/lib/admin/home";
import { guard } from "@/lib/admin/outcome";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { HOME_TEXT_DEFAULTS } from "@/lib/content/home-defaults";
import { HOME_FORM_BLANK, HOME_TEXT_LIMITS, homeFormSchema, type HomeFormValues } from "@/lib/validation/home";
import { CHECK_VIOLATION, connect, mkUser, rejected, sha, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
let userId: string;
const run = <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, userId, null, fn);

beforeAll(async () => {
  userId = await mkUser(pools.su, "editor");
  await pools.su.query("DELETE FROM hero_cards");
  await pools.su.query("DELETE FROM home_stats");
});
afterAll(async () => {
  await pools.su.query("DELETE FROM hero_cards");
  await pools.su.query("DELETE FROM home_stats");
  await pools.su.query("UPDATE home_content SET hero_image_base_id = NULL, hero_image_hover_id = NULL, hero_rating_score = NULL, hero_rating_label = NULL, version = version + 1 WHERE id = 1");
  await pools.close();
});

const snake = (k: string) => k.replace(/[A-Z]/g,(m) => `_${m.toLowerCase()}`);
const values = (over: Partial<HomeFormValues> = {}): HomeFormValues => ({ ...HOME_FORM_BLANK, ...over });
const fill = (n: number) => "ا".repeat(n);

describe("the singleton form", () => {
  it("reads the row migration 0008 made and saves with a version: the new version is returned, a stale one is a conflict and writes nothing", async () => {
    const before = (await getHomeAdmin(db))!;
    expect(before.values).toMatchObject({ ...HOME_TEXT_DEFAULTS, heroImageBaseId: "", heroRatingScore: "", statusLeft: "" });
    const v = await run((tx) => saveHome(tx, before.version, values({ heroEyebrow: "برچسب تازه", statusLeft: "پاسخ‌گو در ساعت کاری" })));
    expect(v).toBe(before.version + 1);
    expect((await getHomeAdmin(db))!.values).toMatchObject({ heroEyebrow: "برچسب تازه", statusLeft: "پاسخ‌گو در ساعت کاری" });
    expect(await run((tx) => guard(tx, (sp) => saveHome(sp, before.version, values({ heroEyebrow: "از نسخه‌ی کهنه" }))))).toEqual({ kind: "conflict" });
    expect((await getHomeAdmin(db))!.values.heroEyebrow).toBe("برچسب تازه");
  });

  it("every save is in the audit log with the actor", async () => {
    const r = await pools.su.query("SELECT actor_id FROM audit_log WHERE table_name = 'home_content' ORDER BY id DESC LIMIT 1");
    expect(r.rows[0].actor_id).toBe(userId);
  });

  it("the Zod limits are the CHECK limits: a text of exactly the maximum passes both, one more fails both", async () => {
    for (const [key, max] of Object.entries(HOME_TEXT_LIMITS)) {
      expect(homeFormSchema.safeParse(values({ [key]: fill(max) })).success, `${key} at ${max}`).toBe(true);
      expect(homeFormSchema.safeParse(values({ [key]: fill(max + 1) })).success, `${key} at ${max + 1}`).toBe(false);
      const column = snake(key);
      const c = await pools.app.connect();
      try {
        await c.query("BEGIN");
        await c.query(`UPDATE home_content SET ${column} = $1, version = version + 1 WHERE id = 1`, [fill(max)]);
        await c.query("ROLLBACK");
      } finally {
        c.release();
      }
      const refused = await rejected(pools.app.query(`UPDATE home_content SET ${column} = $1, version = version + 1 WHERE id = 1`, [fill(max + 1)]));
      expect(refused.code, key).toBe(CHECK_VIOLATION);
    }
  });
});

describe("the hero pictures", () => {
  const pic = async (over: { alt?: string | null; w?: number; h?: number; mime?: string }) => {
    const r = await pools.su.query<{ id: string }>(
      `INSERT INTO media_assets (kind, mime, bytes, width, height, alt_fa, sha256, original_path, uploaded_by) VALUES ('image', $1, 1000, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [over.mime ?? "image/webp", over.w ?? 899, over.h ?? 767, over.alt === undefined ? "تصویر هیرو" : over.alt, sha(), `h/${uid()}.webp`, userId],
    );
    return r.rows[0].id;
  };

  it("the app explains each broken rule before the database does: JPEG, no alt, different size, one picture only", async () => {
    const a = await pic({});
    const b = await pic({});
    expect(await checkHeroImages(db, a, b)).toEqual({});
    expect(await checkHeroImages(db, "", "")).toEqual({});
    expect((await checkHeroImages(db, await pic({ mime: "image/jpeg" }), b)).heroImageBaseId).toContain("PNG");
    expect((await checkHeroImages(db, a, await pic({ alt: null }))).heroImageHoverId).toContain("alt");
    expect((await checkHeroImages(db, a, await pic({ w: 800 }))).heroImageHoverId).toMatch(/هم‌اندازه.*899×767.*800×767/);
    expect(homeFormSchema.safeParse(values({ heroImageBaseId: a })).success).toBe(false);
    expect(homeFormSchema.safeParse(values({ heroImageBaseId: a, heroImageHoverId: a })).success).toBe(false);
  });

  it("the same pair is saved, and GW009 from the trigger (a rule broken behind the app's back) becomes a Persian message on the right field", async () => {
    const a = await pic({});
    const b = await pic({});
    const v = (await getHomeAdmin(db))!.version;
    await run((tx) => saveHome(tx, v, values({ heroImageBaseId: a, heroImageHoverId: b })));
    expect((await getHomeAdmin(db))!.values).toMatchObject({ heroImageBaseId: a, heroImageHoverId: b });

    const odd = await pic({ w: 700 });
    const v2 = (await getHomeAdmin(db))!.version;
    const size = await run((tx) => guard(tx, (sp) => saveHome(sp, v2, values({ heroImageBaseId: a, heroImageHoverId: odd }))));
    expect(size).toMatchObject({ kind: "failed", field: "heroImageHoverId", message: expect.stringContaining("هم‌اندازه") });
    const noAlt = await pic({ alt: "x" });
    await pools.su.query("UPDATE media_assets SET alt_fa = NULL WHERE id = $1", [noAlt]);
    const alt = await run((tx) => guard(tx, (sp) => saveHome(sp, v2, values({ heroImageBaseId: a, heroImageHoverId: noAlt }))));
    expect(alt).toMatchObject({ kind: "failed", field: "heroImageBaseId", message: expect.stringContaining("alt") });
  });

  it("rating: score and label together or neither", async () => {
    expect(homeFormSchema.safeParse(values({ heroRatingScore: "5" })).success).toBe(false);
    expect(homeFormSchema.safeParse(values({ heroRatingLabel: "x" })).success).toBe(false);
    expect(homeFormSchema.safeParse(values({ heroRatingScore: "6", heroRatingLabel: "x" })).success).toBe(false);
    const v = (await getHomeAdmin(db))!.version;
    await run((tx) => saveHome(tx, v, homeFormSchema.parse(values({ heroRatingScore: "۵", heroRatingLabel: "از نظر مشتریان" }))));
    expect((await getHomeAdmin(db))!.values).toMatchObject({ heroRatingScore: "5", heroRatingLabel: "از نظر مشتریان" });
  });
});

describe("the carousel cards (1..5)", () => {
  it("adds as drafts at the end; a sixth is refused in Persian; reorder is one atomic change; delete closes the gap", async () => {
    for (let i = 1; i <= 5; i += 1) await run((tx) => addCard(tx, { caption: `برچسب ${i}`, title: `عنوان ${i}` }));
    const sixth = await run((tx) => guard(tx, (sp) => addCard(sp, { caption: "ششم", title: "ششم" })));
    expect(sixth).toMatchObject({ kind: "blocked", reasons: [expect.stringContaining("حداکثر")] });
    let rows = await listCards(db);
    expect(rows.map((r) => [r.position, r.status])).toEqual([[1, "draft"], [2, "draft"], [3, "draft"], [4, "draft"], [5, "draft"]]);

    const ids = rows.map((r) => r.id);
    const order = [ids[4], ids[0], ids[1], ids[2], ids[3]];
    expect(await run((tx) => reorderList(tx, "card", order))).toEqual({ kind: "ok", value: null });
    expect((await listCards(db)).map((r) => r.id)).toEqual(order);
    expect(await run((tx) => reorderList(tx, "card", order.slice(1)))).toMatchObject({ kind: "failed" }); // the list changed under the editor

    rows = await listCards(db);
    await run((tx) => removeListRow(tx, "card", rows[1].id, rows[1].version));
    expect((await listCards(db)).map((r) => r.position)).toEqual([1, 2, 3, 4]);
    const stale = rows[2];
    expect(await run((tx) => guard(tx, (sp) => removeListRow(sp, "card", stale.id, stale.version)))).toEqual({ kind: "conflict" }); // its version moved when the gap closed
  });

  it("publish, edit with a stale version (conflict), and a «نمونه» text can be a draft but never published (the app says so, the CHECK backs it)", async () => {
    const [first, second] = await listCards(db);
    const published = await run((tx) => setCardStatus(tx, first.id, first.version, "published"));
    expect(published).toBe(first.version + 1);
    expect(await run((tx) => guard(tx, (sp) => updateCard(sp, first.id, first.version, { caption: "قدیمی", title: "قدیمی" })))).toEqual({ kind: "conflict" });
    await run((tx) => updateCard(tx, first.id, published, { caption: "برچسب تازه", title: "عنوان تازه" }));
    expect((await listCards(db))[0]).toMatchObject({ caption: "برچسب تازه", status: "published" });

    const asSample = await run((tx) => guard(tx, (sp) => updateCard(sp, first.id, published + 1, { caption: "نمونه · برچسب", title: "x" })));
    expect(asSample).toMatchObject({ kind: "blocked" });
    await run((tx) => updateCard(tx, second.id, second.version, { caption: "نمونه · برچسب", title: "عنوان" }));
    const cur = (await listCards(db))[1];
    expect(await run((tx) => guard(tx, (sp) => setCardStatus(sp, cur.id, cur.version, "published")))).toMatchObject({ kind: "blocked" });
    // behind the app's back the database refuses too
    const direct = await rejected(pools.app.query("UPDATE hero_cards SET status = 'published', version = version + 1 WHERE id = $1", [cur.id]));
    expect(direct.code).toBe(CHECK_VIOLATION);
  });
});

describe("the stats (1..4)", () => {
  it("up to four, positions follow, a fifth is refused, a «نمونه» label is never published, figures are 0..999999", async () => {
    for (let i = 1; i <= 4; i += 1) await run((tx) => addStat(tx, { value: String(i * 10), suffix: i === 1 ? "+" : "", label: `عنوان ${i}` }));
    expect(await run((tx) => guard(tx, (sp) => addStat(sp, { value: "1", suffix: "", label: "پنجم" })))).toMatchObject({ kind: "blocked" });
    const rows = await listStats(db);
    expect(rows.map((r) => [r.value, r.suffix, r.position])).toEqual([[10, "+", 1], [20, "", 2], [30, "", 3], [40, "", 4]]);

    await run((tx) => updateStat(tx, rows[0].id, rows[0].version, { value: "999999", suffix: "٪", label: "عنوان تازه" }));
    expect((await listStats(db))[0]).toMatchObject({ value: 999999, suffix: "٪", label: "عنوان تازه" });
    const tooBig = await rejected(pools.app.query("UPDATE home_stats SET value = 1000000, version = version + 1 WHERE id = $1", [rows[1].id]));
    expect(tooBig.code).toBe(CHECK_VIOLATION);

    await run((tx) => setStatStatus(tx, rows[1].id, rows[1].version, "published"));
    const draft = (await listStats(db))[2];
    await run((tx) => updateStat(tx, draft.id, draft.version, { value: "30", suffix: "", label: "نمونه · عدد" }));
    const sample = (await listStats(db))[2];
    expect(await run((tx) => guard(tx, (sp) => setStatStatus(sp, sample.id, sample.version, "published")))).toMatchObject({ kind: "blocked" });
  });
});

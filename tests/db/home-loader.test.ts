import { readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { HOME_TEXT_DEFAULTS } from "@/lib/content/home-defaults";
import { loadLandingData } from "@/lib/content/landing";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { connect } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const ROW_SQL = readFileSync(path.resolve(__dirname, "..", "..", "drizzle", "migrations", "0008_home_content_row.sql"), "utf8");

describe("home_content row (migration 0008)", () => {
  it("a freshly migrated database already has the singleton, with the default copy and no pictures", async () => {
    const r = await pools.su.query("SELECT * FROM home_content WHERE id = 1");
    expect(r.rowCount).toBe(1);
    const row = r.rows[0];
    expect(row.hero_line1).toBe(HOME_TEXT_DEFAULTS.heroLine1);
    expect(row.footer_legal).toBe(HOME_TEXT_DEFAULTS.footerLegal);
    // the six columns migration 0009 added keep the copy the page showed before them
    expect(row.clients_eyebrow).toBe(HOME_TEXT_DEFAULTS.clientsEyebrow);
    expect(row.clients_title).toBe(HOME_TEXT_DEFAULTS.clientsTitle);
    expect(row.partners_label).toBe(HOME_TEXT_DEFAULTS.partnersLabel);
    expect(row.contact_title).toBe(HOME_TEXT_DEFAULTS.contactTitle);
    expect(row.contact_lead).toBe(HOME_TEXT_DEFAULTS.contactLead);
    expect(row.contact_note).toBe(HOME_TEXT_DEFAULTS.contactNote);
    expect(row.about_note).toBeNull();
    expect(row.hero_image_base_id).toBeNull();
    expect(row.hero_image_hover_id).toBeNull();
    expect(row.hero_rating_score).toBeNull();
    expect(row.status_left).toBeNull();
  });

  it("running the statement again changes nothing (ON CONFLICT DO NOTHING keeps the owner's edits)", async () => {
    await pools.su.query("UPDATE home_content SET hero_eyebrow = 'ویرایش مالک', version = version + 1 WHERE id = 1");
    await pools.su.query(ROW_SQL.replace(/--[^\n]*\n/g, ""));
    const r = await pools.su.query("SELECT hero_eyebrow FROM home_content WHERE id = 1");
    expect(r.rows[0].hero_eyebrow).toBe("ویرایش مالک");
    await pools.su.query("UPDATE home_content SET hero_eyebrow = $1, version = version + 1 WHERE id = 1", [HOME_TEXT_DEFAULTS.heroEyebrow]);
  });
});

describe("the loader without the row", () => {
  beforeEach(async () => {
    await pools.su.query("DELETE FROM home_content WHERE id = 1");
  });
  afterAll(async () => {
    await pools.su.query(ROW_SQL.replace(/--[^\n]*\n/g, ""));
  });

  it("falls back to the default copy instead of failing (no 500 on a database that lost the row)", async () => {
    const data = await loadLandingData(db);
    expect(data.home.texts).toEqual(HOME_TEXT_DEFAULTS);
    expect(data.home.heroImages).toBeNull();
    expect(data.home.rating).toBeNull();
    expect(data.home.status).toEqual({ left: null, center: null, right: null });
  });

  it("still lists the published hero cards and figures that are real, never a «نمونه» one", async () => {
    await pools.su.query("DELETE FROM hero_cards");
    await pools.su.query("DELETE FROM home_stats");
    const real = await pools.su.query<{ id: string }>("INSERT INTO hero_cards (caption, title, position) VALUES ('طراحی', 'برای فروش.', 1) RETURNING id");
    await pools.su.query("INSERT INTO hero_cards (caption, title, position) VALUES ('نمونه · برند', 'x', 2)");
    await pools.su.query("UPDATE hero_cards SET status = 'published', version = version + 1 WHERE id = $1", [real.rows[0].id]);
    const stat = await pools.su.query<{ id: string }>("INSERT INTO home_stats (value, suffix, label, position) VALUES (12, '+', 'سال تجربه', 1) RETURNING id");
    await pools.su.query("UPDATE home_stats SET status = 'published', version = version + 1 WHERE id = $1", [stat.rows[0].id]);
    await pools.su.query("INSERT INTO home_stats (value, suffix, label, position) VALUES (7, '', 'نمونه · پیش‌نویس', 2)");
    const data = await loadLandingData(db);
    expect(data.home.cards.map((c) => c.caption)).toEqual(["طراحی"]);
    expect(data.home.stats).toEqual([{ id: stat.rows[0].id, value: 12, suffix: "+", label: "سال تجربه" }]);
    await pools.su.query("DELETE FROM hero_cards");
    await pools.su.query("DELETE FROM home_stats");
  });
});

describe("the loader with the row", () => {
  it("reads the owner's texts, rating and status bar", async () => {
    await pools.su.query(ROW_SQL.replace(/--[^\n]*\n/g, ""));
    await pools.su.query(
      "UPDATE home_content SET hero_line2 = 'خط دوم من', hero_rating_score = 4, hero_rating_label = 'مشتری راضی', status_left = 'چپ', version = version + 1 WHERE id = 1",
    );
    const { home } = await loadLandingData(db);
    expect(home.texts.heroLine2).toBe("خط دوم من");
    expect(home.rating).toEqual({ score: 4, label: "مشتری راضی" });
    expect(home.status).toEqual({ left: "چپ", center: null, right: null });
    await pools.su.query(
      "UPDATE home_content SET hero_line2 = $1, hero_rating_score = NULL, hero_rating_label = NULL, status_left = NULL, version = version + 1 WHERE id = 1",
      [HOME_TEXT_DEFAULTS.heroLine2],
    );
  });
});

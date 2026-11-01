import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CHECK_VIOLATION,
  connect,
  E,
  INSUFFICIENT_PRIVILEGE,
  mkUser,
  RESTRICT_VIOLATION,
  rejected,
  sha,
  uid,
  UNIQUE_VIOLATION,
} from "./helpers";

const db = connect();
let userId: string;
afterAll(() => db.close());

const GW009 = "GW009";
const GW006 = "GW006";
const long = (n: number) => "ا".repeat(n);

type Media = { mime?: string; w?: number; h?: number; alt?: string | null; kind?: "image" | "video" };
async function media(m: Media = {}): Promise<string> {
  const { mime = "image/png", w = 899, h = 767, alt = "تصویر نمونه با متن جایگزین", kind = "image" } = m;
  const r = await db.su.query<{ id: string }>(
    `INSERT INTO media_assets (kind, mime, bytes, width, height, alt_fa, sha256, original_path, uploaded_by)
     VALUES ($1, $2, 1000, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [kind, mime, w, h, alt, sha(), `h/${uid()}.png`, userId],
  );
  return r.rows[0].id;
}

const COLUMNS = `id, hero_eyebrow, hero_line1, hero_line2, hero_line3, hero_description, hero_secondary_cta_label, about_eyebrow, about_lead, about_rest,
  work_eyebrow, work_title, services_eyebrow, services_title, stats_eyebrow, stats_title, band_title, band_text, footer_tagline, footer_legal`;
const VALUES = `1, 'مستقل', 'خط یک', 'خط دو', 'خط سه', 'توضیح', 'نمونه‌کارها', 'درباره', 'متن', 'ادامه',
  'نمونه‌کارها', 'منتخب', 'خدمات', 'کارهای ما', 'در یک نگاه', 'آمار', 'تیتر بنر', 'متن بنر', 'شعار', 'حقوق'`;

/** UPDATE home_content SET <set>, version = version + 1 (the optimistic-lock shape every update must have). */
const upd = (pool: typeof db.su | typeof db.app, set: string, params: unknown[] = []) =>
  pool.query(`UPDATE home_content SET ${set}, version = version + 1 WHERE id = 1`, params);

beforeAll(async () => {
  userId = await mkUser(db.su);
  await db.su.query(`INSERT INTO home_content (${COLUMNS}) VALUES (${VALUES}) ON CONFLICT DO NOTHING`);
});

describe("home_content: texts", () => {
  it("happy path: the app role can update it", async () => {
    await upd(db.app, "hero_eyebrow = 'مستقل و جمع‌وجور'");
    const r = await db.su.query("SELECT hero_eyebrow FROM home_content WHERE id = 1");
    expect(r.rows[0].hero_eyebrow).toBe("مستقل و جمع‌وجور");
  });

  it("is a singleton: a row with another id is refused", async () => {
    const e = await rejected(db.su.query(`INSERT INTO home_content (${COLUMNS}) VALUES (${VALUES.replace("1, 'مستقل'", "2, 'مستقل'")})`));
    expect(e.code).toBe(CHECK_VIOLATION);
  });

  const cases: Array<[string, string, number]> = [
    ["hero_eyebrow", "hero_eyebrow", 61],
    ["hero_line1", "hero_line1", 61],
    ["hero_line2", "hero_line2", 61],
    ["hero_line3", "hero_line3", 61],
    ["hero_description", "hero_description", 301],
    ["hero_secondary_cta_label", "hero_secondary_cta_label", 41],
    ["about_lead", "about_lead", 201],
    ["about_rest", "about_rest", 301],
    ["about_note", "about_note", 161],
    ["work_title", "work_title", 81],
    ["services_title", "services_title", 81],
    ["stats_title", "stats_title", 81],
    ["band_title", "band_title", 121],
    ["band_text", "band_text", 301],
    ["footer_tagline", "footer_tagline", 201],
    ["footer_legal", "footer_legal", 121],
  ];
  for (const [name, col, over] of cases) {
    it(`${name} refuses ${over} characters`, async () => {
      expect((await rejected(upd(db.su, `${col} = $1`, [long(over)]))).code).toBe(CHECK_VIOLATION);
    });
  }

  for (const col of ["hero_eyebrow", "hero_line1", "hero_description", "about_lead", "work_title", "band_title", "footer_legal"]) {
    it(`${col} refuses an empty string`, async () => {
      expect((await rejected(upd(db.su, `${col} = ''`))).code).toBe(CHECK_VIOLATION);
    });
  }

  it("a NULL in a required text is refused", async () => {
    expect((await rejected(upd(db.su, "hero_line2 = NULL"))).code).toBe("23502");
  });

  it("the status bar parts are NULL (hidden) or 1..60 characters, never empty", async () => {
    await upd(db.su, "status_left = NULL, status_center = $1, status_right = NULL", ["دورکاری"]);
    expect((await rejected(upd(db.su, "status_left = ''"))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd(db.su, "status_right = $1", [long(61)]))).code).toBe(CHECK_VIOLATION);
    await upd(db.su, "status_center = NULL");
  });
});

describe("home_content: rating", () => {
  it("score and label come together", async () => {
    expect((await rejected(upd(db.su, "hero_rating_score = 5"))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd(db.su, "hero_rating_label = 'برند'"))).code).toBe(CHECK_VIOLATION);
  });
  it("the score is 1..5", async () => {
    expect((await rejected(upd(db.su, "hero_rating_score = 6, hero_rating_label = 'برند'"))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd(db.su, "hero_rating_score = 0, hero_rating_label = 'برند'"))).code).toBe(CHECK_VIOLATION);
    await upd(db.su, "hero_rating_score = 5, hero_rating_label = 'برند'");
    await upd(db.su, "hero_rating_score = NULL, hero_rating_label = NULL");
  });
  it("the label is 1..60 characters", async () => {
    expect((await rejected(upd(db.su, "hero_rating_score = 5, hero_rating_label = $1", [long(61)]))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd(db.su, "hero_rating_score = 5, hero_rating_label = ''"))).code).toBe(CHECK_VIOLATION);
  });
});

describe("home_content: the two hero images", () => {
  it("both or neither", async () => {
    const a = await media();
    expect((await rejected(upd(db.su, "hero_image_base_id = $1", [a]))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd(db.su, "hero_image_hover_id = $1", [a]))).code).toBe(CHECK_VIOLATION);
  });

  it("they must be two different files", async () => {
    const a = await media();
    expect((await rejected(upd(db.su, "hero_image_base_id = $1, hero_image_hover_id = $1", [a]))).code).toBe(CHECK_VIOLATION);
  });

  it("a jpeg (no transparency) is refused", async () => {
    const [a, b] = [await media({ mime: "image/jpeg" }), await media()];
    expect((await rejected(upd(db.su, "hero_image_base_id = $1, hero_image_hover_id = $2", [a, b]))).code).toBe(GW006);
    expect((await rejected(upd(db.su, "hero_image_base_id = $1, hero_image_hover_id = $2", [b, a]))).code).toBe(GW006);
  });

  it("a video is refused", async () => {
    const poster = await media();
    const v = await db.su.query<{ id: string }>(
      `INSERT INTO media_assets (kind, mime, bytes, width, height, alt_fa, sha256, original_path, poster_media_id, uploaded_by)
       VALUES ('video', 'video/mp4', 1000, 899, 767, 'ویدیو', $1, $2, $3, $4) RETURNING id`,
      [sha(), `h/${uid()}.mp4`, poster, userId],
    );
    const b = await media();
    expect((await rejected(upd(db.su, "hero_image_base_id = $1, hero_image_hover_id = $2", [v.rows[0].id, b]))).code).toBe(GW006);
  });

  it("both need alt text", async () => {
    const [noAlt, ok] = [await media({ alt: null }), await media()];
    const blank = await media({ alt: "   " });
    for (const [x, y] of [[noAlt, ok], [ok, noAlt], [blank, ok]]) {
      const e = await rejected(upd(db.su, "hero_image_base_id = $1, hero_image_hover_id = $2", [x, y]));
      expect(e.code).toBe(GW009);
      expect(e.message).toContain("alt");
    }
  });

  it("they must have exactly the same size (the second is revealed through the first)", async () => {
    const [a, b] = [await media({ w: 899, h: 767 }), await media({ w: 899, h: 768 })];
    const e = await rejected(upd(db.su, "hero_image_base_id = $1, hero_image_hover_id = $2", [a, b]));
    expect(e.code).toBe(GW009);
    expect(e.message).toContain("size");
  });

  it("two aligned transparent images are accepted; the alt can not be cleared while they are in use; the files can not be deleted", async () => {
    const [a, b] = [await media({ mime: "image/webp" }), await media({ mime: "image/avif" })];
    await upd(db.app, "hero_image_base_id = $1, hero_image_hover_id = $2", [a, b]);
    expect((await rejected(db.su.query("UPDATE media_assets SET alt_fa = NULL WHERE id = $1", [a]))).code).toBe(GW009);
    expect((await rejected(db.su.query("UPDATE media_assets SET alt_fa = '  ' WHERE id = $1", [b]))).code).toBe(GW009);
    expect((await rejected(db.su.query("DELETE FROM media_assets WHERE id = $1", [a]))).code).toBe(RESTRICT_VIOLATION);
    // an unused image keeps no such restriction, and the images can be taken out again (typography-only hero)
    await upd(db.su, "hero_image_base_id = NULL, hero_image_hover_id = NULL");
    await db.su.query("UPDATE media_assets SET alt_fa = NULL WHERE id = $1", [a]);
  });
});

describe("home_content: versions, audit and the app role's rights", () => {
  it("an update that does not bump the version by one is refused (optimistic lock)", async () => {
    expect((await rejected(db.su.query("UPDATE home_content SET hero_eyebrow = 'x' WHERE id = 1"))).code).toBe(E.version);
    expect((await rejected(db.su.query("UPDATE home_content SET hero_eyebrow = 'x', version = version + 2 WHERE id = 1"))).code).toBe(E.version);
  });

  it("every update is audited", async () => {
    const before = await db.su.query<{ n: string }>("SELECT count(*) n FROM audit_log WHERE table_name = 'home_content'");
    await upd(db.su, "hero_eyebrow = 'مستقل'");
    const after = await db.su.query<{ n: string }>("SELECT count(*) n FROM audit_log WHERE table_name = 'home_content'");
    expect(Number(after.rows[0].n)).toBe(Number(before.rows[0].n) + 1);
  });

  it("app_rw can not INSERT, DELETE or TRUNCATE the singleton", async () => {
    expect((await rejected(db.app.query(`INSERT INTO home_content (${COLUMNS}) VALUES (${VALUES.replace("1, 'مستقل'", "2, 'مستقل'")})`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query("DELETE FROM home_content WHERE id = 1"))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query("TRUNCATE home_content"))).code).toBe(INSUFFICIENT_PRIVILEGE);
  });

  it("app_rw can not TRUNCATE the two lists either", async () => {
    expect((await rejected(db.app.query("TRUNCATE hero_cards"))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query("TRUNCATE home_stats"))).code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("hero_cards", () => {
  const card = (pool: typeof db.su | typeof db.app, position: number, over: Partial<{ caption: string; title: string }> = {}) =>
    pool.query("INSERT INTO hero_cards (caption, title, position) VALUES ($1, $2, $3) RETURNING id", [over.caption ?? "طراحی", over.title ?? "برای فروش ساخته می‌شود.", position]);
  const clear = () => db.su.query("DELETE FROM hero_cards");
  beforeAll(clear);
  afterAll(clear);

  it("happy path as app_rw, and a card can be deleted (positions are unique)", async () => {
    const r = await card(db.app, 1);
    await db.app.query("DELETE FROM hero_cards WHERE id = $1", [r.rows[0].id]);
  });

  it("caption 1..40 and title 1..80 characters", async () => {
    expect((await rejected(card(db.su, 1, { caption: "" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(card(db.su, 1, { caption: long(41) }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(card(db.su, 1, { title: "" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(card(db.su, 1, { title: long(81) }))).code).toBe(CHECK_VIOLATION);
  });

  it("position is 1..5 and unique", async () => {
    expect((await rejected(card(db.su, 0))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(card(db.su, 6))).code).toBe(CHECK_VIOLATION);
    await card(db.su, 2);
    expect((await rejected(card(db.su, 2))).code).toBe(UNIQUE_VIOLATION);
  });

  it("positions can be swapped inside one transaction (deferrable unique)", async () => {
    const [a, b] = [await card(db.su, 3), await card(db.su, 4)];
    const c = await db.su.connect();
    try {
      await c.query("BEGIN");
      await c.query("UPDATE hero_cards SET position = 4, version = version + 1 WHERE id = $1", [a.rows[0].id]);
      await c.query("UPDATE hero_cards SET position = 3, version = version + 1 WHERE id = $1", [b.rows[0].id]);
      await c.query("COMMIT");
    } finally {
      c.release();
    }
    const r = await db.su.query("SELECT position FROM hero_cards WHERE id = $1", [a.rows[0].id]);
    expect(r.rows[0].position).toBe(4);
  });

  it("a «نمونه» card can not be published; a real one can", async () => {
    const s = await card(db.su, 5, { caption: "نمونه · طراحی" });
    expect((await rejected(db.su.query("UPDATE hero_cards SET status = 'published', version = version + 1 WHERE id = $1", [s.rows[0].id]))).code).toBe(CHECK_VIOLATION);
    await db.su.query("UPDATE hero_cards SET caption = 'طراحی', version = version + 1 WHERE id = $1", [s.rows[0].id]);
    await db.su.query("UPDATE hero_cards SET status = 'published', version = version + 1 WHERE id = $1", [s.rows[0].id]);
    // and a published card can not be turned back into a sample in place
    expect((await rejected(db.su.query("UPDATE hero_cards SET title = 'نمونه · متن', version = version + 1 WHERE id = $1", [s.rows[0].id]))).code).toBe(CHECK_VIOLATION);
    // a sample can not be inserted as published either
    expect((await rejected(db.su.query("INSERT INTO hero_cards (caption, title, position, status) VALUES ('نمونه', 'x', 1, 'published')"))).code).toBe(CHECK_VIOLATION);
  });

  it("the status machine: draft -> archived is illegal, published -> archived -> draft is fine", async () => {
    const r = await card(db.su, 1);
    const id = r.rows[0].id;
    const set = (status: string) => db.su.query("UPDATE hero_cards SET status = $2, version = version + 1 WHERE id = $1", [id, status]);
    expect((await rejected(set("archived"))).code).toBe(E.transition);
    await set("published");
    await set("archived");
    await set("draft");
  });

  it("optimistic lock and audit", async () => {
    const r = await card(db.su, 1).catch(() => db.su.query("SELECT id FROM hero_cards WHERE position = 1"));
    const id = r.rows[0].id;
    expect((await rejected(db.su.query("UPDATE hero_cards SET title = 'x' WHERE id = $1", [id]))).code).toBe(E.version);
    const n = await db.su.query("SELECT count(*)::int n FROM audit_log WHERE table_name = 'hero_cards' AND row_id = $1", [id]);
    expect(n.rows[0].n).toBeGreaterThanOrEqual(1);
  });
});

describe("home_stats", () => {
  const stat = (pool: typeof db.su | typeof db.app, position: number, over: Partial<{ value: number; suffix: string; label: string }> = {}) =>
    pool.query("INSERT INTO home_stats (value, suffix, label, position) VALUES ($1, $2, $3, $4) RETURNING id", [over.value ?? 12, over.suffix ?? "+", over.label ?? "سال تجربه", position]);
  const clear = () => db.su.query("DELETE FROM home_stats");
  beforeAll(clear);
  afterAll(clear);

  it("happy path as app_rw, and a figure can be deleted", async () => {
    const r = await stat(db.app, 1);
    await db.app.query("DELETE FROM home_stats WHERE id = $1", [r.rows[0].id]);
  });

  it("value 0..999999", async () => {
    expect((await rejected(stat(db.su, 1, { value: -1 }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(stat(db.su, 1, { value: 1000000 }))).code).toBe(CHECK_VIOLATION);
    await db.su.query("DELETE FROM home_stats WHERE value IN (0, 999999)");
    await stat(db.su, 1, { value: 0 });
    await stat(db.su, 2, { value: 999999 });
  });

  it("suffix is at most 4 characters, the label 1..60", async () => {
    expect((await rejected(stat(db.su, 3, { suffix: "12345" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(stat(db.su, 3, { label: "" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(stat(db.su, 3, { label: long(61) }))).code).toBe(CHECK_VIOLATION);
  });

  it("position is 1..4 and unique", async () => {
    expect((await rejected(stat(db.su, 0))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(stat(db.su, 5))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(stat(db.su, 1))).code).toBe(UNIQUE_VIOLATION);
  });

  it("a «نمونه» figure can not be published, as an update or as an insert", async () => {
    const s = await stat(db.su, 3, { label: "نمونه · پروژه‌ی تحویل‌شده" });
    expect((await rejected(db.su.query("UPDATE home_stats SET status = 'published', version = version + 1 WHERE id = $1", [s.rows[0].id]))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(db.su.query("INSERT INTO home_stats (value, label, position, status) VALUES (1, 'نمونه', 4, 'published')"))).code).toBe(CHECK_VIOLATION);
    await db.su.query("UPDATE home_stats SET label = 'پروژه‌ی تحویل‌شده', version = version + 1 WHERE id = $1", [s.rows[0].id]);
    await db.su.query("UPDATE home_stats SET status = 'published', version = version + 1 WHERE id = $1", [s.rows[0].id]);
  });

  it("the status machine, optimistic lock and audit", async () => {
    const r = await stat(db.su, 4);
    const id = r.rows[0].id;
    expect((await rejected(db.su.query("UPDATE home_stats SET status = 'archived', version = version + 1 WHERE id = $1", [id]))).code).toBe(E.transition);
    expect((await rejected(db.su.query("UPDATE home_stats SET value = 7 WHERE id = $1", [id]))).code).toBe(E.version);
    const n = await db.su.query("SELECT count(*)::int n FROM audit_log WHERE table_name = 'home_stats' AND row_id = $1", [id]);
    expect(n.rows[0].n).toBe(1);
  });
});

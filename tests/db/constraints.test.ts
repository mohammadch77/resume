import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { VIDEO_MAX_BYTES } from "@/lib/media/config";
import {
  CHECK_VIOLATION,
  FK_VIOLATION,
  RESTRICT_VIOLATION,
  UNIQUE_VIOLATION,
  connect,
  mkClient,
  mkIndustry,
  mkMedia,
  mkProject,
  mkService,
  mkUser,
  rejected,
  sha,
  uid,
} from "./helpers";

const db = connect();
let userId: string;
beforeAll(async () => {
  userId = await mkUser(db.su);
  await db.su.query(
    `INSERT INTO site_settings (id, brand_name, hero_title, hero_subtitle, primary_cta_label)
     VALUES (1, 'Grin Web', 'عنوان', 'زیرعنوان', 'درخواست مشاوره رایگان') ON CONFLICT DO NOTHING`,
  );
});
afterAll(() => db.close());

const longText = (n: number) => "ا".repeat(n);

describe("users", () => {
  const insert = (over: Partial<{ email: string; hash: string; name: string; role: string }> = {}) =>
    db.app.query(
      `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, $3, $4)`,
      [over.email ?? `u${uid()}@example.com`, over.hash ?? "h".repeat(40), over.name ?? "نام", over.role ?? "editor"],
    );

  it("happy path", async () => {
    await insert();
  });
  it("rejects malformed email", async () => {
    expect((await rejected(insert({ email: "not-an-email" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects too-short password hash", async () => {
    expect((await rejected(insert({ hash: "short" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects empty display name", async () => {
    expect((await rejected(insert({ name: "" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a role outside the enum", async () => {
    expect((await rejected(insert({ role: "admin" }))).code).toBe("22P02");
  });
  it("rejects negative failed_logins", async () => {
    const id = await mkUser(db.su);
    expect((await rejected(db.app.query(`UPDATE users SET failed_logins = -1 WHERE id = $1`, [id]))).code).toBe(CHECK_VIOLATION);
  });
  it("email is unique case-insensitively among active users, and reusable after soft delete", async () => {
    const email = `dup${uid()}@example.com`;
    await insert({ email });
    expect((await rejected(insert({ email: email.toUpperCase() }))).code).toBe(UNIQUE_VIOLATION);
    await db.app.query(`UPDATE users SET deleted_at = now() WHERE email = $1`, [email]);
    await insert({ email });
  });
});

describe("sessions", () => {
  const insert = (over: Partial<{ id: string; exp: string; abs: string; ip: string | null }> = {}) =>
    db.app.query(
      `INSERT INTO sessions (id, user_id, expires_at, absolute_expires_at, ip_hash)
       VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5)`,
      [over.id ?? sha(), userId, over.exp ?? "2030-01-01", over.abs ?? "2030-02-01", over.ip ?? null],
    );
  it("happy path", async () => {
    await insert();
  });
  it("rejects an id that is not a sha256 hex digest", async () => {
    expect((await rejected(insert({ id: "plain-token" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects sliding expiry beyond the absolute expiry", async () => {
    expect((await rejected(insert({ exp: "2031-01-01", abs: "2030-01-01" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a raw (non-hashed) ip", async () => {
    expect((await rejected(insert({ ip: "203.0.113.7" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects an unknown user (FK)", async () => {
    expect(
      (
        await rejected(
          db.app.query(
            `INSERT INTO sessions (id, user_id, expires_at, absolute_expires_at) VALUES ($1, gen_random_uuid(), now(), now())`,
            [sha()],
          ),
        )
      ).code,
    ).toBe(FK_VIOLATION);
  });
  it("is removed when its user is hard-deleted (CASCADE)", async () => {
    const u = await mkUser(db.su);
    const id = sha();
    await db.su.query(`INSERT INTO sessions (id, user_id, expires_at, absolute_expires_at) VALUES ($1, $2, now(), now())`, [id, u]);
    await db.su.query(`DELETE FROM users WHERE id = $1`, [u]);
    expect((await db.su.query(`SELECT 1 FROM sessions WHERE id = $1`, [id])).rowCount).toBe(0);
  });
});

describe("media_assets", () => {
  type M = Partial<{ kind: string; mime: string; bytes: number; width: number | null; height: number | null; color: string | null; sha: string; path: string; variants: string; poster: string | null }>;
  const insert = (o: M = {}) =>
    db.app.query(
      `INSERT INTO media_assets (kind, mime, bytes, width, height, dominant_color, sha256, original_path, variants, poster_media_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
      [
        o.kind ?? "image",
        o.mime ?? "image/webp",
        o.bytes ?? 1000,
        o.width === undefined ? 10 : o.width,
        o.height === undefined ? 10 : o.height,
        o.color === undefined ? null : o.color,
        o.sha ?? sha(),
        o.path ?? `m/${uid()}.webp`,
        o.variants ?? "{}",
        o.poster === undefined ? null : o.poster,
        userId,
      ],
    );

  it("happy path (image and video)", async () => {
    await insert({ color: "#A1b2C3" });
    await insert({ kind: "video", mime: "video/mp4", bytes: 5000, width: null, height: null, poster: await mkMedia(db.su, userId) });
  });
  it.each([["image/svg+xml"], ["application/x-msdownload"], ["text/html"], ["image/gif"]])("rejects mime %s", async (mime) => {
    expect((await rejected(insert({ mime }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a mime that contradicts the kind", async () => {
    expect((await rejected(insert({ kind: "image", mime: "video/mp4" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects zero bytes and oversize files", async () => {
    expect((await rejected(insert({ bytes: 0 }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ bytes: 15728641 }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ kind: "video", mime: "video/webm", bytes: VIDEO_MAX_BYTES + 1, width: null, height: null, poster: await mkMedia(db.su, userId) }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects an image without dimensions, and non-positive dimensions", async () => {
    expect((await rejected(insert({ width: null, height: null }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ width: 0, height: 10 }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ width: 10, height: null }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a bad dominant color", async () => {
    expect((await rejected(insert({ color: "red" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ color: "#12345" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a duplicate sha256", async () => {
    const h = sha();
    await insert({ sha: h });
    expect((await rejected(insert({ sha: h }))).code).toBe(UNIQUE_VIOLATION);
  });
  it("rejects a non-hex sha256", async () => {
    expect((await rejected(insert({ sha: "abc" }))).code).toBe(CHECK_VIOLATION);
  });
  it.each([["/etc/passwd"], ["a/../../b.webp"], ["a b.webp"]])("rejects unsafe original_path %s", async (path) => {
    expect((await rejected(insert({ path }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects variants that are not a JSON object", async () => {
    expect((await rejected(insert({ variants: "[]" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a poster on an image", async () => {
    const poster = await mkMedia(db.su, userId);
    expect((await rejected(insert({ poster }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects over-long alt text", async () => {
    const id = await mkMedia(db.su, userId);
    expect((await rejected(db.app.query(`UPDATE media_assets SET alt_fa = $2 WHERE id = $1`, [id, longText(301)]))).code).toBe(CHECK_VIOLATION);
  });
});

describe("slugs", () => {
  const bad = ["Bad", "a--b", "a b", "-a", "a-", "آزمون", ""];
  const cases: Array<[string, (slug: string) => Promise<unknown>]> = [
    ["industries", (s) => db.app.query(`INSERT INTO industries (slug, name) VALUES ($1, 'x')`, [s])],
    ["tech_tags", (s) => db.app.query(`INSERT INTO tech_tags (slug, name) VALUES ($1, 'x')`, [s])],
    ["services", (s) => db.app.query(`INSERT INTO services (slug, title, summary, icon_key) VALUES ($1, 'x', 'x', 'globe')`, [s])],
    ["clients", (s) => db.app.query(`INSERT INTO clients (name, slug) VALUES ('x', $1)`, [s])],
  ];
  for (const [table, run] of cases) {
    it(`${table}: rejects malformed slugs, accepts a valid one`, async () => {
      for (const s of bad) expect((await rejected(run(s))).code, `${table} ${s}`).toBe(CHECK_VIOLATION);
      await run(`ok-${uid()}`);
    });
  }
  it("projects: rejects malformed slugs", async () => {
    const ind = await mkIndustry(db.su);
    for (const s of bad)
      expect((await rejected(db.app.query(`INSERT INTO projects (slug, title, industry_id, summary) VALUES ($1, 't', $2, 's')`, [s, ind]))).code).toBe(CHECK_VIOLATION);
  });
  it("active duplicate is rejected; the same slug is allowed again after soft delete", async () => {
    const slug = `dup-${uid()}`;
    const ind = await mkIndustry(db.su);
    const first = await mkProject(db.su, ind, { slug });
    expect((await rejected(mkProject(db.app, ind, { slug }))).code).toBe(UNIQUE_VIOLATION);
    await db.app.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [first]);
    await mkProject(db.app, ind, { slug });
  });
  it("same rule holds for services, industries, clients", async () => {
    const slug = `s-${uid()}`;
    await db.app.query(`INSERT INTO industries (slug, name) VALUES ($1, 'x')`, [slug]);
    expect((await rejected(db.app.query(`INSERT INTO industries (slug, name) VALUES ($1, 'y')`, [slug]))).code).toBe(UNIQUE_VIOLATION);
    await db.app.query(`UPDATE industries SET deleted_at = now() WHERE slug = $1`, [slug]);
    await db.app.query(`INSERT INTO industries (slug, name) VALUES ($1, 'y')`, [slug]);
  });
});

describe("urls, lengths, ordering", () => {
  it("clients.website_url and projects.live_url must be https", async () => {
    const ind = await mkIndustry(db.su);
    expect((await rejected(db.app.query(`INSERT INTO clients (name, slug, website_url) VALUES ('x', $1, 'http://x.ir')`, [`c-${uid()}`]))).code).toBe(CHECK_VIOLATION);
    await db.app.query(`INSERT INTO clients (name, slug, website_url) VALUES ('x', $1, 'https://x.ir')`, [`c-${uid()}`]);
    const p = await mkProject(db.su, ind);
    expect((await rejected(db.app.query(`UPDATE projects SET live_url = 'javascript:alert(1)', version = version + 1 WHERE id = $1`, [p]))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(db.app.query(`UPDATE projects SET live_url = 'http://x.ir', version = version + 1 WHERE id = $1`, [p]))).code).toBe(CHECK_VIOLATION);
  });
  it("project text lengths", async () => {
    const ind = await mkIndustry(db.su);
    const p = await mkProject(db.su, ind);
    const upd = (col: string, val: string, v = 1) =>
      db.app.query(`UPDATE projects SET ${col} = $2, version = version + 1 WHERE id = $1`, [p, val]).then(() => v);
    expect((await rejected(upd("summary", longText(281)))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd("title", longText(121)))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd("seo_title", longText(71)))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd("seo_description", longText(161)))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd("challenge", longText(4001)))).code).toBe(CHECK_VIOLATION);
    await upd("summary", longText(280));
  });
  it("testimonial quote length", async () => {
    const c = await mkClient(db.su);
    const ins = (q: string) => db.app.query(`INSERT INTO testimonials (client_id, author_name, quote) VALUES ($1, 'x', $2)`, [c, q]);
    expect((await rejected(ins("کوتاه"))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(ins(longText(601)))).code).toBe(CHECK_VIOLATION);
    await ins(longText(50));
  });
  it("project_media / project_metrics positions: unique at commit, swappable inside one transaction", async () => {
    const ind = await mkIndustry(db.su);
    const p = await mkProject(db.su, ind);
    const m1 = await mkMedia(db.su, userId);
    const m2 = await mkMedia(db.su, userId);
    await db.app.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 0), ($1, $3, 1)`, [p, m1, m2]);
    expect(
      (await rejected(db.app.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 0)`, [p, await mkMedia(db.su, userId)]))).code,
    ).toBe(UNIQUE_VIOLATION);

    const c = await db.app.connect();
    try {
      await c.query("BEGIN");
      await c.query(`UPDATE project_media SET position = 1 WHERE project_id = $1 AND media_id = $2`, [p, m1]);
      await c.query(`UPDATE project_media SET position = 0 WHERE project_id = $1 AND media_id = $2`, [p, m2]);
      await c.query("COMMIT");
    } finally {
      c.release();
    }
    const order = await db.su.query<{ media_id: string }>(`SELECT media_id FROM project_media WHERE project_id = $1 ORDER BY position`, [p]);
    expect(order.rows.map((r) => r.media_id)).toEqual([m2, m1]);

    await db.app.query(`INSERT INTO project_metrics (project_id, label, value_text, position) VALUES ($1, 'a', '1', 0)`, [p]);
    expect(
      (await rejected(db.app.query(`INSERT INTO project_metrics (project_id, label, value_text, position) VALUES ($1, 'b', '2', 0)`, [p]))).code,
    ).toBe(UNIQUE_VIOLATION);
  });
  it("the same media cannot be attached twice to a project", async () => {
    const ind = await mkIndustry(db.su);
    const p = await mkProject(db.su, ind);
    const m = await mkMedia(db.su, userId);
    await db.app.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 0)`, [p, m]);
    expect((await rejected(db.app.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 1)`, [p, m]))).code).toBe(UNIQUE_VIOLATION);
  });
  it("metric label/value lengths", async () => {
    const ind = await mkIndustry(db.su);
    const p = await mkProject(db.su, ind);
    const ins = (l: string, v: string, pos: number) =>
      db.app.query(`INSERT INTO project_metrics (project_id, label, value_text, position) VALUES ($1, $2, $3, $4)`, [p, l, v, pos]);
    expect((await rejected(ins("", "1", 0))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(ins("x", longText(41), 1))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(ins("x", "1", -1))).code).toBe(CHECK_VIOLATION);
  });
});

describe("leads", () => {
  const insert = (o: Partial<{ phone: string | null; email: string | null; consent: boolean; message: string; name: string; ip: string | null }> = {}) =>
    db.app.query(
      `INSERT INTO leads (name, phone, email, message, consent, ip_hash) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        o.name ?? "علی",
        o.phone === undefined ? "09123456789" : o.phone,
        o.email === undefined ? null : o.email,
        o.message ?? "سلام، مشاوره می‌خواهم",
        o.consent ?? true,
        o.ip === undefined ? null : o.ip,
      ],
    );
  it("happy path with phone only, email only", async () => {
    await insert();
    await insert({ phone: null, email: "a@b.ir" });
  });
  it("requires phone or email", async () => {
    expect((await rejected(insert({ phone: null, email: null }))).code).toBe(CHECK_VIOLATION);
  });
  it.each([["9123456789"], ["0912345678"], ["+989123456789"], ["۰۹۱۲۳۴۵۶۷۸۹"], ["09123456789 "]])("rejects phone %s", async (phone) => {
    expect((await rejected(insert({ phone }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a malformed email", async () => {
    expect((await rejected(insert({ phone: null, email: "nope" }))).code).toBe(CHECK_VIOLATION);
  });
  it("requires consent = true", async () => {
    expect((await rejected(insert({ consent: false }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects markup in stored text", async () => {
    expect((await rejected(insert({ message: "<script>alert(1)</script>" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ name: "<b>x</b>" }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects empty and over-long message", async () => {
    expect((await rejected(insert({ message: "" }))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(insert({ message: longText(2001) }))).code).toBe(CHECK_VIOLATION);
  });
  it("rejects a raw IP in ip_hash", async () => {
    expect((await rejected(insert({ ip: "203.0.113.7" }))).code).toBe(CHECK_VIOLATION);
    await insert({ ip: sha() });
  });
});

describe("site_settings", () => {
  const upd = (socials: string) =>
    db.app.query(`UPDATE site_settings SET socials = $1::jsonb, version = version + 1 WHERE id = 1`, [socials]);
  it("is a singleton: id other than 1 and a second id=1 row are rejected", async () => {
    const ins = (id: number) =>
      db.app.query(
        `INSERT INTO site_settings (id, brand_name, hero_title, hero_subtitle, primary_cta_label) VALUES ($1, 'a', 'b', 'c', 'd')`,
        [id],
      );
    expect((await rejected(ins(2))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(ins(1))).code).toBe(UNIQUE_VIOLATION);
  });
  it("socials: only known keys with https string values", async () => {
    await upd('{"telegram":"https://t.me/x","instagram":"https://instagram.com/x"}');
    expect((await rejected(upd('{"myspace":"https://x.com"}'))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd('{"telegram":"http://t.me/x"}'))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd('{"telegram":42}'))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(upd('["https://x.com"]'))).code).toBe(CHECK_VIOLATION);
    await upd("{}");
  });
  it("contact phone / lengths", async () => {
    const u = (col: string, val: string) => db.app.query(`UPDATE site_settings SET ${col} = $1, version = version + 1 WHERE id = 1`, [val]);
    expect((await rejected(u("contact_phone", "abc"))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(u("brand_name", ""))).code).toBe(CHECK_VIOLATION);
    expect((await rejected(u("primary_cta_label", longText(41)))).code).toBe(CHECK_VIOLATION);
    await u("contact_phone", "02112345678");
  });
});

describe("foreign keys", () => {
  it("RESTRICT: referenced rows cannot be deleted", async () => {
    const ind = await mkIndustry(db.su);
    const media = await mkMedia(db.su, userId);
    const p = await mkProject(db.su, ind);
    await db.su.query(`UPDATE projects SET cover_media_id = $2, version = version + 1 WHERE id = $1`, [p, media]);
    expect((await rejected(db.su.query(`DELETE FROM industries WHERE id = $1`, [ind]))).code).toBe(RESTRICT_VIOLATION);
    expect((await rejected(db.su.query(`DELETE FROM media_assets WHERE id = $1`, [media]))).code).toBe(RESTRICT_VIOLATION);
    expect((await rejected(db.su.query(`DELETE FROM users WHERE id = $1`, [userId]))).code).toBe(RESTRICT_VIOLATION);
    const client = await mkClient(db.su);
    await db.su.query(`UPDATE projects SET client_id = $2, version = version + 1 WHERE id = $1`, [p, client]);
    expect((await rejected(db.su.query(`DELETE FROM clients WHERE id = $1`, [client]))).code).toBe(RESTRICT_VIOLATION);
    const svc = await mkService(db.su);
    expect((await rejected(db.app.query(`INSERT INTO project_services VALUES (gen_random_uuid(), $1)`, [svc]))).code).toBe(FK_VIOLATION);
  });
  it("an unreferenced media asset can be deleted by app_rw (safe delete)", async () => {
    const media = await mkMedia(db.su, userId);
    await db.app.query(`DELETE FROM media_assets WHERE id = $1`, [media]);
  });
});

describe("schema-wide invariants", () => {
  it("only the documented columns are nullable", async () => {
    const r = await db.su.query<{ c: string }>(
      `SELECT table_name || '.' || column_name AS c FROM information_schema.columns
       WHERE table_schema = 'public' AND is_nullable = 'YES' AND table_name <> 'schema_migrations' ORDER BY 1`,
    );
    expect(r.rows.map((x) => x.c)).toEqual(
      [
        "audit_log.actor_id", "audit_log.after_data", "audit_log.before_data", "audit_log.request_id",
        "clients.deleted_at", "clients.industry_id", "clients.logo_media_id", "clients.website_url",
        "industries.deleted_at",
        "leads.budget_range", "leads.company", "leads.email", "leads.handled_by", "leads.internal_notes", "leads.ip_hash", "leads.phone",
        "media_assets.alt_fa", "media_assets.dominant_color", "media_assets.height", "media_assets.poster_media_id", "media_assets.width",
        "project_media.caption",
        "projects.client_id", "projects.completed_on", "projects.cover_media_id", "projects.deleted_at", "projects.live_url",
        "projects.published_at", "projects.seo_description", "projects.seo_title",
        "services.deleted_at",
        "sessions.ip_hash", "sessions.user_agent",
        "site_settings.consult_cta_href", "site_settings.contact_address", "site_settings.contact_email", "site_settings.contact_phone",
        "site_settings.seo_description", "site_settings.seo_title",
        "tech_tags.deleted_at",
        "testimonials.author_role", "testimonials.deleted_at", "testimonials.project_id",
        "users.deleted_at", "users.last_login_at", "users.locked_until",
      ].sort(),
    );
  });
  it("every timestamp column is timestamptz", async () => {
    const r = await db.su.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'`,
    );
    expect(r.rowCount).toBe(0);
  });
  it("every foreign key column is indexed", async () => {
    const r = await db.su.query<{ tbl: string; col: string }>(
      `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
       FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
         AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])`,
    );
    expect(r.rows).toEqual([]);
  });
  it("ON DELETE is RESTRICT except sessions and pure join/child tables, which CASCADE", async () => {
    const r = await db.su.query<{ tbl: string; del: string }>(
      `SELECT DISTINCT c.conrelid::regclass::text AS tbl, c.confdeltype AS del FROM pg_constraint c
       WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace ORDER BY 1`,
    );
    const cascading = r.rows.filter((x) => x.del === "c").map((x) => x.tbl).sort();
    expect(cascading).toEqual(["project_media", "project_metrics", "project_services", "project_tech", "sessions"]);
    expect(r.rows.filter((x) => x.del !== "c" && x.del !== "r")).toEqual([]);
  });
});

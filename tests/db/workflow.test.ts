import { afterAll, describe, expect, it } from "vitest";
import {
  CHECK_VIOLATION,
  E,
  connect,
  mkClient,
  mkIndustry,
  mkMedia,
  mkProject,
  mkPublishableProject,
  mkService,
  mkUser,
  rejected,
} from "./helpers";

const db = connect();
afterAll(() => db.close());

const setStatus = (table: string, id: string, status: string) =>
  db.app.query(`UPDATE ${table} SET status = $2, version = version + 1 WHERE id = $1`, [id, status]);
const statusOf = async (table: string, id: string) =>
  (await db.su.query<{ status: string }>(`SELECT status FROM ${table} WHERE id = $1`, [id])).rows[0].status;

describe("content_status state machine", () => {
  it("allows draft -> published -> archived -> draft -> published -> draft", async () => {
    const { id } = await mkPublishableProject(db.su);
    for (const next of ["published", "archived", "draft", "published", "draft"]) {
      await setStatus("projects", id, next);
      expect(await statusOf("projects", id)).toBe(next);
    }
  });
  it("rejects draft -> archived", async () => {
    const { id } = await mkPublishableProject(db.su);
    expect((await rejected(setStatus("projects", id, "archived"))).code).toBe(E.transition);
  });
  it("rejects archived -> published (must go through draft)", async () => {
    const { id } = await mkPublishableProject(db.su);
    await setStatus("projects", id, "published");
    await setStatus("projects", id, "archived");
    expect((await rejected(setStatus("projects", id, "published"))).code).toBe(E.transition);
  });
  it("applies to services and testimonials too", async () => {
    const svc = await mkService(db.su);
    expect((await rejected(setStatus("services", svc, "archived"))).code).toBe(E.transition);
    await setStatus("services", svc, "published");
    await setStatus("services", svc, "archived");
    expect((await rejected(setStatus("services", svc, "published"))).code).toBe(E.transition);

    const client = await mkClient(db.su);
    const t = (
      await db.su.query<{ id: string }>(
        `INSERT INTO testimonials (client_id, author_name, quote, consent_confirmed) VALUES ($1, 'x', 'یک نقل قول به اندازه‌ی کافی بلند', true) RETURNING id`,
        [client],
      )
    ).rows[0].id;
    expect((await rejected(setStatus("testimonials", t, "archived"))).code).toBe(E.transition);
    await setStatus("testimonials", t, "published");
  });
});

describe("project publish gate", () => {
  it("publishes when everything is present", async () => {
    const { id } = await mkPublishableProject(db.su);
    await setStatus("projects", id, "published");
    expect(await statusOf("projects", id)).toBe("published");
  });

  it("rejects publishing without a cover", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    await db.su.query(`INSERT INTO project_services VALUES ($1, $2)`, [id, await mkService(db.su)]);
    await db.su.query(`UPDATE projects SET published_at = now(), version = version + 1 WHERE id = $1`, [id]);
    const err = await rejected(setStatus("projects", id, "published"));
    expect(err.code).toBe(E.gate);
    expect(err.message).toContain("cover");
  });

  it("rejects publishing when the cover has no alt text", async () => {
    const { id, coverId } = await mkPublishableProject(db.su);
    await db.su.query(`UPDATE media_assets SET alt_fa = NULL WHERE id = $1`, [coverId]);
    const err = await rejected(setStatus("projects", id, "published"));
    expect(err.code).toBe(E.gate);
    expect(err.message).toContain("cover_alt");
  });

  it("rejects publishing without any service", async () => {
    const { id, serviceId } = await mkPublishableProject(db.su);
    await db.su.query(`DELETE FROM project_services WHERE project_id = $1 AND service_id = $2`, [id, serviceId]);
    const err = await rejected(setStatus("projects", id, "published"));
    expect(err.code).toBe(E.gate);
    expect(err.message).toContain("services");
  });

  it("rejects publishing without published_at", async () => {
    const { id } = await mkPublishableProject(db.su);
    await db.su.query(`UPDATE projects SET published_at = NULL, version = version + 1 WHERE id = $1`, [id]);
    const err = await rejected(setStatus("projects", id, "published"));
    expect(err.code).toBe(E.gate);
    expect(err.message).toContain("published_at");
  });

  it("rejects publishing with a summary shorter than 20 characters", async () => {
    const { id } = await mkPublishableProject(db.su);
    await db.su.query(`UPDATE projects SET summary = 'کوتاه', version = version + 1 WHERE id = $1`, [id]);
    const err = await rejected(setStatus("projects", id, "published"));
    expect(err.code).toBe(E.gate);
    expect(err.message).toContain("summary_length");
  });

  it("lists every missing requirement at once", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind, { summary: "کوتاه" });
    const err = await rejected(setStatus("projects", id, "published"));
    expect(err.code).toBe(E.gate);
    for (const code of ["cover", "services", "published_at", "summary_length"]) expect(err.message).toContain(code);
  });

  it("cannot be inserted as published directly", async () => {
    const ind = await mkIndustry(db.su);
    const err = await rejected(
      db.app.query(`INSERT INTO projects (slug, title, industry_id, summary, status) VALUES ('direct-pub-x', 't', $1, 'خلاصه‌ی بلند برای آزمون این قانون', 'published')`, [ind]),
    );
    expect(err.code).toBe(E.gate);
  });

  it("the CHECK constraint still refuses it if the trigger is bypassed", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    const c = await db.su.connect();
    try {
      await c.query("SET session_replication_role = replica");
      const err = await rejected(c.query(`UPDATE projects SET status = 'published', published_at = now(), version = version + 1 WHERE id = $1`, [id]));
      expect(err.code).toBe(CHECK_VIOLATION);
    } finally {
      await c.query("RESET session_replication_role");
      c.release();
    }
  });

  it("a published project cannot lose its last service", async () => {
    const { id, serviceId } = await mkPublishableProject(db.su);
    await setStatus("projects", id, "published");
    const err = await rejected(db.app.query(`DELETE FROM project_services WHERE project_id = $1 AND service_id = $2`, [id, serviceId]));
    expect(err.code).toBe(E.gate);
    const second = await mkService(db.su);
    await db.app.query(`INSERT INTO project_services VALUES ($1, $2)`, [id, second]);
    await db.app.query(`DELETE FROM project_services WHERE project_id = $1 AND service_id = $2`, [id, serviceId]);
  });

  it("a published project's cover cannot lose its alt text", async () => {
    const { id, coverId } = await mkPublishableProject(db.su);
    await setStatus("projects", id, "published");
    expect((await rejected(db.app.query(`UPDATE media_assets SET alt_fa = '   ' WHERE id = $1`, [coverId]))).code).toBe(E.gate);
    const unused = await mkMedia(db.su, await mkUser(db.su));
    await db.app.query(`UPDATE media_assets SET alt_fa = NULL WHERE id = $1`, [unused]);
  });

  it("a published project cannot be soft-deleted until it is unpublished", async () => {
    const { id } = await mkPublishableProject(db.su);
    await setStatus("projects", id, "published");
    const del = () => db.app.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [id]);
    expect((await rejected(del())).code).toBe(CHECK_VIOLATION);
    await setStatus("projects", id, "draft");
    await del();
  });
});

describe("testimonial publish gate", () => {
  const mk = async (consent: boolean) => {
    const client = await mkClient(db.su);
    return (
      await db.su.query<{ id: string }>(
        `INSERT INTO testimonials (client_id, author_name, quote, consent_confirmed) VALUES ($1, 'x', 'یک نقل قول به اندازه‌ی کافی بلند', $2) RETURNING id`,
        [client, consent],
      )
    ).rows[0].id;
  };
  it("cannot be published without consent", async () => {
    const id = await mk(false);
    expect((await rejected(setStatus("testimonials", id, "published"))).code).toBe(CHECK_VIOLATION);
  });
  it("can be published with consent, and consent cannot be withdrawn while published", async () => {
    const id = await mk(true);
    await setStatus("testimonials", id, "published");
    const withdraw = db.app.query(`UPDATE testimonials SET consent_confirmed = false, version = version + 1 WHERE id = $1`, [id]);
    expect((await rejected(withdraw)).code).toBe(CHECK_VIOLATION);
  });
  it("cannot be inserted already published without consent", async () => {
    const client = await mkClient(db.su);
    const ins = db.app.query(
      `INSERT INTO testimonials (client_id, author_name, quote, status) VALUES ($1, 'x', 'یک نقل قول به اندازه‌ی کافی بلند', 'published')`,
      [client],
    );
    expect((await rejected(ins)).code).toBe(CHECK_VIOLATION);
  });
});

describe("optimistic locking (version)", () => {
  it("an update with the expected version succeeds and bumps it", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    const r = await db.app.query(`UPDATE projects SET title = 'جدید', version = version + 1 WHERE id = $1 AND version = 1`, [id]);
    expect(r.rowCount).toBe(1);
    expect((await db.su.query(`SELECT version FROM projects WHERE id = $1`, [id])).rows[0].version).toBe(2);
  });
  it("a stale writer updates 0 rows (conflict) and the first write survives", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    const a = await db.app.query(`UPDATE projects SET title = 'A', version = version + 1 WHERE id = $1 AND version = 1`, [id]);
    const b = await db.app.query(`UPDATE projects SET title = 'B', version = version + 1 WHERE id = $1 AND version = 1`, [id]);
    expect([a.rowCount, b.rowCount]).toEqual([1, 0]);
    expect((await db.su.query(`SELECT title FROM projects WHERE id = $1`, [id])).rows[0].title).toBe("A");
  });
  it("an update that does not bump version is rejected by the trigger", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    expect((await rejected(db.app.query(`UPDATE projects SET title = 'x' WHERE id = $1`, [id]))).code).toBe(E.version);
  });
  it("an update that skips versions or rewinds is rejected", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    expect((await rejected(db.app.query(`UPDATE projects SET version = 5 WHERE id = $1`, [id]))).code).toBe(E.version);
    expect((await rejected(db.app.query(`UPDATE projects SET version = 1 WHERE id = $1`, [id]))).code).toBe(E.version);
  });
  it("applies to services, testimonials and site_settings", async () => {
    const svc = await mkService(db.su);
    expect((await rejected(db.app.query(`UPDATE services SET title = 'x' WHERE id = $1`, [svc]))).code).toBe(E.version);
    const client = await mkClient(db.su);
    const t = (
      await db.su.query<{ id: string }>(`INSERT INTO testimonials (client_id, author_name, quote) VALUES ($1, 'x', 'یک نقل قول به اندازه‌ی کافی بلند') RETURNING id`, [client])
    ).rows[0].id;
    expect((await rejected(db.app.query(`UPDATE testimonials SET author_name = 'y' WHERE id = $1`, [t]))).code).toBe(E.version);
    await db.su.query(
      `INSERT INTO site_settings (id, brand_name, hero_title, hero_subtitle, primary_cta_label) VALUES (1, 'a', 'b', 'c', 'd') ON CONFLICT DO NOTHING`,
    );
    expect((await rejected(db.app.query(`UPDATE site_settings SET brand_name = 'x' WHERE id = 1`))).code).toBe(E.version);
  });
  it("updated_at is maintained by trigger", async () => {
    const ind = await mkIndustry(db.su);
    const id = await mkProject(db.su, ind);
    const before = (await db.su.query<{ u: Date }>(`SELECT updated_at AS u FROM projects WHERE id = $1`, [id])).rows[0].u;
    await new Promise((r) => setTimeout(r, 20));
    await db.app.query(`UPDATE projects SET title = 'z', version = version + 1, updated_at = '2000-01-01' WHERE id = $1`, [id]);
    const after = (await db.su.query<{ u: Date }>(`SELECT updated_at AS u FROM projects WHERE id = $1`, [id])).rows[0].u;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });
});

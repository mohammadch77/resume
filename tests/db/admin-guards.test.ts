import { afterAll, describe, expect, it } from "vitest";
import { E, connect, mkClient, mkIndustry, mkProject, mkService, uid } from "./helpers";

const db = connect();
afterAll(() => db.close());

const BUMPED = new Set(["services", "projects", "testimonials"]); // tables with the optimistic-lock version trigger

const softDelete = (table: string, id: string) =>
  db.su.query(`UPDATE ${table} SET deleted_at = now()${BUMPED.has(table) ? ", version = version + 1" : ""} WHERE id = $1`, [id]);

async function mkTag(): Promise<string> {
  const r = await db.su.query<{ id: string }>(`INSERT INTO tech_tags (slug, name) VALUES ($1, 'برچسب') RETURNING id`, [`tag-${uid()}`]);
  return r.rows[0].id;
}
async function mkTestimonial(clientId: string, projectId: string | null): Promise<string> {
  const r = await db.su.query<{ id: string }>(
    `INSERT INTO testimonials (client_id, project_id, author_name, quote) VALUES ($1, $2, 'نویسنده', 'متن یک نظر با طول کافی') RETURNING id`,
    [clientId, projectId],
  );
  return r.rows[0].id;
}
async function expectRefused(table: string, id: string) {
  await expect(softDelete(table, id)).rejects.toMatchObject({ code: E.inUse });
  const row = await db.su.query(`SELECT deleted_at FROM ${table} WHERE id = $1`, [id]);
  expect(row.rows[0].deleted_at).toBeNull();
}

describe("0005: soft delete of a record that live rows still use is refused (GW008)", () => {
  it("industries: a live project, then a live client, keeps the industry", async () => {
    const industry = await mkIndustry(db.su);
    const project = await mkProject(db.su, industry);
    await expectRefused("industries", industry);
    await softDelete("projects", project);

    const client = await mkClient(db.su);
    await db.su.query(`UPDATE clients SET industry_id = $1 WHERE id = $2`, [industry, client]);
    await expectRefused("industries", industry);
    await softDelete("clients", client);

    await softDelete("industries", industry); // nothing live points at it any more
  });

  it("tech_tags: a live project using the tag keeps it", async () => {
    const tag = await mkTag();
    const project = await mkProject(db.su, await mkIndustry(db.su));
    await db.su.query(`INSERT INTO project_tech (project_id, tech_tag_id) VALUES ($1, $2)`, [project, tag]);
    await expectRefused("tech_tags", tag);
    await softDelete("projects", project);
    await softDelete("tech_tags", tag);
  });

  it("services: a live project listing the service keeps it", async () => {
    const service = await mkService(db.su);
    const project = await mkProject(db.su, await mkIndustry(db.su));
    await db.su.query(`INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)`, [project, service]);
    await expectRefused("services", service);
    await softDelete("projects", project);
    await softDelete("services", service);
  });

  it("clients: a live project, then a live testimonial, keeps the client", async () => {
    const client = await mkClient(db.su);
    const project = await mkProject(db.su, await mkIndustry(db.su));
    await db.su.query(`UPDATE projects SET client_id = $1, version = version + 1 WHERE id = $2`, [client, project]);
    await expectRefused("clients", client);
    await softDelete("projects", project);

    const testimonial = await mkTestimonial(client, null);
    await expectRefused("clients", client);
    await softDelete("testimonials", testimonial);
    await softDelete("clients", client);
  });

  it("projects: a live testimonial about the project keeps it", async () => {
    const project = await mkProject(db.su, await mkIndustry(db.su));
    const testimonial = await mkTestimonial(await mkClient(db.su), project);
    await expectRefused("projects", project);
    await softDelete("testimonials", testimonial);
    await softDelete("projects", project);
  });

  it("a row nothing uses can still be soft-deleted, and restoring is not blocked", async () => {
    const industry = await mkIndustry(db.su);
    await softDelete("industries", industry);
    await db.su.query(`UPDATE industries SET deleted_at = NULL WHERE id = $1`, [industry]);
  });
});

describe("0005: at least one active owner always remains (GW007)", () => {
  /** Runs `fn` in a transaction that is always rolled back, so other test files never see the changes. */
  async function inRolledBackTx(fn: (q: (sql: string, params?: unknown[]) => Promise<unknown>) => Promise<void>) {
    const client = await db.su.connect();
    try {
      await client.query("BEGIN");
      await fn((sql, params) => client.query(sql, params));
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  }

  async function onlyOwner(q: (sql: string, params?: unknown[]) => Promise<unknown>): Promise<string> {
    const r = (await q(
      `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, 'مالک', 'owner') RETURNING id`,
      [`o${uid()}@example.com`, "x".repeat(40)],
    )) as { rows: Array<{ id: string }> };
    const id = r.rows[0].id;
    await q(`UPDATE users SET is_active = false WHERE role = 'owner' AND id <> $1`, [id]);
    return id;
  }

  const attempts: Array<[string, string]> = [
    ["deactivating", `UPDATE users SET is_active = false WHERE id = $1`],
    ["demoting to editor", `UPDATE users SET role = 'editor' WHERE id = $1`],
    ["soft-deleting", `UPDATE users SET deleted_at = now() WHERE id = $1`],
    ["deleting the row", `DELETE FROM users WHERE id = $1`],
  ];

  for (const [name, sql] of attempts) {
    it(`refuses ${name} the only active owner`, async () => {
      await inRolledBackTx(async (q) => {
        const id = await onlyOwner(q);
        await q("SAVEPOINT attempt");
        await expect(q(sql, [id])).rejects.toMatchObject({ code: E.lastOwner });
        await q("ROLLBACK TO SAVEPOINT attempt");
      });
    });
  }

  it("allows removing an owner while another active owner exists, and never blocks editors", async () => {
    await inRolledBackTx(async (q) => {
      const first = await onlyOwner(q);
      const second = ((await q(
        `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, 'مالک دوم', 'owner') RETURNING id`,
        [`o${uid()}@example.com`, "x".repeat(40)],
      )) as { rows: Array<{ id: string }> }).rows[0].id;
      await q(`UPDATE users SET role = 'editor' WHERE id = $1`, [first]); // another owner remains
      const editor = ((await q(
        `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, 'ویراستار', 'editor') RETURNING id`,
        [`e${uid()}@example.com`, "x".repeat(40)],
      )) as { rows: Array<{ id: string }> }).rows[0].id;
      await q(`UPDATE users SET is_active = false WHERE id = $1`, [editor]);
      await q("SAVEPOINT last");
      await expect(q(`UPDATE users SET is_active = false WHERE id = $1`, [second])).rejects.toMatchObject({ code: E.lastOwner });
      await q("ROLLBACK TO SAVEPOINT last");
    });
  });
});

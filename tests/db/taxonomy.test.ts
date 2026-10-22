import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { createTaxonomy, deleteTaxonomy, listTaxonomy, updateTaxonomy } from "@/lib/admin/taxonomy";
import { guard } from "@/lib/admin/outcome";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { connect, mkClient, mkProject, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const actor = () => mkUser(pools.su, "editor");

describe("categories (industries and technologies)", () => {
  it("creates, lists, renames and soft-deletes an unused industry", async () => {
    const userId = await actor();
    const slug = `ind-${uid()}`;
    const id = await withActor(db, userId, null, (tx) => createTaxonomy(tx, "industry", { name: "فروشگاه", slug }));
    expect((await listTaxonomy(db, "industry")).find((r) => r.id === id)).toMatchObject({ slug, name: "فروشگاه", usage: 0 });

    expect(await withActor(db, userId, null, (tx) => updateTaxonomy(tx, "industry", id, { name: "فروشگاه اینترنتی", slug }))).toBe(true);
    expect((await listTaxonomy(db, "industry")).find((r) => r.id === id)?.name).toBe("فروشگاه اینترنتی");

    expect(await withActor(db, userId, null, (tx) => deleteTaxonomy(tx, "industry", id))).toEqual({ ok: true });
    expect((await listTaxonomy(db, "industry")).some((r) => r.id === id)).toBe(false);
    // The slug is free again (partial unique index).
    await withActor(db, userId, null, (tx) => createTaxonomy(tx, "industry", { name: "دوباره", slug }));
  });

  it("refuses to delete an industry that a live project or client uses, and allows it once they are deleted", async () => {
    const userId = await actor();
    const id = await withActor(db, userId, null, (tx) => createTaxonomy(tx, "industry", { name: "درحال‌استفاده", slug: `ind-${uid()}` }));
    const projectId = await mkProject(pools.su, id);
    const clientId = await mkClient(pools.su);
    await pools.su.query(`UPDATE clients SET industry_id = $1 WHERE id = $2`, [id, clientId]);

    expect(await withActor(db, userId, null, (tx) => deleteTaxonomy(tx, "industry", id))).toEqual({ ok: false, reason: "in_use", usage: 2 });
    expect((await listTaxonomy(db, "industry")).find((r) => r.id === id)?.usage).toBe(2);

    await pools.su.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [projectId]);
    await pools.su.query(`UPDATE clients SET deleted_at = now() WHERE id = $1`, [clientId]);
    expect(await withActor(db, userId, null, (tx) => deleteTaxonomy(tx, "industry", id))).toEqual({ ok: true });
  });

  it("counts and protects a technology used by a live project", async () => {
    const userId = await actor();
    const tagId = await withActor(db, userId, null, (tx) => createTaxonomy(tx, "tech", { name: "نکست", slug: `tag-${uid()}` }));
    const industryId = (await pools.su.query<{ id: string }>(`SELECT id FROM industries LIMIT 1`)).rows[0]?.id;
    const projectId = await mkProject(pools.su, industryId ?? (await withActor(db, userId, null, (tx) => createTaxonomy(tx, "industry", { name: "ص", slug: `ind-${uid()}` }))));
    await pools.su.query(`INSERT INTO project_tech (project_id, tech_tag_id) VALUES ($1, $2)`, [projectId, tagId]);

    expect(await withActor(db, userId, null, (tx) => deleteTaxonomy(tx, "tech", tagId))).toEqual({ ok: false, reason: "in_use", usage: 1 });
    await pools.su.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [projectId]);
    expect(await withActor(db, userId, null, (tx) => deleteTaxonomy(tx, "tech", tagId))).toEqual({ ok: true });
  });

  it("reports a duplicate slug as a field error instead of crashing, and rolls back only the failed statement", async () => {
    const userId = await actor();
    const slug = `tag-${uid()}`;
    await withActor(db, userId, null, (tx) => createTaxonomy(tx, "tech", { name: "اول", slug }));
    const outcome = await withActor(db, userId, null, async (tx) => {
      const r = await guard(tx, (sp) => createTaxonomy(sp, "tech", { name: "دوم", slug }));
      await createTaxonomy(tx, "tech", { name: "سوم", slug: `tag-${uid()}` }); // the transaction is still usable
      return r;
    });
    expect(outcome).toEqual({ kind: "failed", message: "این نشانی (slug) قبلاً استفاده شده است.", field: "slug" });
  });

  it("returns not_found for a missing id", async () => {
    const userId = await actor();
    const missing = "00000000-0000-4000-8000-000000000000";
    expect(await withActor(db, userId, null, (tx) => updateTaxonomy(tx, "tech", missing, { name: "x", slug: "x" }))).toBe(false);
    expect(await withActor(db, userId, null, (tx) => deleteTaxonomy(tx, "tech", missing))).toEqual({ ok: false, reason: "not_found" });
  });
});

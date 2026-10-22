import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { guard } from "@/lib/admin/outcome";
import { createService, deleteService, getService, listServices, moveService, setServiceStatus, updateService } from "@/lib/admin/services";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { connect, mkIndustry, mkProject, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const input = (over: Partial<{ title: string; slug: string }> = {}) => ({
  title: "طراحی سایت",
  slug: `svc-${uid()}`,
  summary: "توضیح",
  iconKey: "globe",
  ...over,
});
const run = async <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, await mkUser(pools.su, "editor"), null, fn);

describe("services admin", () => {
  it("creates a draft at the end of the list and updates it with the expected version", async () => {
    const id = await run((tx) => createService(tx, input({ title: "اول" })));
    const created = await getService(db, id);
    expect(created).toMatchObject({ status: "draft", version: 1, title: "اول" });

    await run((tx) => updateService(tx, id, 1, input({ title: "دوم", slug: created!.slug })));
    expect(await getService(db, id)).toMatchObject({ title: "دوم", version: 2 });
  });

  it("reports a stale version as a conflict and writes nothing", async () => {
    const id = await run((tx) => createService(tx, input()));
    await run((tx) => updateService(tx, id, 1, input({ title: "نفر اول" })));
    const outcome = await run((tx) => guard(tx, (sp) => updateService(sp, id, 1, input({ title: "نفر دوم" }))));
    expect(outcome).toEqual({ kind: "conflict" });
    expect((await getService(db, id))?.title).toBe("نفر اول");
  });

  it("walks the status machine and rejects an illegal transition", async () => {
    const id = await run((tx) => createService(tx, input()));
    await run((tx) => setServiceStatus(tx, id, 1, "published"));
    await run((tx) => setServiceStatus(tx, id, 2, "archived"));
    const outcome = await run((tx) => guard(tx, (sp) => setServiceStatus(sp, id, 3, "published")));
    expect(outcome).toEqual({ kind: "failed", message: "این تغییر وضعیت مجاز نیست." });
  });

  it("reports a duplicate slug as a slug field error", async () => {
    const slug = `svc-${uid()}`;
    await run((tx) => createService(tx, input({ slug })));
    const outcome = await run((tx) => guard(tx, (sp) => createService(sp, input({ slug }))));
    expect(outcome).toMatchObject({ kind: "failed", field: "slug" });
  });

  it("moves a service up and down and keeps the order contiguous", async () => {
    const a = await run((tx) => createService(tx, input({ title: "الف" })));
    const b = await run((tx) => createService(tx, input({ title: "ب" })));
    const order = async () => (await listServices(db)).map((s) => s.id).filter((id) => id === a || id === b);

    expect(await order()).toEqual([a, b]);
    expect(await run((tx) => moveService(tx, b, "up"))).toBe(true);
    expect(await order()).toEqual([b, a]);
    const first = (await listServices(db))[0].id;
    expect(await run((tx) => moveService(tx, first, "up"))).toBe(false); // already first overall
    const sortOrders = (await listServices(db)).map((s) => s.sortOrder);
    expect(sortOrders).toEqual(sortOrders.map((_, i) => i));
  });

  it("refuses to delete a published service or one used by a live project; deletes otherwise", async () => {
    const id = await run((tx) => createService(tx, input()));
    await run((tx) => setServiceStatus(tx, id, 1, "published"));
    expect(await run((tx) => deleteService(tx, id, 2))).toEqual({ ok: false, reason: "published" });

    await run((tx) => setServiceStatus(tx, id, 2, "draft"));
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    await pools.su.query(`INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)`, [project, id]);
    expect(await run((tx) => deleteService(tx, id, 3))).toEqual({ ok: false, reason: "in_use", usage: 1 });

    await pools.su.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [project]);
    expect(await run((tx) => deleteService(tx, id, 3))).toEqual({ ok: true });
    expect(await getService(db, id)).toBeNull();
  });
});

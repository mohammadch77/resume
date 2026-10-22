import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { createClient, deleteClient, getClient, listClients, updateClient } from "@/lib/admin/clients";
import { guard } from "@/lib/admin/outcome";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import type { ClientFormValues } from "@/lib/validation/client";
import { connect, mkIndustry, mkMedia, mkProject, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const values = (over: Partial<ClientFormValues> = {}): ClientFormValues => ({
  name: "مشتری آزمایشی",
  slug: `cl-${uid()}`,
  industryId: "",
  logoMediaId: "",
  websiteUrl: "",
  showNamePublicly: false,
  ...over,
});
const run = async <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, await mkUser(pools.su, "editor"), null, fn);

describe("clients admin", () => {
  it("stores blank optional fields as NULL and reads them back", async () => {
    const id = await run((tx) => createClient(tx, values()));
    expect(await getClient(db, id)).toMatchObject({ industryId: null, logoMediaId: null, websiteUrl: null, showNamePublicly: false, usage: 0 });
  });

  it("updates every field, including industry and logo", async () => {
    const industryId = await mkIndustry(pools.su);
    const userId = await mkUser(pools.su, "editor");
    const logo = await mkMedia(pools.su, userId);
    const id = await run((tx) => createClient(tx, values()));
    const ok = await run((tx) =>
      updateClient(tx, id, values({ name: "جدید", slug: `cl-${uid()}`, industryId, logoMediaId: logo, websiteUrl: "https://example.com", showNamePublicly: true })),
    );
    expect(ok).toBe(true);
    expect(await getClient(db, id)).toMatchObject({ name: "جدید", industryId, logoMediaId: logo, websiteUrl: "https://example.com", showNamePublicly: true });
  });

  it("reports a duplicate slug as a slug field error", async () => {
    const slug = `cl-${uid()}`;
    await run((tx) => createClient(tx, values({ slug })));
    expect(await run((tx) => guard(tx, (sp) => createClient(sp, values({ slug }))))).toMatchObject({ kind: "failed", field: "slug" });
  });

  it("refuses a non-https website at the database even if validation is bypassed", async () => {
    const outcome = await run((tx) => guard(tx, (sp) => createClient(sp, values({ websiteUrl: "http://example.com" }))));
    expect(outcome.kind).not.toBe("ok");
  });

  it("refuses to delete a client used by a live project, and deletes once the project is gone", async () => {
    const id = await run((tx) => createClient(tx, values()));
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    await pools.su.query(`UPDATE projects SET client_id = $1, version = version + 1 WHERE id = $2`, [id, project]);
    expect(await run((tx) => deleteClient(tx, id))).toEqual({ ok: false, reason: "in_use", usage: 1 });

    await pools.su.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [project]);
    expect(await run((tx) => deleteClient(tx, id))).toEqual({ ok: true });
    expect((await listClients(db)).some((c) => c.id === id)).toBe(false);
    expect(await run((tx) => deleteClient(tx, id))).toEqual({ ok: false, reason: "not_found" });
  });
});

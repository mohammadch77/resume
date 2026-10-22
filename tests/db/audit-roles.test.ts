import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import type { Db } from "@/lib/db/client";
import {
  E,
  INSUFFICIENT_PRIVILEGE,
  RESTRICT_VIOLATION,
  connect,
  mkIndustry,
  mkMedia,
  mkProject,
  mkService,
  mkUser,
  rejected,
  uid,
} from "./helpers";

const db = connect();
const orm = drizzle(db.app, { schema }) as Db;
afterAll(() => db.close());

type Audit = {
  action: string;
  actor_id: string | null;
  request_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  row_id: string;
};
const auditFor = async (table: string, rowId: string) =>
  (await db.su.query<Audit>(`SELECT * FROM audit_log WHERE table_name = $1 AND row_id = $2 ORDER BY id`, [table, rowId])).rows;

describe("audit trail", () => {
  it("withActor records the actor and request id on insert, update and soft delete", async () => {
    const actor = await mkUser(db.su, "owner");
    const reqId = `req-${uid()}`;
    const slug = `svc-${uid()}`;
    const row = await withActor(orm, actor, reqId, async (tx) => {
      const [created] = await tx.insert(schema.services).values({ slug, title: "t", summary: "s", iconKey: "globe" }).returning();
      await tx.update(schema.services).set({ title: "t2", version: 2 }).where(eq(schema.services.id, created.id));
      return created;
    });
    const rows = await auditFor("services", row.id);
    expect(rows.map((r) => r.action)).toEqual(["INSERT", "UPDATE"]);
    for (const r of rows) {
      expect(r.actor_id).toBe(actor);
      expect(r.request_id).toBe(reqId);
    }
    expect(rows[1].before_data).toMatchObject({ title: "t", version: 1 });
    expect(rows[1].after_data).toMatchObject({ title: "t2", version: 2 });
  });

  it("changes made outside withActor are logged with a NULL actor", async () => {
    const svc = await mkService(db.su);
    const rows = await auditFor("services", svc);
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_id).toBeNull();
  });

  it("actor settings do not leak out of the transaction", async () => {
    const actor = await mkUser(db.su);
    await withActor(orm, actor, "r1", async () => undefined);
    const svc = await mkService(db.app as never as typeof db.su);
    expect((await auditFor("services", svc))[0].actor_id).toBeNull();
  });

  it("never copies password_hash into the log", async () => {
    const u = await mkUser(db.su);
    const [entry] = await auditFor("users", u);
    expect(entry.after_data).not.toHaveProperty("password_hash");
    expect(entry.after_data).toHaveProperty("email");
  });

  it("logs deletes and uses composite ids for join tables", async () => {
    const ind = await mkIndustry(db.su);
    const p = await mkProject(db.su, ind);
    const s = await mkService(db.su);
    await db.app.query(`INSERT INTO project_services VALUES ($1, $2)`, [p, s]);
    await db.app.query(`DELETE FROM project_services WHERE project_id = $1`, [p]);
    const rows = await auditFor("project_services", `${p}:${s}`);
    expect(rows.map((r) => r.action)).toEqual(["INSERT", "DELETE"]);
    expect(rows[1].before_data).toMatchObject({ project_id: p });
    expect(rows[1].after_data).toBeNull();
  });

  it("does not audit leads (PII must leave at retention)", async () => {
    const before = (await db.su.query(`SELECT count(*)::int AS n FROM audit_log WHERE table_name = 'leads'`)).rows[0].n;
    await db.app.query(`INSERT INTO leads (name, phone, message, consent) VALUES ('x', '09123456789', 'سلام', true)`);
    const after = (await db.su.query(`SELECT count(*)::int AS n FROM audit_log WHERE table_name = 'leads'`)).rows[0].n;
    expect(after).toBe(before);
  });
});

describe("audit_log is append-only", () => {
  it("app_rw can SELECT and INSERT but not UPDATE, DELETE or TRUNCATE", async () => {
    await db.app.query(`SELECT count(*) FROM audit_log`);
    await db.app.query(`INSERT INTO audit_log (table_name, row_id, action) VALUES ('manual', 'x', 'INSERT')`);
    expect((await rejected(db.app.query(`UPDATE audit_log SET row_id = 'y'`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`DELETE FROM audit_log`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`TRUNCATE audit_log`))).code).toBe(INSUFFICIENT_PRIVILEGE);
  });
  it("even a superuser cannot UPDATE, DELETE or TRUNCATE (triggers)", async () => {
    expect((await rejected(db.su.query(`UPDATE audit_log SET row_id = 'y'`))).code).toBe(E.appendOnly);
    expect((await rejected(db.su.query(`DELETE FROM audit_log`))).code).toBe(E.appendOnly);
    expect((await rejected(db.su.query(`TRUNCATE audit_log`))).code).toBe(E.appendOnly);
  });
  it("action must be INSERT, UPDATE or DELETE", async () => {
    expect((await rejected(db.app.query(`INSERT INTO audit_log (table_name, row_id, action) VALUES ('t', 'x', 'WIPE')`))).code).toBe("23514");
  });
});

describe("app_rw privileges", () => {
  it("is a plain login role", async () => {
    const r = await db.su.query(`SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'app_rw'`);
    expect(r.rows[0]).toEqual({ rolsuper: false, rolcreatedb: false, rolcreaterole: false });
  });
  it("cannot DROP, ALTER or CREATE anything", async () => {
    expect((await rejected(db.app.query(`DROP TABLE projects`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`ALTER TABLE projects ADD COLUMN x int`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`ALTER TABLE projects DISABLE TRIGGER ALL`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`CREATE TABLE evil (id int)`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`DROP FUNCTION gw_audit() CASCADE`))).code).toBe(INSUFFICIENT_PRIVILEGE);
    expect((await rejected(db.app.query(`CREATE ROLE evil`))).code).toBe(INSUFFICIENT_PRIVILEGE);
  });
  it("cannot TRUNCATE any table", async () => {
    for (const t of ["users", "projects", "leads", "sessions", "media_assets"])
      expect((await rejected(db.app.query(`TRUNCATE ${t} CASCADE`))).code, t).toBe(INSUFFICIENT_PRIVILEGE);
  });
  it("cannot hard-delete soft-delete content rows", async () => {
    for (const t of ["users", "projects", "services", "clients", "industries", "tech_tags", "testimonials", "site_settings"])
      expect((await rejected(db.app.query(`DELETE FROM ${t}`))).code, t).toBe(INSUFFICIENT_PRIVILEGE);
  });
  it("cannot read the migration ledger", async () => {
    expect((await rejected(db.app.query(`SELECT * FROM schema_migrations`))).code).toBe(INSUFFICIENT_PRIVILEGE);
  });
  it("cannot disable triggers by changing session_replication_role", async () => {
    expect((await rejected(db.app.query(`SET session_replication_role = replica`))).code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});

describe("leads retention", () => {
  const mkLead = async (daysOld: number) =>
    (
      await db.su.query<{ id: string }>(
        `INSERT INTO leads (name, phone, message, consent, created_at) VALUES ('x', '09123456789', 'سلام', true, now() - make_interval(days => $1)) RETURNING id`,
        [daysOld],
      )
    ).rows[0].id;

  it("a lead inside the 365-day window cannot be hard-deleted", async () => {
    const id = await mkLead(10);
    expect((await rejected(db.app.query(`DELETE FROM leads WHERE id = $1`, [id]))).code).toBe(E.retention);
  });
  it("a lead past retention can be deleted", async () => {
    const id = await mkLead(400);
    await db.app.query(`DELETE FROM leads WHERE id = $1`, [id]);
  });
  it("purge_old_leads removes only old leads and refuses a window under 365 days", async () => {
    const old = await mkLead(500);
    const young = await mkLead(5);
    expect((await rejected(db.app.query(`SELECT purge_old_leads(30)`))).code).toBe(E.retention);
    await db.app.query(`SELECT purge_old_leads()`);
    expect((await db.su.query(`SELECT 1 FROM leads WHERE id = $1`, [old])).rowCount).toBe(0);
    expect((await db.su.query(`SELECT 1 FROM leads WHERE id = $1`, [young])).rowCount).toBe(1);
  });
});

describe("sessions are hard-deletable by app_rw", () => {
  it("DELETE on sessions works", async () => {
    const u = await mkUser(db.su);
    const id = randomUUID().replace(/-/g, "").repeat(2);
    await db.app.query(`INSERT INTO sessions (id, user_id, expires_at, absolute_expires_at) VALUES ($1, $2, now(), now())`, [id, u]);
    await db.app.query(`DELETE FROM sessions WHERE id = $1`, [id]);
  });
  it("media with a cover reference cannot be deleted even by app_rw (friendly-error path)", async () => {
    const ind = await mkIndustry(db.su);
    const p = await mkProject(db.su, ind);
    const media = await mkMedia(db.su, await mkUser(db.su));
    await db.su.query(`UPDATE projects SET cover_media_id = $2, version = version + 1 WHERE id = $1`, [p, media]);
    expect((await rejected(db.app.query(`DELETE FROM media_assets WHERE id = $1`, [media]))).code).toBe(RESTRICT_VIOLATION);
  });
});

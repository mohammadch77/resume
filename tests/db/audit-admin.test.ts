import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { describeChanges, isAuditAction, isAuditTable, listActors, listAudit, type AuditFilters } from "@/lib/admin/audit";
import { parsePage } from "@/lib/admin/pagination";
import { createService } from "@/lib/admin/services";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { connect, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
const RUN = uid(); // every row this file writes carries this marker in row_id, so other files' rows never interfere
let actor: string;
beforeAll(async () => {
  actor = await mkUser(pools.su, "owner");
});
afterAll(() => pools.close());

const big = parsePage(undefined, 1000);
const find = async (f: AuditFilters) => (await listAudit(db, { rowId: undefined, ...f }, big)).rows.filter((r) => r.rowId.includes(RUN));

/** audit_log is append-only but INSERT is allowed, so tests can plant entries at exact instants. */
async function plant(rowId: string, createdAt: string, over: Partial<{ table: string; action: string; actorId: string | null; before: object | null; after: object | null }> = {}) {
  await pools.su.query(
    `INSERT INTO audit_log (table_name, row_id, action, before_data, after_data, actor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [over.table ?? "services", `${rowId}-${RUN}`, over.action ?? "UPDATE", over.before ? JSON.stringify(over.before) : null, over.after ? JSON.stringify(over.after) : null, over.actorId === undefined ? actor : over.actorId, createdAt],
  );
}

describe("audit listing", () => {
  it("shows the real trail of an admin write, with the actor's name", async () => {
    const id = await withActor(db, actor, "req-1", (tx) => createService(tx, { title: "ممیزی", slug: `svc-${uid()}`, summary: "x", iconKey: "globe" }));
    const { rows } = await listAudit(db, { rowId: id }, big);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tableName: "services", action: "INSERT", actorName: "تست", requestId: "req-1" });
  });

  it("filters by table, action, actor and exact record id", async () => {
    await plant("a1", "2025-01-01T00:00:00Z", { table: "projects", action: "INSERT" });
    await plant("a2", "2025-01-01T00:00:00Z", { table: "clients", action: "UPDATE" });
    await plant("a3", "2025-01-01T00:00:00Z", { table: "clients", action: "DELETE", actorId: null });
    expect((await find({ table: "clients" })).map((r) => r.rowId.split("-")[0]).sort()).toEqual(["a2", "a3"]);
    expect((await find({ action: "INSERT", table: "projects" })).map((r) => r.rowId.split("-")[0])).toEqual(["a1"]);
    expect((await find({ table: "clients", actorId: actor })).map((r) => r.rowId.split("-")[0])).toEqual(["a2"]);
    expect((await listAudit(db, { rowId: `a3-${RUN}` }, big)).rows).toHaveLength(1);
    expect((await listAudit(db, { rowId: `a3-${RUN}` }, big)).rows[0].actorName).toBeNull(); // "سیستم" on the page
    expect((await listActors(db)).some((a) => a.id === actor)).toBe(true);
  });

  it("filters by Shamsi day in Tehran time: both ends inclusive, boundaries exact", async () => {
    // Tehran is UTC+03:30 all year since 2022: 1404/01/01 starts at 2025-03-20T20:30:00Z.
    await plant("d-before", "2025-03-20T20:29:59Z"); // 1403/12/30 23:59:59
    await plant("d-start", "2025-03-20T20:30:00Z"); //   1404/01/01 00:00:00
    await plant("d-end", "2025-03-21T20:29:59Z"); //     1404/01/01 23:59:59
    await plant("d-after", "2025-03-21T20:30:00Z"); //   1404/01/02 00:00:00
    const day = (await find({ from: "1404/01/01", to: "1404/01/01" })).map((r) => r.rowId.split("-").slice(0, 2).join("-"));
    expect(day.sort()).toEqual(["d-end", "d-start"]);
    expect((await find({ from: "۱۴۰۴/۰۱/۰۲" })).map((r) => r.rowId.split("-").slice(0, 2).join("-"))).toContain("d-after"); // Persian digits
    expect((await find({ to: "1403/12/30" })).map((r) => r.rowId.split("-").slice(0, 2).join("-"))).toContain("d-before");
    expect((await find({ to: "1403/12/30" })).map((r) => r.rowId.split("-").slice(0, 2).join("-"))).not.toContain("d-start");
  });

  it("ignores an invalid Shamsi date and says which field is wrong", async () => {
    const result = await listAudit(db, { from: "1404/13/40", to: "soon" }, big);
    expect(result.errors).toEqual({ from: "تاریخ شمسی را به شکل ۱۴۰۴/۰۵/۱۲ بنویسید.", to: "تاریخ شمسی را به شکل ۱۴۰۴/۰۵/۱۲ بنویسید." });
    expect(result.total).toBeGreaterThan(0); // filter dropped, nothing hidden
  });

  it("paginates newest first", async () => {
    for (let i = 0; i < 3; i++) await plant(`p${i}`, "2025-02-01T00:00:00Z", { table: "tech_tags" });
    const first = await listAudit(db, { table: "tech_tags" }, parsePage("1", 2));
    const second = await listAudit(db, { table: "tech_tags" }, parsePage("2", 2));
    expect(first.rows).toHaveLength(2);
    expect(first.rows[0].id).toBeGreaterThan(first.rows[1].id);
    expect(second.rows[0].id).toBeLessThan(first.rows[1].id);
    expect(first.total).toBeGreaterThanOrEqual(3);
  });

  it("whitelists table and action values for the URL", () => {
    expect(isAuditTable("projects")).toBe(true);
    expect(isAuditTable("audit_log; DROP TABLE users")).toBe(false);
    expect(isAuditTable("toString")).toBe(false);
    expect(isAuditAction("DELETE")).toBe(true);
    expect(isAuditAction("TRUNCATE")).toBe(false);
  });
});

describe("describeChanges", () => {
  it("shows only the fields that changed on UPDATE and skips timestamps", () => {
    const changes = describeChanges("UPDATE", { title: "الف", version: 1, updated_at: "t1", slug: "s" }, { title: "ب", version: 2, updated_at: "t2", slug: "s" });
    expect(changes).toEqual([
      { field: "title", before: "الف", after: "ب" },
      { field: "version", before: "1", after: "2" },
    ]);
  });
  it("shows stored values on INSERT and removed values on DELETE", () => {
    expect(describeChanges("INSERT", null, { title: "الف", note: null })).toEqual([
      { field: "title", before: "—", after: "الف" },
      { field: "note", before: "—", after: "—" },
    ]);
    expect(describeChanges("DELETE", { title: "الف" }, null)).toEqual([{ field: "title", before: "الف", after: "—" }]);
  });
  it("cuts very long values", () => {
    const [c] = describeChanges("INSERT", null, { quote: "ب".repeat(500) });
    expect(c.after.length).toBeLessThanOrEqual(161);
    expect(c.after.endsWith("…")).toBe(true);
  });
});

import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CSV_BOM } from "@/lib/admin/csv";
import { getLead, leadsCsv, listLeads, shamsiDate, updateLead } from "@/lib/admin/leads";
import { parsePage } from "@/lib/admin/pagination";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { connect, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
let editor: string;
beforeAll(async () => {
  editor = await mkUser(pools.su, "editor");
});
afterAll(() => pools.close());

async function mkLead(over: Partial<{ name: string; message: string; phone: string; company: string; created: string }> = {}): Promise<string> {
  const r = await pools.su.query<{ id: string }>(
    `INSERT INTO leads (name, phone, message, company, consent, created_at) VALUES ($1, $2, $3, $4, true, COALESCE($5::timestamptz, now())) RETURNING id`,
    [over.name ?? `سارا ${uid()}`, over.phone ?? "09121234567", over.message ?? "می‌خواهم یک فروشگاه اینترنتی بسازم", over.company ?? null, over.created ?? null],
  );
  return r.rows[0].id;
}

describe("leads admin", () => {
  it("lists newest first, filters by status and paginates", async () => {
    const old = await mkLead({ created: "2020-01-01T00:00:00Z" });
    const fresh = await mkLead();
    const all = await listLeads(db, parsePage(undefined, 1000));
    const ids = all.rows.map((r) => r.id);
    expect(ids.indexOf(fresh)).toBeLessThan(ids.indexOf(old));
    expect(all.total).toBe(all.rows.length);

    await withActor(db, editor, null, (tx) => updateLead(tx, old, { status: "spam", internalNotes: "" }, editor));
    const spam = await listLeads(db, parsePage(undefined, 1000), "spam");
    expect(spam.rows.map((r) => r.id)).toContain(old);
    expect(spam.rows.map((r) => r.id)).not.toContain(fresh);

    const first = await listLeads(db, parsePage("1", 1));
    const second = await listLeads(db, parsePage("2", 1));
    expect(first.rows).toHaveLength(1);
    expect(second.rows[0].id).not.toBe(first.rows[0].id);
    expect(first.total).toBe(all.total);
  });

  it("updating records the status, the notes (blank = NULL) and who handled it, and leaves the visitor's words alone", async () => {
    const id = await mkLead({ name: "نام اصلی", message: "پیام اصلی" });
    expect(await withActor(db, editor, null, (tx) => updateLead(tx, id, { status: "contacted", internalNotes: "  تماس گرفتم  " }, editor))).toBe(true);
    let lead = (await getLead(db, id))!;
    expect(lead).toMatchObject({ status: "contacted", internalNotes: "تماس گرفتم", name: "نام اصلی", message: "پیام اصلی" });
    expect(lead.handledByName).toBe("تست");

    await withActor(db, editor, null, (tx) => updateLead(tx, id, { status: "won", internalNotes: "" }, editor));
    lead = (await getLead(db, id))!;
    expect(lead.internalNotes).toBeNull();
    expect(await withActor(db, editor, null, (tx) => updateLead(tx, "00000000-0000-4000-8000-000000000000", { status: "won", internalNotes: "" }, editor))).toBe(false);
  });

  it("the CSV has a BOM, a Shamsi date, and neutralises formulas typed by a visitor", async () => {
    await mkLead({ name: "=HYPERLINK(\"http://evil.example\",\"x\")", message: "@SUM(1+1)\nخط دوم", company: "+98912", created: "2025-03-21T10:00:00Z" });
    const csv = await leadsCsv(db);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""x"")"`);
    expect(csv).toContain(`"'@SUM(1+1)\nخط دوم"`);
    expect(csv).toContain(`"'+98912"`);
    expect(csv).toContain("1404/01/01"); // 2025-03-21 is 1 Farvardin 1404
    // no cell starts with a bare formula character
    const cells = csv.split("\r\n").flatMap((line) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1]));
    expect(cells.filter((c) => /^[=+\-@]/.test(c))).toEqual([]);
  });

  it("formats Shamsi dates in Tehran time with Latin digits", () => {
    expect(shamsiDate(new Date("2025-03-20T21:00:00Z"))).toBe("1404/01/01"); // 00:30 in Tehran on 21 March
    expect(shamsiDate(new Date("2025-03-20T12:00:00Z"))).toBe("1403/12/30");
  });
});

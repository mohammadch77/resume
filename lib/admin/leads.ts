import { count, desc, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { leads, users } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { blankToNull } from "@/lib/validation/common";
import { LEAD_STATUS_LABEL, type LeadStatus, type LeadUpdateValues } from "@/lib/validation/lead";
import { toCsv } from "./csv";
import type { PageInfo } from "./pagination";

export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  message: string;
  budgetRange: string | null;
  source: string;
  status: LeadStatus;
  internalNotes: string | null;
  handledByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const select = (db: Db) =>
  db
    .select({
      id: leads.id,
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      company: leads.company,
      message: leads.message,
      budgetRange: leads.budgetRange,
      source: leads.source,
      status: leads.status,
      internalNotes: leads.internalNotes,
      handledByName: users.displayName,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.handledBy));

/** Newest first, optionally one status, one page. */
export async function listLeads(db: Db, page: PageInfo, status?: LeadStatus): Promise<{ rows: LeadRow[]; total: number }> {
  const where: SQL | undefined = status ? eq(leads.status, status) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    select(db).where(where).orderBy(desc(leads.createdAt), desc(leads.id)).limit(page.pageSize).offset(page.offset),
    db.select({ total: count() }).from(leads).where(where),
  ]);
  return { rows, total };
}

/** The newest leads of any status, for the dashboard. */
export async function recentLeads(db: Db, limit = 5): Promise<LeadRow[]> {
  return select(db).orderBy(desc(leads.createdAt), desc(leads.id)).limit(limit);
}

export async function getLead(db: Db, id: string): Promise<LeadRow | null> {
  const [row] = await select(db).where(eq(leads.id, id));
  return row ?? null;
}

/** Records who handled the lead last. False when the lead does not exist. */
export async function updateLead(tx: Tx, id: string, values: LeadUpdateValues, actorId: string): Promise<boolean> {
  const rows = await tx
    .update(leads)
    .set({ status: values.status, internalNotes: blankToNull(values.internalNotes), handledBy: actorId })
    .where(eq(leads.id, id))
    .returning({ id: leads.id });
  return rows.length === 1;
}

const tehranDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" });
const tehranTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });

/** "1404/05/12" in Latin digits (spreadsheets sort and parse them), Tehran time. */
export function shamsiDate(value: Date): string {
  const parts = Object.fromEntries(tehranDate.formatToParts(value).map((p) => [p.type, p.value]));
  return `${parts.year}/${parts.month}/${parts.day}`;
}

export const CSV_HEADER = ["تاریخ ثبت (شمسی)", "ساعت (تهران)", "نام", "تلفن", "ایمیل", "شرکت", "پیام", "بودجه", "منبع", "وضعیت", "رسیدگی‌کننده", "یادداشت داخلی", "زمان ثبت (UTC)"];

/** Every lead, oldest first, as CSV (BOM, CRLF, formula-neutralised). The caller must already have checked the role. */
export async function leadsCsv(db: Db): Promise<string> {
  const rows = await select(db).orderBy(leads.createdAt, leads.id);
  return toCsv(
    CSV_HEADER,
    rows.map((r) => [
      shamsiDate(r.createdAt),
      tehranTime.format(r.createdAt),
      r.name,
      r.phone,
      r.email,
      r.company,
      r.message,
      r.budgetRange,
      r.source,
      LEAD_STATUS_LABEL[r.status],
      r.handledByName,
      r.internalNotes,
      r.createdAt.toISOString(),
    ]),
  );
}

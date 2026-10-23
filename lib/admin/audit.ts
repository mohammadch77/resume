import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { auditLog, users } from "@/lib/db/schema";
import { parseJalaliInput } from "@/lib/date/jalali-input";
import type { PageInfo } from "./pagination";

/** Audited tables (the ones with the audit trigger) and how the filter shows them. */
export const AUDIT_TABLES = {
  users: "کاربران",
  media_assets: "رسانه",
  industries: "حوزه‌های کاری",
  tech_tags: "فناوری‌ها",
  services: "خدمات",
  clients: "مشتریان",
  projects: "پروژه‌ها",
  testimonials: "نظرات مشتریان",
  site_settings: "تنظیمات سایت",
  project_media: "گالری پروژه",
  project_metrics: "شاخص‌های پروژه",
  project_services: "خدمت‌های پروژه",
  project_tech: "فناوری‌های پروژه",
} as const;
export type AuditTable = keyof typeof AUDIT_TABLES;

export const AUDIT_ACTIONS = { INSERT: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف" } as const;
export type AuditAction = keyof typeof AUDIT_ACTIONS;

export const isAuditTable = (v: string | undefined): v is AuditTable => v !== undefined && Object.hasOwn(AUDIT_TABLES, v);
export const isAuditAction = (v: string | undefined): v is AuditAction => v !== undefined && Object.hasOwn(AUDIT_ACTIONS, v);

export type AuditFilters = {
  table?: AuditTable;
  action?: AuditAction;
  /** Exact record id (uuid, or `a:b` for join tables). */
  rowId?: string;
  actorId?: string;
  /** Shamsi dates as typed ("1404/05/12"); both ends inclusive, Tehran days. */
  from?: string;
  to?: string;
};

export type AuditRow = {
  id: number;
  tableName: string;
  rowId: string;
  action: string;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  actorName: string | null;
  requestId: string | null;
  createdAt: Date;
};

/** Filter problems the page shows next to the form; the offending filter is ignored. */
export type AuditFilterErrors = { from?: string; to?: string };

/**
 * Turns the filters into SQL conditions. A Shamsi day is converted to the Gregorian date and then to the instants at
 * which that day starts and ends in Tehran, using the database's tz rules (so historical DST is right too).
 */
export function auditConditions(f: AuditFilters): { conditions: SQL[]; errors: AuditFilterErrors } {
  const conditions: SQL[] = [];
  const errors: AuditFilterErrors = {};
  if (f.table) conditions.push(eq(auditLog.tableName, f.table));
  if (f.action) conditions.push(eq(auditLog.action, f.action));
  if (f.rowId) conditions.push(eq(auditLog.rowId, f.rowId));
  if (f.actorId) conditions.push(eq(auditLog.actorId, f.actorId));
  if (f.from?.trim()) {
    const iso = parseJalaliInput(f.from);
    if (iso) conditions.push(gte(auditLog.createdAt, sql`(${iso}::date)::timestamp AT TIME ZONE 'Asia/Tehran'`));
    else errors.from = "تاریخ شمسی را به شکل ۱۴۰۴/۰۵/۱۲ بنویسید.";
  }
  if (f.to?.trim()) {
    const iso = parseJalaliInput(f.to);
    if (iso) conditions.push(lt(auditLog.createdAt, sql`((${iso}::date + 1))::timestamp AT TIME ZONE 'Asia/Tehran'`));
    else errors.to = "تاریخ شمسی را به شکل ۱۴۰۴/۰۵/۱۲ بنویسید.";
  }
  return { conditions, errors };
}

export async function listAudit(db: Db, filters: AuditFilters, page: PageInfo): Promise<{ rows: AuditRow[]; total: number; errors: AuditFilterErrors }> {
  const { conditions, errors } = auditConditions(filters);
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        tableName: auditLog.tableName,
        rowId: auditLog.rowId,
        action: auditLog.action,
        beforeData: auditLog.beforeData,
        afterData: auditLog.afterData,
        actorName: users.displayName,
        requestId: auditLog.requestId,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorId))
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(page.pageSize)
      .offset(page.offset),
    db.select({ total: count() }).from(auditLog).where(where),
  ]);
  return {
    rows: rows.map((r) => ({
      ...r,
      beforeData: (r.beforeData as Record<string, unknown> | null) ?? null,
      afterData: (r.afterData as Record<string, unknown> | null) ?? null,
    })),
    total,
    errors,
  };
}

/** Everyone who ever appears as an actor, for the filter's select. */
export async function listActors(db: Db): Promise<Array<{ id: string; name: string }>> {
  return db
    .selectDistinct({ id: users.id, name: users.displayName })
    .from(auditLog)
    .innerJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(users.displayName);
}

export type FieldChange = { field: string; before: string; after: string };

const NOISE = new Set(["updated_at", "created_at"]);
const MAX_SHOWN = 160;

function show(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}…` : text;
}

/**
 * Field-level difference of one audit entry. INSERT shows the stored values, DELETE the removed ones, UPDATE only what
 * changed. `updated_at` / `created_at` are left out (they change on every edit and say nothing). Long values are cut.
 */
export function describeChanges(action: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null): FieldChange[] {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((k) => !NOISE.has(k));
  const out: FieldChange[] = [];
  for (const field of keys) {
    const b = before?.[field];
    const a = after?.[field];
    if (action === "UPDATE" && JSON.stringify(b) === JSON.stringify(a)) continue;
    out.push({ field, before: action === "INSERT" ? "—" : show(b), after: action === "DELETE" ? "—" : show(a) });
  }
  return out;
}

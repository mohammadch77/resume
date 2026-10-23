import type { Metadata } from "next";
import Link from "next/link";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUDIT_ACTIONS,
  AUDIT_TABLES,
  describeChanges,
  isAuditAction,
  isAuditTable,
  listActors,
  listAudit,
  type AuditFilters,
} from "@/lib/admin/audit";
import { parsePage } from "@/lib/admin/pagination";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { formatDateTime } from "@/lib/format";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "گزارش تغییرات" };

const AUDIT_PAGE_SIZE = 50;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireRole("owner");
  const q = await searchParams;
  const table = one(q.table);
  const action = one(q.action);
  const actor = one(q.actor);
  const filters: AuditFilters = {
    table: isAuditTable(table) ? table : undefined,
    action: isAuditAction(action) ? action : undefined,
    actorId: actor && uuidSchema.safeParse(actor).success ? actor : undefined,
    rowId: one(q.row)?.trim().slice(0, 100) || undefined,
    from: one(q.from),
    to: one(q.to),
  };
  const page = parsePage(q.page, AUDIT_PAGE_SIZE);
  const db = getDb();
  const [{ rows, total, errors }, actors] = await Promise.all([listAudit(db, filters, page), listActors(db)]);
  const query = {
    table: filters.table,
    action: filters.action,
    actor: filters.actorId,
    row: filters.rowId,
    from: filters.from?.trim() || undefined,
    to: filters.to?.trim() || undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">گزارش تغییرات</h1>

      <form method="get" className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3" role="search" aria-label="فیلتر گزارش">
        <label className="flex flex-col gap-1 text-sm">
          بخش
          <select name="table" defaultValue={filters.table ?? ""} className={selectClass}>
            <option value="">همه</option>
            {Object.entries(AUDIT_TABLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          عملیات
          <select name="action" defaultValue={filters.action ?? ""} className={selectClass}>
            <option value="">همه</option>
            {Object.entries(AUDIT_ACTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          انجام‌دهنده
          <select name="actor" defaultValue={filters.actorId ?? ""} className={selectClass}>
            <option value="">همه</option>
            {actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          از تاریخ (شمسی)
          <Input name="from" dir="ltr" inputMode="numeric" placeholder="1404/05/01" defaultValue={query.from ?? ""} aria-invalid={Boolean(errors.from)} aria-describedby={errors.from ? "audit-from-error" : undefined} />
          {errors.from ? <span id="audit-from-error" role="alert" className="text-destructive">{errors.from}</span> : null}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          تا تاریخ (شمسی)
          <Input name="to" dir="ltr" inputMode="numeric" placeholder="1404/05/31" defaultValue={query.to ?? ""} aria-invalid={Boolean(errors.to)} aria-describedby={errors.to ? "audit-to-error" : undefined} />
          {errors.to ? <span id="audit-to-error" role="alert" className="text-destructive">{errors.to}</span> : null}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          شناسه‌ی رکورد
          <Input name="row" dir="ltr" defaultValue={query.row ?? ""} />
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit">اعمال فیلتر</Button>
          <Link href="/admin/audit" className={buttonVariants({ variant: "outline" })}>پاک‌کردن فیلترها</Link>
        </div>
      </form>

      <p className="text-sm text-muted-foreground" role="status">
        {total.toLocaleString("fa-IR")} رویداد پیدا شد. زمان‌ها به وقت تهران و به تقویم شمسی است.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">رویدادی با این فیلتر پیدا نشد.</p>
      ) : (
        <ol className="divide-y rounded-lg border">
          {rows.map((r) => {
            const changes = describeChanges(r.action, r.beforeData, r.afterData);
            return (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3" data-testid="audit-row">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <time dateTime={r.createdAt.toISOString()} className="font-medium">{formatDateTime(r.createdAt)}</time>
                  <span>{AUDIT_ACTIONS[r.action as keyof typeof AUDIT_ACTIONS] ?? r.action}</span>
                  <span>{AUDIT_TABLES[r.tableName as keyof typeof AUDIT_TABLES] ?? r.tableName}</span>
                  <span className="text-muted-foreground">{r.actorName ?? "سیستم"}</span>
                  <span dir="ltr" className="font-mono text-xs text-muted-foreground">{r.rowId}</span>
                </div>
                {changes.length > 0 ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer">جزئیات ({changes.length.toLocaleString("fa-IR")} فیلد)</summary>
                    <table className="mt-2 w-full text-xs">
                      <thead>
                        <tr className="text-start text-muted-foreground">
                          <th className="text-start font-normal">فیلد</th>
                          <th className="text-start font-normal">قبل</th>
                          <th className="text-start font-normal">بعد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.map((c) => (
                          <tr key={c.field} className="align-top">
                            <td dir="ltr" className="py-1 pe-3 text-start font-mono">{c.field}</td>
                            <td className="py-1 pe-3 break-all">{c.before}</td>
                            <td className="py-1 break-all">{c.after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      <PaginationNav basePath="/admin/audit" page={page.page} total={total} pageSize={AUDIT_PAGE_SIZE} query={query} />
    </div>
  );
}

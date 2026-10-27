import { count, desc, eq, and, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { recentLeads } from "@/lib/admin/leads";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { auditLog, leads, projects } from "@/lib/db/schema";
import { formatDateTime, formatNumber } from "@/lib/format";
import { LEAD_STATUS_LABEL } from "@/lib/validation/lead";

export const metadata: Metadata = { title: "داشبورد" };

const ACTIONS: Record<string, string> = { INSERT: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف" };

export default async function DashboardPage() {
  await requireRole("owner", "editor");
  const db = getDb();
  const [[published], [drafts], [newLeads], events, latestLeads] = await Promise.all([
    db.select({ n: count() }).from(projects).where(and(eq(projects.status, "published"), isNull(projects.deletedAt))),
    db.select({ n: count() }).from(projects).where(and(eq(projects.status, "draft"), isNull(projects.deletedAt))),
    db.select({ n: count() }).from(leads).where(eq(leads.status, "new")),
    db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(8),
    recentLeads(db, 5),
  ]);

  const stats = [
    { label: "پروژه‌های منتشرشده", value: published.n },
    { label: "پروژه‌های پیش‌نویس", value: drafts.n },
    { label: "درخواست‌های جدید", value: newLeads.n },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">داشبورد</h1>
      <section aria-label="آمار" className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{formatNumber(s.value)}</CardContent>
          </Card>
        ))}
      </section>
      <section aria-labelledby="latest-leads" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="latest-leads" className="text-lg font-semibold">
            آخرین درخواست‌ها
          </h2>
          <Link href="/admin/leads" className="text-sm hover:underline">
            همه‌ی درخواست‌ها
          </Link>
        </div>
        {latestLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز درخواستی ثبت نشده است.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-md border" data-testid="dashboard-leads">
            {latestLeads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">
                  {l.name}
                </Link>
                <span dir="ltr" className="text-muted-foreground">
                  {l.phone ?? "—"}
                </span>
                <span className="text-muted-foreground">{LEAD_STATUS_LABEL[l.status]}</span>
                <time dateTime={l.createdAt.toISOString()} className="text-muted-foreground">
                  {formatDateTime(l.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="recent" className="flex flex-col gap-3">
        <h2 id="recent" className="text-lg font-semibold">
          آخرین تغییرات
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز تغییری ثبت نشده است.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-md border">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {ACTIONS[e.action] ?? e.action} · <span dir="ltr">{e.tableName}</span>
                </span>
                <time dateTime={e.createdAt.toISOString()} className="text-muted-foreground">
                  {formatDateTime(e.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

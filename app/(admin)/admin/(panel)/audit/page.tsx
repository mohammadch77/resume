import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "گزارش تغییرات" };

const ACTIONS: Record<string, string> = { INSERT: "ایجاد", UPDATE: "ویرایش", DELETE: "حذف" };

export default async function AuditPage() {
  await requireRole("owner");
  const rows = await getDb().select().from(auditLog).orderBy(desc(auditLog.id)).limit(100);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">گزارش تغییرات</h1>
      <p className="text-sm text-muted-foreground">۱۰۰ رویداد آخر. فیلتر و جست‌وجو در مرحله‌ی بعد اضافه می‌شود.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>زمان</TableHead>
            <TableHead>عملیات</TableHead>
            <TableHead>جدول</TableHead>
            <TableHead>شناسه‌ی رکورد</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDateTime(r.createdAt)}</TableCell>
              <TableCell>{ACTIONS[r.action] ?? r.action}</TableCell>
              <TableCell dir="ltr">{r.tableName}</TableCell>
              <TableCell dir="ltr" className="font-mono text-xs">
                {r.rowId}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUsers } from "@/lib/admin/users";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { formatDateTime } from "@/lib/format";
import { USER_ROLE_LABEL } from "@/lib/validation/user";

export const metadata: Metadata = { title: "کاربران" };

export default async function UsersPage() {
  const me = await requireRole("owner");
  const rows = await listUsers(getDb());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">کاربران</h1>
        <Link href="/admin/users/new" className={buttonVariants()}>
          کاربر جدید
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>نام</TableHead>
            <TableHead>ایمیل</TableHead>
            <TableHead>نقش</TableHead>
            <TableHead>آخرین ورود</TableHead>
            <TableHead>وضعیت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u) => (
            <TableRow key={u.id} data-testid="user-row">
              <TableCell>
                <Link href={`/admin/users/${u.id}`} className="hover:underline">
                  {u.displayName}
                </Link>
              </TableCell>
              <TableCell dir="ltr">{u.email}</TableCell>
              <TableCell>{USER_ROLE_LABEL[u.role]}</TableCell>
              <TableCell>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? "فعال" : "غیرفعال"}</Badge>
                  {u.locked ? <Badge variant="outline">قفل‌شده</Badge> : null}
                  {u.id !== me.id ? <UserActiveToggle userId={u.id} active={u.isActive} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

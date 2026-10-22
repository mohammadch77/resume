import { asc, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "کاربران" };

export default async function UsersPage() {
  const me = await requireRole("owner");
  const rows = await getDb().select().from(users).where(isNull(users.deletedAt)).orderBy(asc(users.createdAt));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">کاربران</h1>
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
            <TableRow key={u.id}>
              <TableCell>{u.displayName}</TableCell>
              <TableCell dir="ltr">{u.email}</TableCell>
              <TableCell>{u.role === "owner" ? "مالک" : "ویراستار"}</TableCell>
              <TableCell>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? "فعال" : "غیرفعال"}</Badge>
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

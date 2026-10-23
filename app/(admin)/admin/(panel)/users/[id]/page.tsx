import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditUserForm } from "@/components/admin/user-form";
import { UserSecurity } from "@/components/admin/user-security";
import { getUser } from "@/lib/admin/users";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "ویرایش کاربر" };

export default async function EditUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireRole("owner");
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const user = await getUser(getDb(), parsed.data);
  if (!user) notFound();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/admin/users" className="text-sm hover:underline">← همه‌ی کاربران</Link>
        <h1 className="text-2xl font-semibold">{user.displayName}</h1>
        <p dir="ltr" className="text-start text-sm text-muted-foreground">{user.email}</p>
      </div>
      <EditUserForm id={user.id} initial={{ displayName: user.displayName, role: user.role }} selfEdit={user.id === me.id} />
      <UserSecurity id={user.id} locked={user.locked} isSelf={user.id === me.id} />
    </div>
  );
}

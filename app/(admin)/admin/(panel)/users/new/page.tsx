import type { Metadata } from "next";
import { CreateUserForm } from "@/components/admin/user-form";
import { requireRole } from "@/lib/auth/require-role";

export const metadata: Metadata = { title: "کاربر جدید" };

export default async function NewUserPage() {
  await requireRole("owner");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">کاربر جدید</h1>
      <CreateUserForm />
    </div>
  );
}

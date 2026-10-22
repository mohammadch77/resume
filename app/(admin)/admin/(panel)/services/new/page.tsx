import type { Metadata } from "next";
import { ServiceForm } from "@/components/admin/service-form";
import { requireRole } from "@/lib/auth/require-role";

export const metadata: Metadata = { title: "خدمت جدید" };

export default async function NewServicePage() {
  await requireRole("owner", "editor");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">خدمت جدید</h1>
      <ServiceForm />
    </div>
  );
}

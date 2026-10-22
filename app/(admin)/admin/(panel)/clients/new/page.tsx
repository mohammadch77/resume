import type { Metadata } from "next";
import { ClientForm } from "@/components/admin/client-form";
import { listTaxonomy } from "@/lib/admin/taxonomy";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { listPickerOptions } from "@/lib/media/picker";

export const metadata: Metadata = { title: "مشتری جدید" };

export default async function NewClientPage() {
  await requireRole("owner", "editor");
  const db = getDb();
  const [industries, logos] = await Promise.all([listTaxonomy(db, "industry"), listPickerOptions(db, ["image"])]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">مشتری جدید</h1>
      <ClientForm industries={industries} logos={logos} />
    </div>
  );
}

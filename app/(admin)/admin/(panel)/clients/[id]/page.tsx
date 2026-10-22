import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/admin/client-form";
import { getClient } from "@/lib/admin/clients";
import { listTaxonomy } from "@/lib/admin/taxonomy";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { listPickerOptions } from "@/lib/media/picker";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "ویرایش مشتری" };

export default async function EditClientPage({ params }: PageProps<"/admin/clients/[id]">) {
  await requireRole("owner", "editor");
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const db = getDb();
  const client = await getClient(db, parsed.data);
  if (!client) notFound();
  const [industries, logos] = await Promise.all([listTaxonomy(db, "industry"), listPickerOptions(db, ["image"])]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">ویرایش «{client.name}»</h1>
      <ClientForm
        id={client.id}
        industries={industries}
        logos={logos}
        initial={{
          name: client.name,
          slug: client.slug,
          industryId: client.industryId ?? "",
          logoMediaId: client.logoMediaId ?? "",
          websiteUrl: client.websiteUrl ?? "",
          showNamePublicly: client.showNamePublicly,
        }}
      />
    </div>
  );
}

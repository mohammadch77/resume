import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { getService } from "@/lib/admin/services";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { SERVICE_ICONS } from "@/lib/validation/common";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "ویرایش خدمت" };

export default async function EditServicePage({ params }: PageProps<"/admin/services/[id]">) {
  await requireRole("owner", "editor");
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const service = await getService(getDb(), parsed.data);
  if (!service) notFound();
  const iconKey = (SERVICE_ICONS as readonly string[]).includes(service.iconKey) ? (service.iconKey as (typeof SERVICE_ICONS)[number]) : SERVICE_ICONS[0];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">ویرایش «{service.title}»</h1>
      {/* key = version: after a conflict reload the form remounts with the newer values */}
      <ServiceForm
        key={service.version}
        id={service.id}
        version={service.version}
        initial={{ title: service.title, slug: service.slug, summary: service.summary, iconKey }}
      />
    </div>
  );
}

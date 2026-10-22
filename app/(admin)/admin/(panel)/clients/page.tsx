import type { Metadata } from "next";
import Link from "next/link";
import { ClientDeleteButton } from "@/components/admin/client-delete-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listClients } from "@/lib/admin/clients";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "مشتریان" };

export default async function ClientsPage() {
  await requireRole("owner", "editor");
  const rows = await listClients(getDb());
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">مشتریان</h1>
        <Link href="/admin/clients/new" className={buttonVariants()}>
          مشتری جدید
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز مشتری‌ای ثبت نشده است.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid="client-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/admin/clients/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.industryName ?? "حوزه‌ی کاری مشخص نشده"} ·{" "}
                  {c.usage > 0 ? `در ${c.usage.toLocaleString("fa-IR")} پروژه یا نظر` : "استفاده نشده"}
                </p>
              </div>
              <Badge variant={c.showNamePublicly ? "default" : "secondary"}>{c.showNamePublicly ? "نمایش عمومی" : "نمایش داده نمی‌شود"}</Badge>
              <ClientDeleteButton id={c.id} name={c.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

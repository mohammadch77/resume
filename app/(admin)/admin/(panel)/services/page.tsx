import type { Metadata } from "next";
import Link from "next/link";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listServices } from "@/lib/admin/services";
import { deleteServiceAction, moveServiceAction, setServiceStatusAction } from "./actions";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "خدمات" };

const STATUS_LABEL = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" } as const;

export default async function ServicesPage() {
  await requireRole("owner", "editor");
  const rows = await listServices(getDb());
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">خدمات</h1>
        <Link href="/admin/services/new" className={buttonVariants()}>
          خدمت جدید
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز خدمتی ثبت نشده است.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-start gap-3 px-4 py-3" data-testid="service-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/admin/services/${s.id}`} className="font-medium hover:underline">
                  {s.title}
                </Link>
                <p className="line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {s.usage > 0 ? `در ${s.usage.toLocaleString("fa-IR")} پروژه` : "در هیچ پروژه‌ای نیست"}
                </p>
              </div>
              <Badge variant={s.status === "published" ? "default" : "secondary"}>{STATUS_LABEL[s.status]}</Badge>
              <ContentRowActions
                id={s.id}
                title={s.title}
                version={s.version}
                status={s.status}
                noun="خدمت"
                setStatus={setServiceStatusAction}
                remove={deleteServiceAction}
                move={{ first: i === 0, last: i === rows.length - 1, action: moveServiceAction }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

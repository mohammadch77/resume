import type { Metadata } from "next";
import Link from "next/link";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listTestimonials } from "@/lib/admin/testimonials";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { deleteTestimonialAction, setTestimonialStatusAction } from "./actions";

export const metadata: Metadata = { title: "نظرات مشتریان" };

const STATUS_LABEL = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" } as const;

export default async function TestimonialsPage() {
  await requireRole("owner", "editor");
  const rows = await listTestimonials(getDb());
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">نظرات مشتریان</h1>
        <Link href="/admin/testimonials/new" className={buttonVariants()}>
          نظر جدید
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز نظری ثبت نشده است.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-start gap-3 px-4 py-3" data-testid="testimonial-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/admin/testimonials/${t.id}`} className="font-medium hover:underline">
                  {t.authorName}
                </Link>
                <p className="line-clamp-2 text-sm text-muted-foreground">{t.quote}</p>
                <p className="text-xs text-muted-foreground">
                  {t.clientName} · {t.consentConfirmed ? "رضایت تأیید شده" : "رضایت تأیید نشده"}
                </p>
              </div>
              <Badge variant={t.status === "published" ? "default" : "secondary"}>{STATUS_LABEL[t.status]}</Badge>
              <ContentRowActions
                id={t.id}
                title={t.authorName}
                version={t.version}
                status={t.status}
                noun="نظر"
                setStatus={setTestimonialStatusAction}
                remove={deleteTestimonialAction}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

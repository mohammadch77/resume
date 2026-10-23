import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { Badge } from "@/components/ui/badge";
import { listClients } from "@/lib/admin/clients";
import { getTestimonial, listProjectChoices } from "@/lib/admin/testimonials";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { uuidSchema } from "@/lib/validation/common";
import { deleteTestimonialAction, setTestimonialStatusAction } from "../actions";

export const metadata: Metadata = { title: "ویرایش نظر" };

const STATUS_LABEL = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" } as const;

export default async function EditTestimonialPage({ params }: PageProps<"/admin/testimonials/[id]">) {
  await requireRole("owner", "editor");
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const db = getDb();
  const testimonial = await getTestimonial(db, parsed.data);
  if (!testimonial) notFound();
  const [clients, projects] = await Promise.all([listClients(db), listProjectChoices(db)]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          ویرایش نظر «{testimonial.values.authorName}»
          <Badge variant={testimonial.status === "published" ? "default" : "secondary"}>{STATUS_LABEL[testimonial.status]}</Badge>
        </h1>
        <ContentRowActions
          id={testimonial.id}
          title={testimonial.values.authorName}
          version={testimonial.version}
          status={testimonial.status}
          noun="نظر"
          setStatus={setTestimonialStatusAction}
          remove={deleteTestimonialAction}
          afterDelete="/admin/testimonials"
        />
      </div>
      {/* key = version: after a save or a conflict reload the form remounts with the stored values */}
      <TestimonialForm
        key={testimonial.version}
        id={testimonial.id}
        version={testimonial.version}
        initial={testimonial.values}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={projects}
      />
    </div>
  );
}

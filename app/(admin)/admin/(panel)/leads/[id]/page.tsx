import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/admin/lead-form";
import { Badge } from "@/components/ui/badge";
import { getLead } from "@/lib/admin/leads";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { formatDateTime } from "@/lib/format";
import { uuidSchema } from "@/lib/validation/common";
import { LEAD_STATUS_LABEL } from "@/lib/validation/lead";

export const metadata: Metadata = { title: "درخواست" };

/** Visitor text is rendered as plain text by React (escaped); it is never injected as HTML. */
export default async function LeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  await requireRole("owner", "editor");
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const lead = await getLead(getDb(), parsed.data);
  if (!lead) notFound();

  const facts: Array<[string, React.ReactNode]> = [
    ["تلفن", lead.phone ? <a key="p" dir="ltr" href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"],
    ["ایمیل", lead.email ? <a key="e" dir="ltr" href={`mailto:${lead.email}`}>{lead.email}</a> : "—"],
    ["شرکت", lead.company ?? "—"],
    ["بودجه", lead.budgetRange ?? "—"],
    ["منبع", lead.source],
    ["زمان ثبت", formatDateTime(lead.createdAt)],
    ["آخرین رسیدگی", lead.handledByName ?? "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/leads" className="text-sm hover:underline">← همه‌ی درخواست‌ها</Link>
        <h1 className="text-2xl font-semibold">{lead.name}</h1>
        <Badge variant={lead.status === "new" ? "default" : "secondary"}>{LEAD_STATUS_LABEL[lead.status]}</Badge>
      </div>
      <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="ld-message" className="max-w-xl">
        <h2 id="ld-message" className="mb-2 text-lg font-semibold">پیام</h2>
        <p className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{lead.message}</p>
      </section>
      {/* key = updatedAt: after a save the form remounts with what is stored */}
      <LeadForm key={lead.updatedAt.getTime()} id={lead.id} initial={{ status: lead.status, internalNotes: lead.internalNotes ?? "" }} />
    </div>
  );
}

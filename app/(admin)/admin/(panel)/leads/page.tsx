import type { Metadata } from "next";
import Link from "next/link";
import { PaginationNav } from "@/components/admin/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listLeads } from "@/lib/admin/leads";
import { PAGE_SIZE, parsePage } from "@/lib/admin/pagination";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { formatDateTime } from "@/lib/format";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "درخواست‌ها" };

const isStatus = (v: string | undefined): v is LeadStatus => LEAD_STATUSES.some((s) => s === v);

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const user = await requireRole("owner", "editor");
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isStatus(rawStatus) ? rawStatus : undefined;
  const page = parsePage(params.page);
  const { rows, total } = await listLeads(getDb(), page, status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">درخواست‌ها</h1>
        {user.role === "owner" ? (
          <a href="/admin/api/leads/export" className={buttonVariants({ variant: "outline" })} download>
            دانلود همه‌ی درخواست‌ها (CSV)
          </a>
        ) : null}
      </div>

      <nav aria-label="فیلتر وضعیت" className="flex flex-wrap gap-2 text-sm">
        {[undefined, ...LEAD_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/leads?status=${s}` : "/admin/leads"}
            aria-current={s === status ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1", s === status && "bg-muted font-semibold")}
          >
            {s ? LEAD_STATUS_LABEL[s] : "همه"}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">درخواستی پیدا نشد.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((l) => (
            <li key={l.id} className="flex flex-wrap items-start gap-3 px-4 py-3" data-testid="lead-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">
                  {l.name}
                </Link>
                <p className="line-clamp-2 text-sm text-muted-foreground">{l.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(l.createdAt)}
                  {l.handledByName ? ` · رسیدگی: ${l.handledByName}` : ""}
                </p>
              </div>
              <Badge variant={l.status === "new" ? "default" : "secondary"}>{LEAD_STATUS_LABEL[l.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
      <PaginationNav basePath="/admin/leads" page={page.page} total={total} pageSize={PAGE_SIZE} query={{ status }} />
    </div>
  );
}

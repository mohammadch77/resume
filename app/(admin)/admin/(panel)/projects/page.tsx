import type { Metadata } from "next";
import Link from "next/link";
import { ProjectRowActions } from "@/components/admin/project-row-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { listProjects } from "@/lib/admin/projects";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "پروژه‌ها" };

const STATUS_LABEL = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" } as const;

export default async function ProjectsPage() {
  await requireRole("owner", "editor");
  const rows = await listProjects(getDb());
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">پروژه‌ها</h1>
        <Link href="/admin/projects/new" className={buttonVariants()}>
          پروژه‌ی جدید
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز پروژه‌ای ثبت نشده است.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-start gap-3 px-4 py-3" data-testid="project-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/admin/projects/${p.id}`} className="font-medium hover:underline">
                  {p.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {p.industryName}
                  {p.clientName ? ` · ${p.clientName}` : ""}
                  {p.isFeatured ? " · ویژه" : ""}
                </p>
              </div>
              <Badge variant={p.status === "published" ? "default" : "secondary"}>{STATUS_LABEL[p.status]}</Badge>
              <ProjectRowActions id={p.id} title={p.title} version={p.version} status={p.status} move={{ first: i === 0, last: i === rows.length - 1 }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

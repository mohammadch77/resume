import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/admin/project-form";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import { Badge } from "@/components/ui/badge";
import { loadProjectFormChoices } from "@/lib/admin/project-choices";
import { getProject } from "@/lib/admin/projects";
import { deleteProjectAction, setProjectStatusAction } from "../actions";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { uuidSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "ویرایش پروژه" };

const STATUS_LABEL = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" } as const;

export default async function EditProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  await requireRole("owner", "editor");
  const parsed = uuidSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const db = getDb();
  const project = await getProject(db, parsed.data);
  if (!project) notFound();
  const choices = await loadProjectFormChoices(db);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          ویرایش «{project.values.title}»
          <Badge variant={project.status === "published" ? "default" : "secondary"}>{STATUS_LABEL[project.status]}</Badge>
        </h1>
        <ContentRowActions
          id={project.id}
          title={project.values.title}
          version={project.version}
          status={project.status}
          noun="پروژه"
          setStatus={setProjectStatusAction}
          remove={deleteProjectAction}
          afterDelete="/admin/projects"
        />
      </div>
      {/* key = version: after a save or a conflict reload the form remounts with the stored values */}
      <ProjectForm key={project.version} id={project.id} version={project.version} initial={project.values} {...choices} />
    </div>
  );
}

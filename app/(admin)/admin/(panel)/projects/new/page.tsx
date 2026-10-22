import type { Metadata } from "next";
import { ProjectForm } from "@/components/admin/project-form";
import { loadProjectFormChoices } from "@/lib/admin/project-choices";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "پروژه‌ی جدید" };

export default async function NewProjectPage() {
  await requireRole("owner", "editor");
  const choices = await loadProjectFormChoices(getDb());
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">پروژه‌ی جدید</h1>
      <ProjectForm {...choices} />
    </div>
  );
}

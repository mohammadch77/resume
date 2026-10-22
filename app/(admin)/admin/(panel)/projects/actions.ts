"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { createProject, deleteProject, moveProject, setProjectStatus, updateProject } from "@/lib/admin/projects";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { uuidSchema, versionSchema } from "@/lib/validation/common";
import { projectFormSchema } from "@/lib/validation/project";

const roles: ("owner" | "editor")[] = ["owner", "editor"];

/** Every change to a project (or its order / status) can alter the landing's work strip and /work/<slug>. */
function changed(): void {
  invalidateContent(CONTENT_TAGS.projects);
  revalidatePath("/admin/projects");
}

export const saveProjectAction = adminAction(
  { roles, schema: projectFormSchema.extend({ id: uuidSchema.optional(), version: versionSchema.optional() }) },
  async ({ tx, input }): Promise<Outcome<{ id: string }>> => {
    const { id, version, ...values } = input;
    const outcome = await guard(tx, async (sp) => {
      if (!id) return { id: await createProject(sp, values) };
      if (version === undefined) throw new Error("version is required to update");
      await updateProject(sp, id, version, values);
      return { id };
    });
    if (outcome.kind === "ok") changed();
    return outcome;
  },
);

export const setProjectStatusAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema, status: z.enum(["draft", "published", "archived"]) }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => setProjectStatus(sp, input.id, input.version, input.status));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return { kind: "ok", value: null };
  },
);

export const moveProjectAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, direction: z.enum(["up", "down"]) }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => moveProject(sp, input.id, input.direction));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return { kind: "ok", value: null };
  },
);

export const deleteProjectAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => deleteProject(sp, input.id, input.version));
    if (outcome.kind !== "ok") return outcome;
    const result = outcome.value;
    if (!result.ok) {
      return {
        kind: "failed",
        message:
          result.reason === "published"
            ? "ابتدا انتشار این پروژه را لغو کنید، سپس حذفش کنید."
            : `این پروژه در ${(result.usage ?? 0).toLocaleString("fa-IR")} نظر مشتری استفاده شده است. ابتدا آن‌ها را عوض کنید.`,
      };
    }
    changed();
    return { kind: "ok", value: null };
  },
);

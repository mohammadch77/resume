"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createService, deleteService, moveService, setServiceStatus, updateService } from "@/lib/admin/services";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { uuidSchema, versionSchema } from "@/lib/validation/common";
import { serviceFormSchema } from "@/lib/validation/service";

const roles: ("owner" | "editor")[] = ["owner", "editor"];

function changed(): void {
  invalidateContent(CONTENT_TAGS.services);
  revalidatePath("/admin/services");
}

export const saveServiceAction = adminAction(
  { roles, schema: serviceFormSchema.extend({ id: uuidSchema.optional(), version: versionSchema.optional() }) },
  async ({ tx, input }): Promise<Outcome<{ id: string }>> => {
    const { id, version, ...values } = input;
    const outcome = await guard(tx, async (sp) => {
      if (!id) return { id: await createService(sp, values) };
      if (version === undefined) throw new Error("version is required to update");
      await updateService(sp, id, version, values);
      return { id };
    });
    if (outcome.kind === "ok") changed();
    return outcome;
  },
);

export const setServiceStatusAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema, status: z.enum(["draft", "published", "archived"]) }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => setServiceStatus(sp, input.id, input.version, input.status));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return { kind: "ok", value: null };
  },
);

export const moveServiceAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, direction: z.enum(["up", "down"]) }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => moveService(sp, input.id, input.direction));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return { kind: "ok", value: null };
  },
);

export const deleteServiceAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => deleteService(sp, input.id, input.version));
    if (outcome.kind !== "ok") return outcome;
    const result = outcome.value;
    if (!result.ok) {
      return {
        kind: "failed",
        message:
          result.reason === "published"
            ? "ابتدا انتشار این خدمت را لغو کنید، سپس حذفش کنید."
            : `این خدمت در ${(result.usage ?? 0).toLocaleString("fa-IR")} پروژه استفاده شده است. ابتدا آن را از پروژه‌ها بردارید.`,
      };
    }
    changed();
    return { kind: "ok", value: null };
  },
);

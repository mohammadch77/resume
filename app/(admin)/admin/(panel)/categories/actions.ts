"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { createTaxonomy, deleteTaxonomy, updateTaxonomy } from "@/lib/admin/taxonomy";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { requiredText, slugSchema, uuidSchema } from "@/lib/validation/common";

const kindSchema = z.enum(["industry", "tech"]);

export const saveCategoryAction = adminAction(
  {
    roles: ["owner", "editor"],
    schema: z.object({ kind: kindSchema, id: uuidSchema.optional(), name: requiredText("نام", 80), slug: slugSchema }),
  },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const { kind, id, ...values } = input;
    const outcome = await guard(tx, async (sp) => {
      if (!id) return createTaxonomy(sp, kind, values).then(() => true);
      return updateTaxonomy(sp, kind, id, values);
    });
    if (outcome.kind !== "ok") return outcome;
    if (!outcome.value) return { kind: "failed", message: "این مورد دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید." };
    // Industry and tag names are shown on public project pages and client logos.
    invalidateContent(CONTENT_TAGS.projects, CONTENT_TAGS.clients);
    revalidatePath("/admin/categories");
    return { kind: "ok", value: null };
  },
);

export const deleteCategoryAction = adminAction(
  { roles: ["owner", "editor"], schema: z.object({ kind: kindSchema, id: uuidSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const result = await deleteTaxonomy(tx, input.kind, input.id);
    if (!result.ok) {
      return {
        kind: "failed",
        message:
          result.reason === "in_use"
            ? `این مورد در ${result.usage.toLocaleString("fa-IR")} پروژه یا مشتری استفاده شده است. ابتدا آن‌ها را عوض کنید.`
            : "این مورد دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید.",
      };
    }
    invalidateContent(CONTENT_TAGS.projects, CONTENT_TAGS.clients);
    revalidatePath("/admin/categories");
    return { kind: "ok", value: null };
  },
);

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, deleteClient, updateClient } from "@/lib/admin/clients";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { clientFormSchema } from "@/lib/validation/client";
import { uuidSchema } from "@/lib/validation/common";

const roles: ("owner" | "editor")[] = ["owner", "editor"];
const GONE = "این مشتری دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید.";

/** Client name and logo appear on the landing's clients strip, on project pages and in testimonials. */
function changed(): void {
  invalidateContent(CONTENT_TAGS.clients, CONTENT_TAGS.projects, CONTENT_TAGS.testimonials);
  revalidatePath("/admin/clients");
}

export const saveClientAction = adminAction(
  { roles, schema: clientFormSchema.extend({ id: uuidSchema.optional() }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const { id, ...values } = input;
    const outcome = await guard(tx, async (sp) => {
      if (!id) return createClient(sp, values).then(() => true);
      return updateClient(sp, id, values);
    });
    if (outcome.kind !== "ok") return outcome;
    if (!outcome.value) return { kind: "failed", message: GONE };
    changed();
    return { kind: "ok", value: null };
  },
);

export const deleteClientAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const result = await deleteClient(tx, input.id);
    if (!result.ok) {
      return {
        kind: "failed",
        message:
          result.reason === "in_use"
            ? `این مشتری در ${result.usage.toLocaleString("fa-IR")} پروژه یا نظر استفاده شده است. ابتدا آن‌ها را عوض کنید.`
            : GONE,
      };
    }
    changed();
    return { kind: "ok", value: null };
  },
);

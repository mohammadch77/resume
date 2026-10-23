"use server";

import { revalidatePath } from "next/cache";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { updateLead } from "@/lib/admin/leads";
import { adminAction } from "@/lib/auth/admin-action";
import { uuidSchema } from "@/lib/validation/common";
import { leadUpdateSchema } from "@/lib/validation/lead";

export const updateLeadAction = adminAction(
  { roles: ["owner", "editor"], schema: leadUpdateSchema.extend({ id: uuidSchema }) },
  async ({ tx, user, input }): Promise<Outcome<null>> => {
    const { id, ...values } = input;
    const outcome = await guard(tx, (sp) => updateLead(sp, id, values, user.id));
    if (outcome.kind !== "ok") return outcome;
    if (!outcome.value) return { kind: "failed", message: "این درخواست دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید." };
    revalidatePath("/admin/leads");
    return { kind: "ok", value: null };
  },
);

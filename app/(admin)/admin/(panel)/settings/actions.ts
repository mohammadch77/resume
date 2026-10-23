"use server";

import { revalidatePath } from "next/cache";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { saveSettings } from "@/lib/admin/settings";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { versionSchema } from "@/lib/validation/common";
import { settingsFormSchema } from "@/lib/validation/settings";

/** Brand, hero copy, contact details and socials appear on every public page. */
export const saveSettingsAction = adminAction(
  { roles: ["owner", "editor"], schema: settingsFormSchema.extend({ version: versionSchema.optional() }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const { version, ...values } = input;
    const outcome = await guard(tx, (sp) => saveSettings(sp, version, values));
    if (outcome.kind !== "ok") return outcome;
    invalidateContent(CONTENT_TAGS.settings);
    revalidatePath("/admin/settings");
    return { kind: "ok", value: null };
  },
);

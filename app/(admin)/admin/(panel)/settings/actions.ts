"use server";

import { guard, type Outcome } from "@/lib/admin/outcome";
import { saveSettings } from "@/lib/admin/settings";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { versionSchema } from "@/lib/validation/common";
import { settingsFormSchema } from "@/lib/validation/settings";

/**
 * Brand, hero copy, contact details and socials appear on every public page. No revalidatePath for the admin page:
 * it would re-render the page the editor is on with the new version, and the form (keyed by version) would remount
 * and lose its "saved" message. The form tracks the new version itself.
 */
export const saveSettingsAction = adminAction(
  { roles: ["owner", "editor"], schema: settingsFormSchema.extend({ version: versionSchema.optional() }) },
  async ({ tx, input }): Promise<Outcome<{ version: number }>> => {
    const { version, ...values } = input;
    const outcome = await guard(tx, (sp) => saveSettings(sp, version, values));
    if (outcome.kind !== "ok") return outcome;
    invalidateContent(CONTENT_TAGS.settings);
    return { kind: "ok", value: { version: outcome.value } };
  },
);

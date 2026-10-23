"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { createTestimonial, deleteTestimonial, setTestimonialStatus, updateTestimonial } from "@/lib/admin/testimonials";
import { adminAction } from "@/lib/auth/admin-action";
import { CONTENT_TAGS } from "@/lib/content/cache";
import { invalidateContent } from "@/lib/content/invalidate";
import { uuidSchema, versionSchema } from "@/lib/validation/common";
import { testimonialFormSchema } from "@/lib/validation/testimonial";

const roles: ("owner" | "editor")[] = ["owner", "editor"];

function changed(): void {
  invalidateContent(CONTENT_TAGS.testimonials);
  revalidatePath("/admin/testimonials");
}

export const saveTestimonialAction = adminAction(
  { roles, schema: testimonialFormSchema.extend({ id: uuidSchema.optional(), version: versionSchema.optional() }) },
  async ({ tx, input }): Promise<Outcome<{ id: string }>> => {
    const { id, version, ...values } = input;
    const outcome = await guard(tx, async (sp) => {
      if (!id) return { id: await createTestimonial(sp, values) };
      if (version === undefined) throw new Error("version is required to update");
      await updateTestimonial(sp, id, version, values);
      return { id };
    });
    if (outcome.kind === "ok") changed();
    return outcome;
  },
);

export const setTestimonialStatusAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema, status: z.enum(["draft", "published", "archived"]) }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => setTestimonialStatus(sp, input.id, input.version, input.status));
    if (outcome.kind !== "ok") return outcome;
    changed();
    return { kind: "ok", value: null };
  },
);

export const deleteTestimonialAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema, version: versionSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => deleteTestimonial(sp, input.id, input.version));
    if (outcome.kind !== "ok") return outcome;
    if (!outcome.value.ok) return { kind: "failed", message: "ابتدا انتشار این نظر را لغو کنید، سپس حذفش کنید." };
    changed();
    return { kind: "ok", value: null };
  },
);

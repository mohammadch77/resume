"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guard, type Outcome } from "@/lib/admin/outcome";
import { createUser, resetPassword, setUserActive, unlockUser, updateUser } from "@/lib/admin/users";
import { adminAction } from "@/lib/auth/admin-action";
import { uuidSchema } from "@/lib/validation/common";
import { passwordResetSchema, userCreateSchema, userEditSchema } from "@/lib/validation/user";

const roles: ("owner" | "editor")[] = ["owner"];
const GONE = "این کاربر دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید.";
const done = (): Outcome<null> => {
  revalidatePath("/admin/users");
  return { kind: "ok", value: null };
};

export const createUserAction = adminAction(
  { roles, schema: userCreateSchema },
  async ({ tx, input }): Promise<Outcome<{ id: string }>> => {
    const outcome = await guard(tx, (sp) => createUser(sp, input));
    if (outcome.kind !== "ok") return outcome;
    revalidatePath("/admin/users");
    return { kind: "ok", value: { id: outcome.value } };
  },
);

/** An owner cannot change their own role: that is how the last owner would lock themselves out by mistake. */
export const updateUserAction = adminAction(
  { roles, schema: userEditSchema.extend({ id: uuidSchema }) },
  async ({ tx, user, input }): Promise<Outcome<null>> => {
    const { id, ...values } = input;
    if (id === user.id && values.role !== user.role) return { kind: "failed", message: "نقش خودتان را نمی‌توانید عوض کنید.", field: "role" };
    const outcome = await guard(tx, (sp) => updateUser(sp, id, values));
    if (outcome.kind !== "ok") return outcome;
    return outcome.value ? done() : { kind: "failed", message: GONE };
  },
);

export const setUserActiveAction = adminAction(
  { roles, schema: z.object({ userId: uuidSchema, active: z.boolean() }) },
  async ({ tx, user, input }): Promise<Outcome<null>> => {
    if (input.userId === user.id && !input.active) return { kind: "failed", message: "حساب خودتان را نمی‌توانید غیرفعال کنید." };
    const outcome = await guard(tx, (sp) => setUserActive(sp, input.userId, input.active));
    if (outcome.kind !== "ok") return outcome;
    return outcome.value ? done() : { kind: "failed", message: GONE };
  },
);

export const resetPasswordAction = adminAction(
  { roles, schema: passwordResetSchema.extend({ id: uuidSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => resetPassword(sp, input.id, input.password));
    if (outcome.kind !== "ok") return outcome;
    return outcome.value ? done() : { kind: "failed", message: GONE };
  },
);

export const unlockUserAction = adminAction(
  { roles, schema: z.object({ id: uuidSchema }) },
  async ({ tx, input }): Promise<Outcome<null>> => {
    const outcome = await guard(tx, (sp) => unlockUser(sp, input.id));
    if (outcome.kind !== "ok") return outcome;
    return outcome.value ? done() : { kind: "failed", message: GONE };
  },
);

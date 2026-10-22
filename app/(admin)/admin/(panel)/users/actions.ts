"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/auth/admin-action";
import { revokeAllForUser } from "@/lib/auth/session";
import { users } from "@/lib/db/schema";

export const setUserActiveAction = adminAction(
  { roles: ["owner"], schema: z.object({ userId: z.uuid(), active: z.boolean() }) },
  async ({ tx, user, input }) => {
    if (input.userId === user.id) throw new Error("self_deactivation");
    await tx.update(users).set({ isActive: input.active }).where(eq(users.id, input.userId));
    if (!input.active) await revokeAllForUser(tx, input.userId);
    revalidatePath("/admin/users");
  },
);

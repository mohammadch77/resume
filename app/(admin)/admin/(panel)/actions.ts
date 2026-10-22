"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { adminAction } from "@/lib/auth/admin-action";
import { clearedSessionCookie } from "@/lib/auth/cookie";
import { getSessionToken } from "@/lib/auth/current-user";
import { revokeSession } from "@/lib/auth/session";

export const logoutAction = adminAction({ roles: ["owner", "editor"], schema: z.object({}) }, async ({ tx }) => {
  const token = await getSessionToken();
  if (token) await revokeSession(tx, token);
  (await cookies()).set(clearedSessionCookie());
});

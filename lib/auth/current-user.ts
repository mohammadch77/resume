import { cache } from "react";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { SESSION_COOKIE } from "./config";
import { validateSession, type ValidSession } from "./session";

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in admin for this request (read-only; the proxy handles touch/rotate). */
export const getCurrentSession = cache(async (): Promise<ValidSession | null> => {
  const token = await getSessionToken();
  return token ? validateSession(getDb(), token) : null;
});

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { z, ZodType } from "zod";
import { getDb } from "@/lib/db/client";
import type { Tx } from "@/lib/db/with-actor";
import { runAdminAction, type ActionResult } from "./admin-action-core";
import { getCurrentSession } from "./current-user";
import { siteOrigin } from "./request";
import type { SessionUser } from "./session";

/**
 * Wraps a server action so it cannot run without Origin check, session, role and validated input,
 * and so every write is attributed in audit_log. Anonymous callers are sent to the login page,
 * wrong-role callers get a 404; other failures are returned for the form to display.
 */
export function adminAction<S extends ZodType, T>(
  opts: { roles: SessionUser["role"][]; schema: S },
  handler: (args: { tx: Tx; user: SessionUser; input: z.output<S> }) => Promise<T>,
) {
  return async (input: unknown): Promise<ActionResult<T>> => {
    const h = await headers();
    const session = await getCurrentSession();
    const result = await runAdminAction(
      { db: getDb(), user: session?.user ?? null, origin: h.get("origin"), siteOrigin: siteOrigin(), requestId: randomUUID() },
      opts,
      input,
      handler,
    );
    if (!result.ok && result.code === "unauthenticated") redirect("/admin/login");
    if (!result.ok && result.code === "forbidden") notFound();
    return result;
  };
}
